"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/api-client";
import { setAccessToken, getAccessToken } from "@/lib/auth/token-store";
import { isOfficeAdmin, isPortalAdmin, isSuperAdmin, type AuthUser, type MeResponse } from "@/types/auth";
import { homePathForRoles } from "@/features/navigation/role-nav";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "mustChangePassword";

type State = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (login: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (p: string) => boolean;
  hasRole: (role: string) => boolean;
  isSuperAdmin: boolean;
  isOfficeAdmin: boolean;
};

const Ctx = createContext<State | null>(null);

function userFromSession(session: { user: AuthUser; mustChangePassword?: boolean }): AuthUser {
  return {
    ...session.user,
    mustChangePassword: session.mustChangePassword ?? session.user.mustChangePassword
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  const completeAuthenticatedSession = useCallback(async (accessToken: string) => {
    setAccessToken(accessToken);
    const me = await apiFetch<MeResponse>("/auth/me");
    if (!isPortalAdmin(me.roles)) throw new Error("Admin access required");
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const hydrate = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/refresh", { method: "POST" });
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

      await completeAuthenticatedSession(session.accessToken);
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [completeAuthenticatedSession]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const login = async (loginValue: string, password: string) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ login: loginValue, password, deviceId: "admin-web" })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message ?? "Login failed");
    if (!isPortalAdmin(data.user.roles)) throw new Error("Admin access required");

    setAccessToken(data.accessToken);
    const sessionUser = userFromSession(data);

    if (data.mustChangePassword) {
      setUser(sessionUser);
      setStatus("mustChangePassword");
      router.replace("/change-password");
      return;
    }

    const me = await completeAuthenticatedSession(data.accessToken);
    router.replace(homePathForRoles(me.roles));
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

    const me = await completeAuthenticatedSession(data.accessToken);
    router.replace(homePathForRoles(me.roles));
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
    setStatus("unauthenticated");
    router.replace("/login");
  };

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      changePassword,
      logout,
      hasPermission: (p: string) => !!user?.permissions?.includes(p),
      hasRole: (role: string) => !!user?.roles?.includes(role),
      isSuperAdmin: isSuperAdmin(user?.roles),
      isOfficeAdmin: isOfficeAdmin(user?.roles)
    }),
    [status, user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
