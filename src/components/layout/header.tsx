"use client";

import { ChevronDown, PanelLeft, PanelLeftClose } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { ContextSwitcher } from "@/features/auth/context-switcher";
import { useAuth } from "@/features/auth/auth-provider";
import { roleLabel } from "@/features/navigation/role-nav";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { useSidebar } from "./sidebar-context";

export function Header() {
  const { user, logout, isSuperAdmin, portalContexts, switchContext, contextSwitching } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const initials = user?.email.slice(0, 2).toUpperCase() ?? "AD";

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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-white/95 px-3 backdrop-blur sm:h-16 lg:px-6">
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
        <div className="hidden min-w-0 lg:flex lg:flex-col lg:gap-1 xl:flex-row xl:items-center xl:gap-3">
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
        <div className="min-w-0 lg:hidden">
          <p className="truncate text-sm font-semibold text-slate-950">{contextLabel}</p>
          <p className="truncate text-xs text-slate-500">{roleLabel(user?.roles)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
        {!isSuperAdmin && <NotificationBell />}
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" className="gap-2 px-1.5 sm:px-3">
              <span className="grid size-8 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{initials}</span>
              <span className="hidden max-w-40 truncate text-sm md:block">{user?.email}</span>
              <ChevronDown className="hidden size-4 sm:block" />
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
