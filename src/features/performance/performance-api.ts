import { apiDownload, apiFetch } from "@/lib/api/api-client";
import type {
  Evaluation,
  EvaluationCycle,
  EvaluationList,
  EvaluationTemplate,
  TemplateItem
} from "@/types/performance";

const d = <T>(v: unknown): T => ((v as { data?: T })?.data ?? v) as T;

export const performanceApi = {
  list: async (params: URLSearchParams) => d<EvaluationList>(await apiFetch<unknown>(`/admin/evaluations?${params}`)),
  get: async (id: string) => d<Evaluation>(await apiFetch<unknown>(`/admin/evaluations/${id}`)),
  saveDraft: async (id: string, body: unknown) =>
    d<Evaluation>(await apiFetch<unknown>(`/admin/evaluations/${id}`, { method: "PATCH", body: JSON.stringify(body) })),
  submit: async (id: string) =>
    d<Evaluation>(await apiFetch<unknown>(`/admin/evaluations/${id}/submit`, { method: "POST", body: "{}" })),
  finalize: async (id: string) =>
    d<Evaluation>(await apiFetch<unknown>(`/admin/evaluations/${id}/finalize`, { method: "POST", body: "{}" })),
  cycles: async (params?: URLSearchParams) =>
    d<{ items: EvaluationCycle[]; meta: { page: number; totalPages: number; total: number } }>(
      await apiFetch<unknown>(`/admin/evaluations/cycles${params ? `?${params}` : ""}`)
    ),
  createCycle: async (body: unknown) => d<EvaluationCycle>(await apiFetch<unknown>("/admin/evaluations/cycles", { method: "POST", body: JSON.stringify(body) })),
  openCycle: async (id: string, body?: unknown) =>
    d<EvaluationCycle>(await apiFetch<unknown>(`/admin/evaluations/cycles/${id}/open`, { method: "POST", body: JSON.stringify(body ?? {}) })),
  closeCycle: async (id: string) =>
    d<EvaluationCycle>(await apiFetch<unknown>(`/admin/evaluations/cycles/${id}/close`, { method: "POST", body: "{}" })),
  exportCycle: (id: string) => apiDownload(`/admin/evaluations/cycles/${id}/export?format=csv`, "evaluations.csv"),
  templates: async () => d<EvaluationTemplate[]>(await apiFetch<unknown>("/admin/evaluations/templates")),
  createTemplate: async (body: { name: string; description?: string; jobTitleHint?: string; isDefault?: boolean; items: TemplateItem[] }) =>
    d<EvaluationTemplate>(await apiFetch<unknown>("/admin/evaluations/templates", { method: "POST", body: JSON.stringify(body) })),
  updateTemplate: async (id: string, body: unknown) =>
    d<EvaluationTemplate>(await apiFetch<unknown>(`/admin/evaluations/templates/${id}`, { method: "PATCH", body: JSON.stringify(body) }))
};
