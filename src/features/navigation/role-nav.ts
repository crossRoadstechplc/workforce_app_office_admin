import {
  Bell,
  BookOpenCheck,
  Building2,
  Building,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  Users,
  Clock3,
  History,
  UserCog,
  UserSquare2,
  type LucideIcon
} from "lucide-react";
import { isOfficeAdmin, isOrgAdmin, isSuperAdmin, ROLE } from "@/types/auth";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export type PortalRole = "platform" | "company" | "office";

export function resolvePortalRole(roles: string[] | undefined): PortalRole | null {
  if (!roles?.length) return null;
  if (isSuperAdmin(roles)) return "platform";
  if (isOrgAdmin(roles)) return "company";
  if (isOfficeAdmin(roles)) return "office";
  if (roles.includes(ROLE.OFFICE_ADMIN)) return "office";
  return null;
}

export function homePathForRoles(roles: string[] | undefined): string {
  const role = resolvePortalRole(roles);
  if (role === "platform") return "/platform";
  return "/dashboard";
}

const platformSections: NavSection[] = [
  {
    title: "Platform",
    items: [{ label: "Dashboard", href: "/platform", icon: LayoutDashboard }]
  },
  {
    title: "Tenants",
    items: [
      { label: "Organizations", href: "/organizations", icon: Building },
      { label: "Company Admins", href: "/org-admins", icon: UserCog }
    ]
  },
  {
    title: "System",
    items: [
      { label: "Audit log", href: "/audit", icon: History },
      { label: "Notifications", href: "/notifications", icon: Bell }
    ]
  }
];

const companySections: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]
  },
  {
    title: "Workforce",
    items: [
      { label: "Employees", href: "/employees", icon: Users },
      { label: "Attendance", href: "/attendance", icon: Clock3 },
      { label: "Worksheets", href: "/worksheets", icon: ClipboardList },
      { label: "Leave", href: "/leave", icon: CalendarClock },
      { label: "Performance", href: "/performance", icon: ClipboardCheck }
    ]
  },
  {
    title: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: FileBarChart2 }]
  },
  {
    title: "Company setup",
    items: [
      { label: "Offices", href: "/offices", icon: Building2 },
      { label: "Schedules", href: "/schedules", icon: BookOpenCheck },
      { label: "Office Admins", href: "/office-admins", icon: UserSquare2 }
    ]
  },
  {
    title: "System",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Audit log", href: "/audit", icon: History }
    ]
  }
];

const officeSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]
  },
  {
    title: "My offices",
    items: [
      { label: "Employees", href: "/employees", icon: Users },
      { label: "Attendance", href: "/attendance", icon: Clock3 },
      { label: "Worksheets", href: "/worksheets", icon: ClipboardList },
      { label: "Leave", href: "/leave", icon: CalendarClock },
      { label: "Performance", href: "/performance", icon: ClipboardCheck }
    ]
  },
  {
    title: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: FileBarChart2 }]
  },
  {
    title: "System",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Audit log", href: "/audit", icon: History }
    ]
  }
];

export function navSectionsForRoles(roles: string[] | undefined): NavSection[] {
  const kind = resolvePortalRole(roles);
  if (kind === "platform") return platformSections;
  if (kind === "company") return companySections;
  if (kind === "office") return officeSections;
  return [];
}

/** Paths each portal role may access (prefix match). */
const platformPaths = ["/platform", "/organizations", "/org-admins", "/audit", "/notifications"];
const companyOnlyPaths = ["/offices", "/schedules", "/office-admins", "/performance/templates", "/performance/cycles"];
const tenantOpsPaths = ["/dashboard", "/employees", "/attendance", "/worksheets", "/leave", "/performance", "/reports", "/notifications", "/audit"];

export function isPathAllowed(pathname: string, roles: string[] | undefined): boolean {
  const kind = resolvePortalRole(roles);
  if (!kind) return false;

  const match = (prefixes: string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (kind === "platform") return match(platformPaths);
  if (kind === "company") return match([...tenantOpsPaths, ...companyOnlyPaths]);
  if (kind === "office") {
    if (match(companyOnlyPaths)) return false;
    return match(tenantOpsPaths);
  }
  return false;
}

export function roleLabel(roles: string[] | undefined): string {
  const kind = resolvePortalRole(roles);
  if (kind === "platform") return "Platform admin";
  if (kind === "company") return "Company admin";
  if (kind === "office") return "Office admin";
  return "Admin";
}

export function roleBadgeClass(kind: PortalRole | null): string {
  switch (kind) {
    case "platform":
      return "bg-violet-100 text-violet-800";
    case "company":
      return "bg-blue-100 text-blue-800";
    case "office":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
