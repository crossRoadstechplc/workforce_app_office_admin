"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/api-client";
import { setAccessToken, getAccessToken } from "@/lib/auth/token-store";
import { refreshSession } from "@/lib/auth/refresh-session";
import {
  filterPortalContexts,
  hasPortalContext,
  isOfficeAdmin,
  isPortalAdmin,
  isSuperAdmin,
  LAST_CONTEXT_STORAGE_KEY,
  type AuthUser,
  type LoginContext,
  type LoginResponse,
  type MeResponse
} from "@/types/auth";
import { homePathForRoles } from "@/features/navigation/role-nav";
import { unwrapSessionPayload } from "@/lib/auth/unwrap-session";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "mustChangePassword" | "selectContext";

type PendingContextSelection = {
  preAuthToken: string;
  contexts: LoginContext[];
  defaultContextKey: string | null;
};

type State = {
  status: AuthStatus;
  user: AuthUser | null;
  portalContexts: LoginContext[];
  pendingContext: PendingContextSelection | null;
  contextSwitching: boolean;
  login: (login: string, password: string) => Promise<void>;
  selectContext: (contextKey: string) => Promise<void>;
  switchContext: (contextKey: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  cancelContextSelection: () => void;
  hasPermission: (p: string) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  isOfficeAdmin: boolean;
};

const Ctx = createContext<State | null>(null);

function readLastContextKey() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_CONTEXT_STORAGE_KEY);
}

function writeLastContextKey(contextKey: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_CONTEXT_STORAGE_KEY, contextKey);
}

function isContextSelectionPayload(data: Record<string, unknown>) {
  if (data.requiresContextSelection === true) return true;
  // Resilient fallback: pre-auth + contexts means picker, even if the flag is missing.
  return typeof data.preAuthToken === "string" && Array.isArray(data.contexts) && !data.accessToken;
}

function userFromSession(session: {
  user?: AuthUser | null;
  mustChangePassword?: boolean;
  activeContext?: AuthUser["activeContext"];
}): AuthUser {
  if (!session.user || typeof session.user !== "object") {
    throw new Error("Login response is missing user");
  }
  return {
    ...session.user,
    roles: Array.isArray(session.user.roles) ? session.user.roles : [],
    mustChangePassword: session.mustChangePassword ?? session.user.mustChangePassword,
    activeContext: session.activeContext ?? session.user.activeContext
  };
}

