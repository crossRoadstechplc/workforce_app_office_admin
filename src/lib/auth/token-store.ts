let accessToken: string | null = null;
type TokenListener = (token: string | null) => void;
const listeners = new Set<TokenListener>();

export function setAccessToken(value: string | null) {
  accessToken = value;
  for (const listener of listeners) listener(value);
}

export function getAccessToken() {
  return accessToken;
}

/** Subscribe to access-token changes (e.g. after refresh) so realtime can re-auth. */
export function onAccessTokenChange(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
