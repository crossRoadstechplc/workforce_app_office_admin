import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
import { setRefreshCookie } from "@/lib/auth/session-cookie";
import { unwrapSessionPayload } from "@/lib/auth/unwrap-session";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const refreshToken = request.cookies.get("workforce_refresh")?.value;
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: { code: "AUTH_REQUIRED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  const response = await backendFetch("/auth/switch-context", {
    method: "POST",
    headers: { authorization },
    body: JSON.stringify({ ...body, refreshToken, deviceId: "admin-web" })
  });
  const payload = unwrapSessionPayload(await response.json().catch(() => ({})));
  if (!response.ok) return NextResponse.json(payload, { status: response.status });

  const result = NextResponse.json({
    accessToken: payload.accessToken,
    mustChangePassword: payload.mustChangePassword,
    user: payload.user,
    activeContext: payload.activeContext
  });
  if (typeof payload.refreshToken === "string" && payload.refreshToken) {
    setRefreshCookie(result, payload.refreshToken);
  }
  return result;
}
