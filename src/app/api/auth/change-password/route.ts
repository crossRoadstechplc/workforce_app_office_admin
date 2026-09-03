import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

export async function POST(request: Request) {
  const body = await request.json();
  const authorization = request.headers.get("authorization") ?? "";

  const response = await backendFetch("/auth/change-password", {
    method: "POST",
    headers: { authorization },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json(data, { status: response.status });

  const result = NextResponse.json({
    accessToken: data.accessToken,
    mustChangePassword: data.mustChangePassword,
    user: data.user,
    activeContext: data.activeContext
  });
  result.cookies.set("workforce_refresh", data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return result;
}
