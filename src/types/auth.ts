export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

export type OfficeSummary = {
  id: string;
  name: string;
};

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
  organizationId?: string | null;
  organization?: OrganizationSummary | null;
  officeIds?: string[];
  offices?: OfficeSummary[];
};

export type LoginResponse = {
  accessToken: string;
  mustChangePassword: boolean;
  user: AuthUser;
};

export type MeResponse = {
  id: string;
  email: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  organization: OrganizationSummary | null;
  officeIds: string[];
  offices: OfficeSummary[];
};

export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  OFFICE_ADMIN: "OFFICE_ADMIN",
  ADMIN: "ADMIN" // legacy alias during transition
} as const;

export function isPortalAdmin(roles: string[] | undefined) {
  if (!roles?.length) return false;
  return (
    roles.includes(ROLE.SUPER_ADMIN) ||
    roles.includes(ROLE.ORG_ADMIN) ||
    roles.includes(ROLE.OFFICE_ADMIN) ||
    roles.includes(ROLE.ADMIN)
  );
}

export function isSuperAdmin(roles: string[] | undefined) {
  return !!roles?.includes(ROLE.SUPER_ADMIN);
}

export function isOrgAdmin(roles: string[] | undefined) {
  return !!roles?.includes(ROLE.ORG_ADMIN) || !!roles?.includes(ROLE.ADMIN);
}

export function isOfficeAdmin(roles: string[] | undefined) {
  return !!roles?.includes(ROLE.OFFICE_ADMIN) && !isOrgAdmin(roles);
}
