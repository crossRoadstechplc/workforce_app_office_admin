import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/backend";

function sessionResponse(data: Record<string, unknown>) {
  // Support both a top-level payload and a nested `{ data: ... }` envelope.
  const payload =
    data.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : data;

  if (
    payload.requiresContextSelection === true ||
    (typeof payload.preAuthToken === "string" && Array.isArray(payload.contexts) && !payload.accessToken)
  ) {
    return NextResponse.json({
      requiresContextSelection: true,
      preAuthToken: payload.preAuthToken,
      contexts: payload.contexts,
      defaultContextKey: payload.defaultContextKey ?? null
    });
  }

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
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
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
