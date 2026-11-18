export type IntegrationStatus = "ACTIVE" | "PAUSED" | "REVOKED";
export type WebhookDeliveryStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export type ApiIntegration = {
  id: string;
  name: string;
  keyPrefix: string;
  keyPreview: string;
  status: IntegrationStatus;
  isActive: boolean;
  revokedAt: string | null;
  lastUsedAt: string | null;
  allOffices: boolean;
  officeIds: string[];
  offices: Array<{ id: string; name: string }>;
  webhookUrl: string | null;
  hasWebhookSecret: boolean;
  lastDelivery: { id: string; event: string; status: WebhookDeliveryStatus; lastStatusCode: number | null; createdAt: string } | null;
  failedDeliveries: number;
  bookingCount: number;
  createdAt: string;
  updatedAt: string;
  createdByEmail: string;
};

export type ApiIntegrationList = { items: ApiIntegration[] };

/** Secrets are only returned by create / rotate calls, once. */
export type IntegrationSecrets = {
  integration: ApiIntegration;
  apiKey?: string;
  webhookSecret?: string | null;
};

export type WebhookDelivery = {
  id: string;
  event: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  nextAttemptAt: string;
  deliveredAt: string | null;
  createdAt: string;
  payload: { data?: { id?: string; title?: string; externalId?: string | null } } | null;
};

export type WebhookDeliveryList = {
  items: WebhookDelivery[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export type IntegrationInput = {
  name: string;
  officeIds: string[];
  webhookUrl: string | null;
};
