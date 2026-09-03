"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, PanelLeft, PanelLeftClose } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { ContextSwitcher } from "@/features/auth/context-switcher";
import { useAuth } from "@/features/auth/auth-provider";
import { notificationApi } from "@/features/notifications/notification-api";
import { roleLabel } from "@/features/navigation/role-nav";
import { MobileNav } from "./mobile-nav";
import { useSidebar } from "./sidebar-context";

export function Header() {
  const { user, logout, isSuperAdmin, portalContexts, switchContext, contextSwitching } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "AD";

  const q = useQuery({
    queryKey: ["notifications", "header"],
    queryFn: () => notificationApi.list(new URLSearchParams({ page: "1", pageSize: "10" })),
    refetchInterval: 60000,
    enabled: !isSuperAdmin
  });
  const unread = q.data?.unreadCount ?? q.data?.items.filter((x) => !x.isRead).length ?? 0;

  const contextLabel = isSuperAdmin
    ? "SaaS control plane"
    : user?.organization?.name ?? user?.offices?.map((o) => o.name).join(", ") ?? "Workforce operations";

  async function handleSwitch(contextKey: string) {
    try {
      await switchContext(contextKey);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch role");
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <Button
          variant="ghost"
          className="hidden px-2 lg:inline-flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={toggle}
        >
          {collapsed ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
        </Button>
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <ContextSwitcher
            contexts={portalContexts}
            activeContextKey={user?.activeContext?.key}
            onSwitch={handleSwitch}
            switching={contextSwitching}
            compact
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{contextLabel}</p>
            <p className="truncate text-xs text-slate-500">{roleLabel(user?.roles)}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {!isSuperAdmin && (
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
        )}
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
