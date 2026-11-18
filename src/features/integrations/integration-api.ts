import { apiFetch } from "@/lib/api/api-client";
import type {
  ApiIntegrationList,
  IntegrationInput,
  IntegrationSecrets,
  WebhookDelivery,
  WebhookDeliveryList
} from "@/types/integrations";

const d = <T>(v: unknown): T => ((v as { data?: T })?.data ?? v) as T;
const post = (path: string, body: unknown = {}) => apiFetch<unknown>(path, { method: "POST", body: JSON.stringify(body) });

/** Public base URL the external app should call (same API the portal talks to). */
export const integrationApiBaseUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}/integrations/meetings`;

export const integrationApi = {
  list: async () => d<ApiIntegrationList>(await apiFetch<unknown>("/admin/integrations")),
  create: async (input: IntegrationInput) => d<IntegrationSecrets>(await post("/admin/integrations", input)),
  update: async (id: string, input: Partial<IntegrationInput> & { isActive?: boolean }) =>
    d<IntegrationSecrets>(
      await apiFetch<unknown>(`/admin/integrations/${id}`, { method: "PATCH", body: JSON.stringify(input) })
    ),
  rotateKey: async (id: string) => d<IntegrationSecrets>(await post(`/admin/integrations/${id}/rotate-key`)),
  rotateWebhookSecret: async (id: string) =>
    d<IntegrationSecrets>(await post(`/admin/integrations/${id}/rotate-webhook-secret`)),
  revoke: async (id: string) => d<IntegrationSecrets>(await post(`/admin/integrations/${id}/revoke`)),
  testWebhook: async (id: string) => d<WebhookDelivery>(await post(`/admin/integrations/${id}/test-webhook`)),
  deliveries: async (id: string, page = 1) =>
    d<WebhookDeliveryList>(await apiFetch<unknown>(`/admin/integrations/${id}/deliveries?page=${page}&pageSize=20`)),
  retryDelivery: async (deliveryId: string) =>
    d<WebhookDelivery>(await post(`/admin/integrations/deliveries/${deliveryId}/retry`))
};
