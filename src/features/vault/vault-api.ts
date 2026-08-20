import { apiFetch, ApiError } from "@/lib/api/api-client";
import { clearVaultToken, getVaultToken, setVaultToken } from "@/features/vault/vault-token-store";
import type {
  OfficeSubscription,
  Paged,
  SubscriptionInput,
  SubscriptionPeriod,
  SubscriptionSummary,
  VaultCredential,
  VaultCredentialInput,
  VaultScope,
  VaultUnlockResult
} from "@/types/vault";

const unwrap = <T>(v: unknown): T => ((v as { data?: T })?.data ?? v) as T;

function itemsOf<T>(value: Paged<T> | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : value.items ?? [];
}

async function vaultFetch<T>(scope: VaultScope, path: string, init: RequestInit = {}): Promise<T> {
  const vaultToken = getVaultToken(scope);
  try {
    return await apiFetch<T>(path, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(vaultToken ? { "X-Vault-Token": vaultToken } : {})
      }
    });
  } catch (error) {
    if (error instanceof ApiError && (error.code === "VAULT_TOKEN_EXPIRED" || error.code === "VAULT_TOKEN_REQUIRED" || error.status === 401)) {
      clearVaultToken(scope);
    }
    throw error;
  }
}

export const vaultApi = {
  unlock: async (pin: string, scope: VaultScope) => {
    const data = unwrap<VaultUnlockResult>(await apiFetch("/admin/vault/unlock", { method: "POST", body: JSON.stringify({ pin, scope }) }));
    setVaultToken(scope, data.vaultToken, data.expiresIn);
    return data;
  },
  credentials: async () => itemsOf(unwrap<Paged<VaultCredential> | VaultCredential[]>(await vaultFetch("credentials", "/admin/vault/credentials?page=1&pageSize=100"))),
  createCredential: async (input: VaultCredentialInput) =>
    unwrap<VaultCredential>(await vaultFetch("credentials", "/admin/vault/credentials", { method: "POST", body: JSON.stringify(input) })),
  updateCredential: async (id: string, input: Partial<VaultCredentialInput>) =>
    unwrap<VaultCredential>(await vaultFetch("credentials", `/admin/vault/credentials/${id}`, { method: "PATCH", body: JSON.stringify(input) })),
  deleteCredential: async (id: string) => vaultFetch<void>("credentials", `/admin/vault/credentials/${id}`, { method: "DELETE" }),
  revealCredential: async (id: string) => unwrap<{ id: string; secret: string }>(await vaultFetch("reveal", `/admin/vault/credentials/${id}/reveal`, { method: "POST" })),
  subscriptions: async () => itemsOf(unwrap<Paged<OfficeSubscription> | OfficeSubscription[]>(await vaultFetch("subscriptions", "/admin/vault/subscriptions?page=1&pageSize=100"))),
  summary: async () => unwrap<SubscriptionSummary>(await vaultFetch("subscriptions", "/admin/vault/subscriptions/summary")),
  createSubscription: async (input: SubscriptionInput) =>
    unwrap<OfficeSubscription>(await vaultFetch("subscriptions", "/admin/vault/subscriptions", { method: "POST", body: JSON.stringify(input) })),
  updateSubscription: async (id: string, input: Partial<SubscriptionInput>) =>
    unwrap<OfficeSubscription>(await vaultFetch("subscriptions", `/admin/vault/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(input) })),
  deleteSubscription: async (id: string) => vaultFetch<void>("subscriptions", `/admin/vault/subscriptions/${id}`, { method: "DELETE" }),
  upsertPeriod: async (id: string, yearMonth: string, input: { seats?: number; amount?: number; paid?: boolean; notes?: string | null }) =>
    unwrap<SubscriptionPeriod>(
      await vaultFetch("subscriptions", `/admin/vault/subscriptions/${id}/periods/${yearMonth}`, { method: "PUT", body: JSON.stringify(input) })
    )
};
