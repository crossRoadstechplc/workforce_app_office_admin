import { apiFetch } from "@/lib/api/api-client";

export type OfficeAdminUser = {
  id: string;
  email: string;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  adminOffices: { office: { id: string; name: string; isActive: boolean } }[];
};

export const officeAdminApi = {
  list: (params?: URLSearchParams) =>
    apiFetch<{ items: OfficeAdminUser[]; meta: { total: number } }>(`/admin/office-admins?${params ?? "page=1&pageSize=50"}`),

  create: (body: { email: string; officeIds: string[]; deliveryMethod?: "SHOW_PASSWORD" | "SEND_EMAIL" }) =>
    apiFetch<{
      user: OfficeAdminUser;
      temporaryPassword?: string;
      emailSent?: boolean;
      inviteId?: string;
      emailError?: string;
      existingAccount?: boolean;
      requiresPassword?: boolean;
    }>("/admin/office-admins", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  updateOffices: (userId: string, officeIds: string[]) =>
    apiFetch<OfficeAdminUser>(`/admin/office-admins/${userId}/offices`, {
      method: "PATCH",
      body: JSON.stringify({ officeIds })
    }),

  status: (userId: string, status: "ACTIVE" | "INACTIVE", reason: string) =>
    apiFetch(`/admin/office-admins/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason })
    }),

  resetPassword: (userId: string, reason: string) =>
    apiFetch<{ temporaryPassword: string }>(`/admin/office-admins/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ reason })
    })
};
