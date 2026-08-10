"use client";
import { RequireRole } from "@/components/auth/require-role";
import { ROLE } from "@/types/auth";

export function PlatformGate({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={[ROLE.SUPER_ADMIN]}>{children}</RequireRole>;
}

export function CompanyAdminGate({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={[ROLE.ORG_ADMIN, ROLE.ADMIN]}>{children}</RequireRole>;
}

export function TenantOpsGate({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={[ROLE.ORG_ADMIN, ROLE.ADMIN, ROLE.OFFICE_ADMIN]}>{children}</RequireRole>;
}

export function PortalAdminGate({ children }: { children: React.ReactNode }) {
  return <RequireRole roles={[ROLE.SUPER_ADMIN, ROLE.ORG_ADMIN, ROLE.ADMIN, ROLE.OFFICE_ADMIN]}>{children}</RequireRole>;
}
