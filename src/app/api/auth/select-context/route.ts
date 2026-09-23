import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";
import { setRefreshCookie } from "@/lib/auth/session-cookie";
import { unwrapSessionPayload } from "@/lib/auth/unwrap-session";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await backendFetch("/auth/select-context", { method: "POST", body: JSON.stringify(body) });
  const data = unwrapSessionPayload(await response.json().catch(() => ({})));
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  const result = NextResponse.json({
    accessToken: data.accessToken,
    mustChangePassword: data.mustChangePassword,
    user: data.user,
    activeContext: data.activeContext
  });
  if (typeof data.refreshToken === "string" && data.refreshToken) {
    setRefreshCookie(result, data.refreshToken);
  }
  return result;
}
