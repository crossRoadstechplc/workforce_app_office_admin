import { apiFetch } from "@/lib/api/api-client";

const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export type InvitePreview = {
  type: "ORG_ADMIN" | "OFFICE_ADMIN" | "EMPLOYEE";
  email: string;
  status: string;
  expiresAt: string;
  requiresPassword: boolean;
  organization: { id: string; name: string; slug: string; isActive: boolean };
  office: { id: string; name: string } | null;
  schedule: { id: string; name: string } | null;
  offices: string[];
  payload: { employmentStartDate?: string; jobTitle?: string | null; departmentId?: string | null; evaluationTemplateId?: string | null } | null;
};

export type InviteRecord = {
  id: string;
  type: string;
  status: string;
  email: string;
  officeId?: string | null;
  expiresAt: string;
  organization?: { name: string };
  office?: { name: string } | null;
};

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err = (body as { error?: { message?: string } }).error ?? (body as { message?: string });
    throw new Error(err.message ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const publicInviteApi = {
  get: (token: string) => publicFetch<InvitePreview>(`/invites/${encodeURIComponent(token)}`),
  acceptAdmin: (token: string, password?: string) =>
    publicFetch<{ email: string; existingAccount?: boolean }>(`/invites/${encodeURIComponent(token)}/accept-admin`, {
      method: "POST",
      body: JSON.stringify(password ? { password } : {})
    }),
  acceptEmployee: (
    token: string,
    body: {
      firstName: string;
      middleName?: string;
      lastName: string;
      phone?: string;
      jobTitle?: string;
      departmentId?: string;
      evaluationTemplateId?: string;
      employmentStartDate: string;
      employeeCode?: string;
      officeId?: string;
      scheduleId?: string;
      password?: string;
    }
  ) =>
    publicFetch<{ email: string; employeeCode: string; existingAccount?: boolean }>(`/invites/${encodeURIComponent(token)}/accept-employee`, {
      method: "POST",
      body: JSON.stringify(body)
    })
};

export const inviteApi = {
  list: (params?: URLSearchParams) =>
    apiFetch<{ items: InviteRecord[]; meta: { total: number } }>(`/admin/invites${params ? `?${params}` : ""}`),
  resend: (id: string) =>
    apiFetch<{ emailSent: boolean; inviteId: string; emailError?: string }>(`/admin/invites/${id}/resend`, { method: "POST" }),
  createEmployee: (body: {
    email: string;
    officeId?: string;
    scheduleId?: string;
    employmentStartDate?: string;
    jobTitle?: string;
    departmentId?: string;
    evaluationTemplateId?: string;
  }) =>
    apiFetch<{ invite: InviteRecord; emailSent: boolean; inviteId: string; emailError?: string }>("/admin/employees/invites", {
      method: "POST",
      body: JSON.stringify(body)
    })
};

export function passwordMeetsRules(password: string) {
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}
