import { setAccessToken } from "@/lib/auth/token-store";
import { unwrapSessionPayload } from "@/lib/auth/unwrap-session";

export type RefreshedSession = Record<string, unknown> & { accessToken?: string };

/**
 * Single-flight call to /api/auth/refresh. The backend rotates the refresh
 * token on every call, so firing two concurrent refreshes (e.g. one from the
 * initial hydrate and one from a 401 retry) makes the second one fail and
 * can wipe an otherwise-valid session. Sharing one in-flight promise avoids
 * that race.
 */
let inFlight: Promise<RefreshedSession | null> | null = null;

export async function refreshSession(): Promise<RefreshedSession | null> {
  if (!inFlight) {
    inFlight = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        const payload = unwrapSessionPayload(await r.json().catch(() => ({})));
        const token = payload.accessToken;
        if (typeof token !== "string" || !token) return null;
        setAccessToken(token);
        return payload as RefreshedSession;
      })
      .catch(() => null)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