function apiErrorMessage(data: Record<string, unknown>, fallback: string) {
  const error = data.error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [portalContexts, setPortalContexts] = useState<LoginContext[]>([]);
  const [pendingContext, setPendingContext] = useState<PendingContextSelection | null>(null);
  const [contextSwitching, setContextSwitching] = useState(false);
  const router = useRouter();
  // Tracks whether a session has already been established (via login or a
  // prior hydrate) so a late-resolving, now-stale hydrate() call can never
  // downgrade a session that's already authenticated.
  const sessionEstablishedRef = useRef(false);

  const loadPortalContexts = useCallback(async () => {
    try {
      const result = await apiFetch<{ contexts: LoginContext[] }>("/auth/contexts");
      const filtered = filterPortalContexts(result?.contexts ?? []);
      setPortalContexts(filtered);
      return filtered;
    } catch {
      setPortalContexts([]);
      return [] as LoginContext[];
    }
  }, []);

  const completeAuthenticatedSession = useCallback(
    async (accessToken: string, activeContextKey?: string | null) => {
      if (!accessToken) throw new Error("Login failed. Missing access token.");
      setAccessToken(accessToken);
      const me = await apiFetch<MeResponse>("/auth/me");
      if (!me || !Array.isArray(me.roles)) {
        throw new Error("Could not load your account after login. Please try again.");
      }
      if (!isPortalAdmin(me.roles)) throw new Error("Admin access required");
      setUser(me);
      const contextKey = activeContextKey ?? me.activeContext?.key;
      if (contextKey) writeLastContextKey(contextKey);
      await loadPortalContexts();
      setPendingContext(null);
      setStatus("authenticated");
      sessionEstablishedRef.current = true;
      return me;
    },
    [loadPortalContexts]
  );

  const hydrate = useCallback(async () => {
    try {
      const session = await refreshSession();
      if (!session) throw new Error();
      const sessionUser = userFromSession(session as { user?: AuthUser; mustChangePassword?: boolean; activeContext?: AuthUser["activeContext"] });
      if (!isPortalAdmin(sessionUser.roles)) throw new Error("Admin access required");

      const accessToken = session.accessToken as string | undefined;
      if (!accessToken) throw new Error();
      setAccessToken(accessToken);
      if (session.mustChangePassword || sessionUser.mustChangePassword) {
        setUser(sessionUser);
        setStatus("mustChangePassword");
        sessionEstablishedRef.current = true;
        return;
      }

      await completeAuthenticatedSession(
        accessToken,
        (session.activeContext as AuthUser["activeContext"] | undefined)?.key ?? sessionUser.activeContext?.key
      );
    } catch {
      // A login (or an earlier hydrate) may have already established a real
      // session while this call was in flight - never stomp on that.
      if (sessionEstablishedRef.current) return;
      setAccessToken(null);
      setUser(null);
      setPortalContexts([]);
      setStatus("unauthenticated");
    }
  }, [completeAuthenticatedSession]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const finalizeLoginResponse = async (raw: unknown): Promise<MeResponse | null> => {
    const data = unwrapSessionPayload(raw);

    if (isContextSelectionPayload(data)) {
      const allContexts = Array.isArray(data.contexts) ? (data.contexts as LoginContext[]) : [];
      const contexts = filterPortalContexts(allContexts);
      if (!hasPortalContext(allContexts)) {
        throw new Error("Admin access required. Use the employee app if you only have an employee role.");
      }
      const preAuthToken = data.preAuthToken as string | undefined;
      if (!preAuthToken) throw new Error("Login session expired. Please sign in again.");

      const defaultContextKey =
        contexts.find((item) => item.key === data.defaultContextKey)?.key ??
        contexts.find((item) => item.key === readLastContextKey())?.key ??
        contexts[0]?.key ??
        null;

      if (contexts.length === 1 && contexts[0]) {
        return selectContextWithToken(contexts[0].key, preAuthToken);
      }

      setPendingContext({
        preAuthToken,
        contexts,
        defaultContextKey
      });
      setStatus("selectContext");
      return null;
    }

    const sessionUserRaw = data.user as AuthUser | undefined;
    if (!sessionUserRaw || !Array.isArray(sessionUserRaw.roles)) {
      throw new Error(apiErrorMessage(data, "Login failed. Please try again."));
    }
    if (!isPortalAdmin(sessionUserRaw.roles)) throw new Error("Admin access required");

    const accessToken = data.accessToken as string | undefined;
    if (!accessToken) throw new Error("Login failed. Missing access token.");

    const sessionUser = userFromSession({
      user: sessionUserRaw,
      mustChangePassword: Boolean(data.mustChangePassword),
      activeContext: data.activeContext as AuthUser["activeContext"] | undefined
    });

    setAccessToken(accessToken);
    if (data.mustChangePassword || sessionUser.mustChangePassword) {
      setUser(sessionUser);
      setStatus("mustChangePassword");
      router.replace("/change-password");
      return null;
    }

    const me = await completeAuthenticatedSession(
      accessToken,
      (data.activeContext as AuthUser["activeContext"] | undefined)?.key ?? sessionUser.activeContext?.key
    );
    router.replace(homePathForRoles(me?.roles));
    return me;
  };

  const selectContextWithToken = async (contextKey: string, preAuthToken: string): Promise<MeResponse | null> => {
    const r = await fetch("/api/auth/select-context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contextKey, preAuthToken, deviceId: "admin-web" })
    });
    const data = unwrapSessionPayload(await r.json());
    if (!r.ok) throw new Error(apiErrorMessage(data, "Context selection failed"));
    return finalizeLoginResponse(data);
  };

  const login = async (loginValue: string, password: string) => {
    const lastContextKey = readLastContextKey();
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        login: loginValue,
        password,
        deviceId: "admin-web",
        ...(lastContextKey ? { lastContextKey } : {})
      })
    });
    const data = unwrapSessionPayload(await r.json());
    if (!r.ok) throw new Error(apiErrorMessage(data, "Login failed"));
    await finalizeLoginResponse(data as LoginResponse);
  };

  const selectContext = async (contextKey: string) => {
    if (!pendingContext) throw new Error("No pending context selection");
    await selectContextWithToken(contextKey, pendingContext.preAuthToken);
  };

  const switchContext = async (contextKey: string) => {
    if (contextKey === user?.activeContext?.key) return;
    setContextSwitching(true);
    try {
      const token = getAccessToken();
      if (!token) throw new Error("Authentication required. Please sign in again.");
      const r = await fetch("/api/auth/switch-context", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ contextKey, deviceId: "admin-web" })
      });
      const data = unwrapSessionPayload(await r.json());
      if (!r.ok) throw new Error(apiErrorMessage(data, "Failed to switch context"));
      const accessToken = data.accessToken as string | undefined;
      if (!accessToken) throw new Error("Failed to switch context");
      const me = await completeAuthenticatedSession(accessToken, contextKey);
      router.replace(homePathForRoles(me?.roles));
    } finally {
      setContextSwitching(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = getAccessToken();
    const r = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = unwrapSessionPayload(await r.json());
    if (!r.ok) throw new Error(apiErrorMessage(data, "Password change failed"));

    const accessToken = data.accessToken as string | undefined;
    if (!accessToken) throw new Error("Password changed, but session could not be refreshed. Please sign in again.");
    const me = await completeAuthenticatedSession(accessToken, user?.activeContext?.key);
    router.replace(homePathForRoles(me?.roles));
  };

  const cancelContextSelection = () => {
    setPendingContext(null);
    setStatus("unauthenticated");
  };

  const logout = async () => {
    const token = getAccessToken();
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken: token })
    });
    setAccessToken(null);
    setUser(null);
    setPortalContexts([]);
    setPendingContext(null);
    setStatus("unauthenticated");
    router.replace("/login");
  };

  const value = useMemo(
    () => ({
      status,
      user,
      portalContexts,
      pendingContext,
      contextSwitching,
      login,
      selectContext,
      switchContext,
      changePassword,
      logout,
      cancelContextSelection,
      hasPermission: (p: string) => !!user?.permissions?.includes(p),
      hasRole: (role: string) => !!user?.roles?.includes(role),
      isSuperAdmin: isSuperAdmin(user?.roles),
      isOfficeAdmin: isOfficeAdmin(user?.roles)
    }),
    [status, user, portalContexts, pendingContext, contextSwitching]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
