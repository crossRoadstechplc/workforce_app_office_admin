"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { ContextSwitcher } from "@/features/auth/context-switcher";
import { roleBadgeClass, roleLabel, resolvePortalRole } from "@/features/navigation/role-nav";
import { NavList } from "./nav-list";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [backdropReady, setBackdropReady] = useState(false);
  const pathname = usePathname();
  const titleId = useId();
  const { user, logout, isSuperAdmin, isOfficeAdmin, portalContexts, switchContext, contextSwitching } = useAuth();
  const portalRole = resolvePortalRole(user?.roles);

  const subtitle = isSuperAdmin
    ? "Platform"
    : isOfficeAdmin
      ? user?.offices?.map((o) => o.name).join(", ") || "Office admin"
      : user?.organization?.name ?? "Company";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      setBackdropReady(false);
      return;
    }
    const enableBackdrop = window.setTimeout(() => setBackdropReady(true), 280);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(enableBackdrop);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleSwitch(contextKey: string) {
    try {
      await switchContext(contextKey);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch role");
    }
  }

  const drawer = open ? (
    <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className={cn(
          "absolute inset-0 z-0 bg-slate-950/50 transition-opacity",
          backdropReady ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-label="Close navigation"
        tabIndex={backdropReady ? 0 : -1}
        onClick={() => {
          if (backdropReady) setOpen(false);
        }}
      />
      <aside
        className="mobile-drawer absolute inset-y-0 left-0 z-10 flex w-[min(20.5rem,calc(100vw-1.25rem))] max-w-full flex-col bg-slate-950 text-slate-300 shadow-2xl"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="border-b border-slate-800 px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-blue-600 p-2">
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p id={titleId} className="font-semibold">
                  Workforce Control
                </p>
                <p className="truncate text-xs text-slate-400">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-300 hover:bg-slate-900 hover:text-white"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>
          {portalRole && (
            <span
              className={cn(
                "mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                roleBadgeClass(portalRole)
              )}
            >
              {roleLabel(user?.roles)}
            </span>
          )}
          {portalContexts.length > 1 && (
            <div className="mt-3">
              <ContextSwitcher
                contexts={portalContexts}
                activeContextKey={user?.activeContext?.key}
                onSwitch={handleSwitch}
                switching={contextSwitching}
                compact
              />
            </div>
          )}
        </div>
        <NavList onNavigate={() => setOpen(false)} />
        <div className="border-t border-slate-800 p-3">
          <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
          <button
            type="button"
            className="mt-2 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-200 hover:bg-slate-900 hover:text-white"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="relative z-30 size-11 shrink-0 px-0 lg:hidden"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
