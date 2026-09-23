export function unwrapSessionPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    const nested = obj.data as Record<string, unknown>;
    if (
      nested.accessToken ||
      nested.requiresContextSelection ||
      nested.preAuthToken ||
      nested.user ||
      nested.contexts ||
      nested.refreshToken
    ) {
      return nested;
    }
  }
  return obj;
}
