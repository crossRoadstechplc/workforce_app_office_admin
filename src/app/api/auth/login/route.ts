import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

function sessionResponse(data: {
  accessToken?: string;
  refreshToken?: string;
  mustChangePassword?: boolean;
  user?: unknown;
  activeContext?: unknown;
  requiresContextSelection?: boolean;
  preAuthToken?: string;
  contexts?: unknown;
  defaultContextKey?: string | null;
}) {
  if (data.requiresContextSelection) {
    return NextResponse.json({
      requiresContextSelection: true,
      preAuthToken: data.preAuthToken,
      contexts: data.contexts,
      defaultContextKey: data.defaultContextKey
    });
  }

  const result = NextResponse.json({
    accessToken: data.accessToken,
    mustChangePassword: data.mustChangePassword,
    user: data.user,
    activeContext: data.activeContext
  });

  if (data.refreshToken) {
    result.cookies.set("workforce_refresh", data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Never forward null optional fields — Zod optional rejects null.
    const payload: Record<string, unknown> = {
      login: body.login,
      password: body.password,
      deviceId: body.deviceId ?? "admin-web"
    };
    if (typeof body.organizationSlug === "string" && body.organizationSlug.trim()) {
      payload.organizationSlug = body.organizationSlug.trim();
    }
    if (typeof body.contextKey === "string" && body.contextKey.trim()) {
      payload.contextKey = body.contextKey.trim();
    }
    if (typeof body.lastContextKey === "string" && body.lastContextKey.trim()) {
      payload.lastContextKey = body.lastContextKey.trim();
    }

    const response = await backendFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    return sessionResponse(data);
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: {
          code: aborted ? "BACKEND_TIMEOUT" : "BACKEND_UNREACHABLE",
          message: aborted
            ? "Login timed out talking to the API. Check BACKEND_API_BASE_URL and backend health."
            : "Login could not reach the API. Check BACKEND_API_BASE_URL on the portal host."
        }
      },
      { status: 502 }
    );
  }
}
