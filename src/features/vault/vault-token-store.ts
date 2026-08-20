import type { VaultScope } from "@/types/vault";

type VaultSession = { token: string; expiresAt: number };

const sessions: Partial<Record<VaultScope, VaultSession>> = {};
let lastActivity = 0;
const IDLE_MS = 10 * 60_000;

function expired(session: VaultSession | undefined) {
  return !session || session.expiresAt <= Date.now();
}

function idleLocked() {
  return lastActivity > 0 && Date.now() - lastActivity > IDLE_MS;
}

export function setVaultToken(scope: VaultScope, token: string, expiresInSeconds: number) {
  sessions[scope] = { token, expiresAt: Date.now() + expiresInSeconds * 1000 };
  lastActivity = Date.now();
}

export function getVaultToken(scope: VaultScope, touch = true) {
  if (idleLocked()) {
    clearAllVaultTokens();
    return null;
  }
  const session = sessions[scope];
  if (expired(session)) {
    delete sessions[scope];
    return null;
  }
  if (touch) lastActivity = Date.now();
  return session!.token;
}

export function hasVaultToken(scope: VaultScope) {
  return Boolean(getVaultToken(scope, false));
}

export function clearVaultToken(scope: VaultScope) {
  delete sessions[scope];
}

export function clearAllVaultTokens() {
  (Object.keys(sessions) as VaultScope[]).forEach((key) => delete sessions[key]);
  lastActivity = 0;
}
