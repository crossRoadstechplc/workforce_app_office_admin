import { apiFetch } from "@/lib/api/api-client";

export type TenantContext = {
  offices: { id: string; name: string; address?: string; timezone?: string }[];
  schedules: { id: string; name: string; checkInTime?: string; checkOutTime?: string; timezone?: string }[];
  scope: "organization" | "office";
};

export const tenantContextApi = {
  get: () => apiFetch<TenantContext>("/admin/context")
};
