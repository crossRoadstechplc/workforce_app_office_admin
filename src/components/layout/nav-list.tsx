"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { navSectionsForRoles } from "@/features/navigation/role-nav";

export function useVisibleNavSections() {
  const { user } = useAuth();
  return navSectionsForRoles(user?.roles);
}

export function NavList({
  collapsed = false,
  onNavigate
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const sections = useVisibleNavSections();

  return (
    <nav className={cn("flex-1 overflow-y-auto py-3", collapsed ? "space-y-1 px-2" : "space-y-5 px-3")}>
      {sections.map((section) => (
        <div key={section.title}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.title}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = path === item.href || path.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center rounded-lg text-sm font-medium transition",
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                    active ? "bg-blue-600 text-white" : "hover:bg-slate-900 hover:text-white"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
