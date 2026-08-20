"use client";

import { ChevronsLeft, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { roleBadgeClass, roleLabel, resolvePortalRole } from "@/features/navigation/role-nav";
import { NavList } from "./nav-list";
import { useSidebar } from "./sidebar-context";

export function Sidebar() {
  const { user, isSuperAdmin, isOfficeAdmin } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const portalRole = resolvePortalRole(user?.roles);

  const subtitle = isSuperAdmin
    ? "Platform console"
    : isOfficeAdmin
      ? user?.offices?.map((o) => o.name).join(", ") || "Assigned offices"
      : user?.organization?.name ?? "Company";

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 overflow-visible bg-slate-950 text-slate-300 transition-[width] duration-200 ease-out lg:flex lg:flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className={cn("border-b border-slate-800 text-white", collapsed ? "px-2 py-4" : "px-5 py-4")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="shrink-0 rounded-lg bg-blue-600 p-2">
            <ShieldCheck className="size-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Workforce Control</p>
              <p className="truncate text-[11px] text-slate-500">{subtitle}</p>
            </div>
          )}
        </div>
        {!collapsed && portalRole && (
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              roleBadgeClass(portalRole)
            )}
          >
            {roleLabel(user?.roles)}
          </span>
        )}
      </div>

      <NavList collapsed={collapsed} />

      {!collapsed && (
        <div className="border-t border-slate-800 p-4 text-xs text-slate-500">Workforce Platform v1.0</div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-[4.75rem] hidden size-6 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:grid"
      >
        <ChevronsLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
      </button>
    </aside>
  );
}
