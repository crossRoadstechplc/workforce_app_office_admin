import type { LucideIcon } from "lucide-react";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type DocField = {
  name: string;
  type: string;
  required?: boolean;
  description: string;
};

export type DocResponse = {
  status: number;
  label: string;
  example?: unknown;
  note?: string;
};

export type DocEndpoint = {
  /** Anchor id, e.g. "create-booking". */
  id: string;
  method: HttpMethod;
  /** Path relative to the doc base URL; `{name}` marks a path parameter. */
  path: string;
  title: string;
  summary: string;
  /** Example query string for code samples, e.g. "?date=2026-11-20". */
  queryExample?: string;
  pathParams?: DocField[];
  query?: DocField[];
  body?: DocField[];
  requestExample?: unknown;
  responses: DocResponse[];
  notes?: string[];
};

export type DocErrorGroup = {
  status: number;
  codes: Array<{ code: string; meaning: string }>;
};

export type DocWebhooks = {
  intro: string;
  events: Array<{ name: string; description: string }>;
  headers: DocField[];
  payloadExample: unknown;
  rules: string[];
  verifyIntro: string;
  verifySamples: Array<{ label: string; code: string }>;
};

/** One developer guide. Add a new file under features/developer/docs and register it in registry.ts. */
export type ApiDoc = {
  slug: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  version: string;
  updatedAt: string;
  baseUrl: string;
  basics: Array<{ label: string; value: string; mono?: boolean }>;
  auth: { header: string; example: string; notes: string[] };
  envelope: { success: unknown; error: unknown };
  endpoints: DocEndpoint[];
  errors: DocErrorGroup[];
  webhooks?: DocWebhooks;
  /** In-portal pages related to this API, e.g. where admins create keys. */
  related?: Array<{ label: string; href: string; description: string }>;
};
