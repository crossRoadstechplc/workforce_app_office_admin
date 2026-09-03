import { apiFetch } from "@/lib/api/api-client";
import { tenantContextApi } from "@/features/context/tenant-context-api";
import type { Employee, EmployeeList, Office, Schedule, Department, EvaluationTemplateOption } from "@/types/employee";

export type CreateEmployeeInput = {
  email: string;
  employeeCode?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  departmentId?: string;
  evaluationTemplateId?: string;
  employmentStartDate: string;
  officeId?: string;
  scheduleId?: string;
  supervisorId?: string | null;
  temporaryPassword?: string;
};

export type UpdateEmployeeInput = {
  email?: string;
  employeeCode?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  phone?: string | null;
  jobTitle?: string | null;
  departmentId?: string | null;
  evaluationTemplateId?: string | null;
  employmentStartDate?: string;
  officeId?: string | null;
  scheduleId?: string | null;
  supervisorId?: string | null;
};

export const employeeApi = {
  list: (params: URLSearchParams) => apiFetch<EmployeeList>(`/admin/employees?${params}`),
  get: (id: string) => apiFetch<Employee>(`/admin/employees/${id}`),
  create: (input: CreateEmployeeInput) =>
    apiFetch<{ employee: Employee; temporaryPassword: string }>("/admin/employees", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: UpdateEmployeeInput) =>
    apiFetch<Employee>(`/admin/employees/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  changeStatus: (id: string, input: { employeeStatus: string; reason: string }) =>
    apiFetch<Employee>(`/admin/employees/${id}/status`, { method: "PATCH", body: JSON.stringify(input) }),
  resetPassword: (id: string, reason: string) =>
    apiFetch<{ employeeId: string; temporaryPassword: string; mustChangePassword: boolean }>(
      `/admin/employees/${id}/reset-password`,
      { method: "POST", body: JSON.stringify({ reason }) }
    ),
  offices: async () => {
    try {
      const ctx = await tenantContextApi.get();
      return ctx.offices as Office[];
    } catch {
      const r = await apiFetch<any>("/admin/offices?page=1&pageSize=100");
      return (r.items ?? r.data?.items ?? r) as Office[];
    }
  },
  schedules: async () => {
    try {
      const ctx = await tenantContextApi.get();
      return ctx.schedules as Schedule[];
    } catch {
      const r = await apiFetch<any>("/admin/schedules?page=1&pageSize=100");
      return (r.items ?? r.data?.items ?? r) as Schedule[];
    }
  },
  departments: async () => {
    try {
      const ctx = await tenantContextApi.get();
      return ctx.departments as Department[];
    } catch {
      const r = await apiFetch<any>("/admin/departments?page=1&pageSize=100");
      return (r.items ?? r.data?.items ?? r) as Department[];
    }
  },
  evaluationTemplates: async () => {
    try {
      const ctx = await tenantContextApi.get();
      return ctx.evaluationTemplates as EvaluationTemplateOption[];
    } catch {
      const r = await apiFetch<any>("/admin/evaluations/templates");
      return (Array.isArray(r) ? r : r.items ?? r.data ?? []) as EvaluationTemplateOption[];
    }
  }
};
