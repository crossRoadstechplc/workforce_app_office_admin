import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

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
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) return NextResponse.json(data, { status: response.status });

  const payload =
    data.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data;

  const result = NextResponse.json({
    accessToken: payload.accessToken,
    mustChangePassword: payload.mustChangePassword,
    user: payload.user,
    activeContext: payload.activeContext
  });
  if (typeof payload.refreshToken === "string" && payload.refreshToken) {
    result.cookies.set("workforce_refresh", payload.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return result;
}
