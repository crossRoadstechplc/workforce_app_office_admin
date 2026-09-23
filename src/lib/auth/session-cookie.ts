import { NextResponse } from "next/server";

export const REFRESH_COOKIE = "workforce_refresh";

/** Set SESSION_COOKIE_SECURE=true in production when the portal is served over HTTPS. */
export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

export function setRefreshCookie(response: NextResponse, refreshToken: string) {
  response.cookies.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.delete(REFRESH_COOKIE);
}
