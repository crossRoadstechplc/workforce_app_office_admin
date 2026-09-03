"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/api-client";
import { setAccessToken, getAccessToken } from "@/lib/auth/token-store";
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

function userFromSession(session: {
  user?: AuthUser | null;
  mustChangePassword?: boolean;
  activeContext?: AuthUser["activeContext"];
}): AuthUser {
  if (!session.user) {
    throw new Error("Login response is missing user");
  }
  return {
    ...session.user,
    mustChangePassword: session.mustChangePassword ?? session.user.mustChangePassword,
    activeContext: session.activeContext ?? session.user.activeContext
  };
}

function isContextSelectionResponse(
  data: LoginResponse
): data is Extract<LoginResponse, { requiresContextSelection: true }> {
  return Boolean(
    data &&
      typeof data === "object" &&
      "requiresContextSelection" in data &&
      (data as { requiresContextSelection?: boolean }).requiresContextSelection === true
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [portalContexts, setPortalContexts] = useState<LoginContext[]>([]);
  const [pendingContext, setPendingContext] = useState<PendingContextSelection | null>(null);
  const [contextSwitching, setContextSwitching] = useState(false);
  const router = useRouter();

  const loadPortalContexts = useCallback(async () => {
    const result = await apiFetch<{ contexts: LoginContext[] }>("/auth/contexts");
    const filtered = filterPortalContexts(result.contexts);
    setPortalContexts(filtered);
    return filtered;
  }, []);

  const completeAuthenticatedSession = useCallback(
    async (accessToken: string, activeContextKey?: string | null) => {
      setAccessToken(accessToken);
      const me = await apiFetch<MeResponse>("/auth/me");
      if (!isPortalAdmin(me.roles)) throw new Error("Admin access required");
      setUser(me);
      if (activeContextKey ?? me.activeContext?.key) {
        writeLastContextKey(activeContextKey ?? me.activeContext!.key);
      }
      await loadPortalContexts();
      setPendingContext(null);
      setStatus("authenticated");
      return me;
    },
    [loadPortalContexts]
  );

  const hydrate = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/refresh", { method: "POST", signal: AbortSignal.timeout(12_000) });
      if (!r.ok) throw new Error();
      const session = await r.json();
      const sessionUser = userFromSession(session);
      if (!isPortalAdmin(sessionUser.roles)) throw new Error("Admin access required");

      setAccessToken(session.accessToken);
      if (session.mustChangePassword) {
        setUser(sessionUser);
        setStatus("mustChangePassword");
        return;
      }

      await completeAuthenticatedSession(session.accessToken, session.activeContext?.key ?? sessionUser.activeContext?.key);
    } catch {
      setAccessToken(null);
      setUser(null);
      setPortalContexts([]);
      setStatus("unauthenticated");
    }
  }, [completeAuthenticatedSession]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const finalizeLoginResponse = async (data: LoginResponse): Promise<MeResponse | null> => {
    if (isContextSelectionResponse(data)) {
      const contexts = filterPortalContexts(data.contexts ?? []);
      if (!hasPortalContext(data.contexts ?? [])) throw new Error("Admin access required");
      if (!data.preAuthToken) throw new Error("Login session expired. Please sign in again.");
      const defaultContextKey =
        contexts.find((item) => item.key === data.defaultContextKey)?.key ??
        contexts.find((item) => item.key === readLastContextKey())?.key ??
        contexts[0]?.key ??
        null;

      if (contexts.length === 1 && contexts[0]) {
        return selectContextWithToken(contexts[0].key, data.preAuthToken);
      }

      setPendingContext({
        preAuthToken: data.preAuthToken,
        contexts,
        defaultContextKey
      });
      setStatus("selectContext");
      return null;
    }

    if (!data.user?.roles) {
      throw new Error("Login failed. Please try again.");
    }
    if (!isPortalAdmin(data.user.roles)) throw new Error("Admin access required");
    if (!data.accessToken) throw new Error("Login failed. Please try again.");

    setAccessToken(data.accessToken);
    const sessionUser = userFromSession(data);
    if (data.mustChangePassword) {
      setUser(sessionUser);
      setStatus("mustChangePassword");
      router.replace("/change-password");
      return null;
    }

    const me = await completeAuthenticatedSession(data.accessToken, data.activeContext?.key ?? sessionUser.activeContext?.key);
    router.replace(homePathForRoles(me.roles));
    return me;
  };

  const selectContextWithToken = async (contextKey: string, preAuthToken: string): Promise<MeResponse | null> => {
    const r = await fetch("/api/auth/select-context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contextKey, preAuthToken, deviceId: "admin-web" })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message ?? data.error?.message ?? "Context selection failed");
    return finalizeLoginResponse(data as LoginResponse);
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
    const data = (await r.json()) as LoginResponse & { message?: string; error?: { message?: string } };
    if (!r.ok) throw new Error(data.message ?? data.error?.message ?? "Login failed");
    await finalizeLoginResponse(data);
  };

  const selectContext = async (contextKey: string) => {
    if (!pendingContext) throw new Error("No pending context selection");
    await selectContextWithToken(contextKey, pendingContext.preAuthToken);
  };

  const switchContext = async (contextKey: string) => {
    if (contextKey === user?.activeContext?.key) return;
    setContextSwitching(true);
    try {
      const r = await fetch("/api/auth/switch-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contextKey, deviceId: "admin-web" })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? data.error?.message ?? "Failed to switch context");
      const me = await completeAuthenticatedSession(data.accessToken, contextKey);
      router.replace(homePathForRoles(me.roles));
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
    const data = await r.json();
    if (!r.ok) throw new Error(data.message ?? data.error?.message ?? "Password change failed");

    const me = await completeAuthenticatedSession(data.accessToken, user?.activeContext?.key);
    router.replace(homePathForRoles(me.roles));
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
