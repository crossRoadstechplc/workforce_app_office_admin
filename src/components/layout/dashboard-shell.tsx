"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SidebarProvider } from "./sidebar-context";
import { useAuth } from "@/features/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { homePathForRoles, isPathAllowed } from "@/features/navigation/role-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "mustChangePassword") router.replace("/change-password");
  }, [status, router]);

  useEffect(() => {
    if (status !== "loading") return;
    const t = window.setTimeout(() => router.replace("/login"), 15_000);
    return () => window.clearTimeout(t);
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !user?.roles?.length) return;
    if (!isPathAllowed(pathname, user.roles)) {
      router.replace(homePathForRoles(user.roles));
    }
  }, [status, user, pathname, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen p-8">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardFrame>{children}</DashboardFrame>
    </SidebarProvider>
  );
}

function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 bg-[var(--background)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <Header />
        <main className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
