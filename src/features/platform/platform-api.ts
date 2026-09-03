import { apiFetch } from "@/lib/api/api-client";

export type PlatformOrganization = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt?: string;
  _count?: { offices: number; employees: number; memberships: number; schedules?: number };
};

export type CreatedOrganization = PlatformOrganization & {
  admin?: { user: PlatformOrgAdmin; temporaryPassword?: string; emailSent?: boolean; inviteId?: string; emailError?: string };
};

export type PlatformOrgAdmin = {
  id: string;
  email: string;
  status: string;
  mustChangePassword: boolean;
  createdAt?: string;
  memberships: { organization: { id: string; name: string; slug: string; isActive: boolean } }[];
  userRoles: { role: { name: string } }[];
};

function itemsOf<T>(data: any): T[] {
  return data?.items ?? data?.data?.items ?? (Array.isArray(data) ? data : []);
}

export const platformApi = {
  dashboard: () => apiFetch<{ data: { organizations: number; activeOrganizations: number; orgAdmins: number; employees: number; offices: number } }>("/platform/dashboard"),
  organizations: (params?: URLSearchParams) =>
    apiFetch<{ items: PlatformOrganization[]; meta: unknown }>(`/platform/organizations${params ? `?${params}` : ""}`),
  createOrganization: (body: { name: string; slug: string; isActive?: boolean; adminEmail?: string; sendInvite?: boolean }) =>
    apiFetch<PlatformOrganization & {
      admin?: { user: PlatformOrgAdmin; temporaryPassword?: string; emailSent?: boolean; inviteId?: string; emailError?: string };
    }>("/platform/organizations", { method: "POST", body: JSON.stringify(body) }),
  updateOrganization: (id: string, body: Partial<{ name: string; slug: string; isActive: boolean }>) =>
    apiFetch<PlatformOrganization>(`/platform/organizations/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  organizationStatus: (id: string, isActive: boolean, reason: string) =>
    apiFetch<PlatformOrganization>(`/platform/organizations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive, reason })
    }),
  orgAdmins: (params?: URLSearchParams) =>
    apiFetch<{ items: PlatformOrgAdmin[]; meta: unknown }>(`/platform/org-admins${params ? `?${params}` : ""}`),
  createOrgAdmin: (body: { organizationId: string; email: string; temporaryPassword?: string; deliveryMethod?: "SHOW_PASSWORD" | "SEND_EMAIL" }) =>
    apiFetch<{
      user: PlatformOrgAdmin;
      temporaryPassword?: string;
      emailSent?: boolean;
      inviteId?: string;
      emailError?: string;
      existingAccount?: boolean;
      requiresPassword?: boolean;
    }>("/platform/org-admins", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  orgAdminStatus: (userId: string, status: "ACTIVE" | "INACTIVE", reason: string) =>
    apiFetch(`/platform/org-admins/${userId}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
  resetOrgAdminPassword: (userId: string, reason: string) =>
    apiFetch<{ userId: string; temporaryPassword: string }>(`/platform/org-admins/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),
  itemsOf
};
