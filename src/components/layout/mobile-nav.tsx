"use client";

import { useEffect, useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { roleBadgeClass, roleLabel, resolvePortalRole } from "@/features/navigation/role-nav";
import { NavList } from "./nav-list";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { user, isSuperAdmin, isOfficeAdmin } = useAuth();
  const portalRole = resolvePortalRole(user?.roles);

  const subtitle = isSuperAdmin
    ? "Platform"
    : isOfficeAdmin
      ? user?.offices?.map((o) => o.name).join(", ") || "Office admin"
      : user?.organization?.name ?? "Company";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <Button variant="ghost" className="lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
        <Menu className="size-5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/45" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-slate-950 text-slate-300 shadow-2xl">
            <div className="border-b border-slate-800 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-600 p-2">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <span className="font-semibold">Workforce Control</span>
                    <p className="text-xs text-slate-500">{subtitle}</p>
                  </div>
                </div>
                <button className="rounded-lg p-2 hover:bg-slate-900" onClick={() => setOpen(false)} aria-label="Close navigation">
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
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
