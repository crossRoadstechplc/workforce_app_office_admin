"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { navSectionsForRoles, roleLabel, resolvePortalRole, roleBadgeClass } from "@/features/navigation/role-nav";

export function useVisibleNavSections() {
  const { user } = useAuth();
  return navSectionsForRoles(user?.roles);
}

export function Sidebar() {
  const path = usePathname();
  const { user, isSuperAdmin, isOfficeAdmin } = useAuth();
  const sections = useVisibleNavSections();
  const portalRole = resolvePortalRole(user?.roles);

  const subtitle = isSuperAdmin
    ? "Platform console"
    : isOfficeAdmin
      ? user?.offices?.map((o) => o.name).join(", ") || "Assigned offices"
      : user?.organization?.name ?? "Company";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-950 text-slate-300 lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 p-2">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Workforce Control</p>
            <p className="truncate text-[11px] text-slate-500">{subtitle}</p>
          </div>
        </div>
        {portalRole && (
          <span className={cn("mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", roleBadgeClass(portalRole))}>
            {roleLabel(user?.roles)}
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                      active ? "bg-blue-600 text-white" : "hover:bg-slate-900 hover:text-white"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4 text-xs text-slate-500">Workforce Platform v1.0</div>
    </aside>
  );
}
