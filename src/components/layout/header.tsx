"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { notificationApi } from "@/features/notifications/notification-api";
import { roleLabel, resolvePortalRole, roleBadgeClass } from "@/features/navigation/role-nav";
import { cn } from "@/lib/utils/cn";
import { MobileNav } from "./mobile-nav";

export function Header() {
  const { user, logout, isSuperAdmin, isOfficeAdmin } = useAuth();
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "AD";
  const portalRole = resolvePortalRole(user?.roles);

  const q = useQuery({
    queryKey: ["notifications", "header"],
    queryFn: () => notificationApi.list(new URLSearchParams({ page: "1", pageSize: "10" })),
    refetchInterval: 60000,
    enabled: !isSuperAdmin
  });
  const unread = q.data?.unreadCount ?? q.data?.items.filter((x) => !x.isRead).length ?? 0;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500">{roleLabel(user?.roles)}</p>
            {portalRole && (
              <span className={cn("hidden rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase sm:inline", roleBadgeClass(portalRole))}>
                {portalRole}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold">
            {isSuperAdmin
              ? "SaaS control plane"
              : isOfficeAdmin
                ? user?.offices?.map((o) => o.name).join(", ") || "Assigned offices"
                : user?.organization?.name ?? "Workforce operations"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild aria-label="Notifications" className="relative px-3">
          <Link href="/notifications">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </Button>
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials}</span>
              <span className="hidden max-w-40 truncate text-sm md:block">{user?.email}</span>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownItem onSelect={() => void logout()}>Sign out</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
