import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "@/lib/auth/session-cookie";
import { unwrapSessionPayload } from "@/lib/auth/unwrap-session";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return NextResponse.json({ code:"NO_SESSION", message:"No active session" }, { status:401 });
  const response = await backendFetch("/auth/refresh", { method:"POST", body:JSON.stringify({refreshToken, deviceId:"admin-web"}) });
  const data = unwrapSessionPayload(await response.json().catch(()=>({})));
  if (!response.ok) {
    const out = NextResponse.json(data, { status: response.status });
    clearRefreshCookie(out);
    return out;
  }
  const out = NextResponse.json({
    accessToken: data.accessToken,
    mustChangePassword: data.mustChangePassword,
    user: data.user,
    activeContext: data.activeContext
  });
  if (typeof data.refreshToken === "string" && data.refreshToken) {
    setRefreshCookie(out, data.refreshToken);
  }
  return out;
}
