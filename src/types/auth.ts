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

export type ContextType = "platform" | "org_admin" | "office_admin" | "employee";

export type ActiveContext = {
  key: string;
  type: ContextType;
  organizationId: string | null;
  officeIds: string[];
};

export type LoginContext = {
  key: string;
  type: ContextType;
  label: string;
  organizationId: string | null;
  organizationName: string | null;
  officeIds: string[];
  officeNames: string[];
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
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    displayName: string;
  } | null;
  activeContext?: ActiveContext;
};

export type LoginResponse =
  | {
      accessToken: string;
      refreshToken?: string;
      mustChangePassword: boolean;
      user: AuthUser;
      activeContext?: ActiveContext;
      requiresContextSelection?: false;
    }
  | {
      requiresContextSelection: true;
      preAuthToken: string;
      contexts: LoginContext[];
      defaultContextKey: string | null;
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
  employee?: AuthUser["employee"];
  activeContext?: ActiveContext;
};

export const ROLE = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  OFFICE_ADMIN: "OFFICE_ADMIN",
  EMPLOYEE: "EMPLOYEE",
  ADMIN: "ADMIN" // legacy alias during transition
} as const;

export const LAST_CONTEXT_STORAGE_KEY = "workforce_last_context_key";

export function isPortalContextType(type: ContextType) {
  return type === "platform" || type === "org_admin" || type === "office_admin";
}

export function filterPortalContexts(contexts: LoginContext[]) {
  return contexts.filter((item) => isPortalContextType(item.type));
}

export function isPortalAdmin(roles: string[] | undefined) {
  if (!roles?.length) return false;
  return (
    roles.includes(ROLE.SUPER_ADMIN) ||
    roles.includes(ROLE.ORG_ADMIN) ||
    roles.includes(ROLE.OFFICE_ADMIN) ||
    roles.includes(ROLE.ADMIN)
  );
}

export function hasPortalContext(contexts: LoginContext[]) {
  return filterPortalContexts(contexts).length > 0;
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
