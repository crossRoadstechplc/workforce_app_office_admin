"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
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
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-4 md:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
