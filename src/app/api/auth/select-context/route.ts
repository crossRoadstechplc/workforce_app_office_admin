import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

function sessionResponse(data: {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
  user?: unknown;
  activeContext?: unknown;
}) {
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

export async function POST(request: Request) {
  const body = await request.json();
  const response = await backendFetch("/auth/select-context", { method: "POST", body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  return sessionResponse(data);
}
