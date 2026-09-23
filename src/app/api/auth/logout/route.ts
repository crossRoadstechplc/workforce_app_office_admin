import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
import { clearRefreshCookie, REFRESH_COOKIE } from "@/lib/auth/session-cookie";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const { accessToken } = await request.json().catch(() => ({ accessToken: null }));
  if (refreshToken && accessToken) {
    await backendFetch("/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ refreshToken })
    }).catch(() => null);
  }
  const out = NextResponse.json({ ok: true });
  clearRefreshCookie(out);
  return out;
}
