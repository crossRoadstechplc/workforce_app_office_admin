"use client";
import { useAuth } from "@/features/auth/auth-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { homePathForRoles } from "@/features/navigation/role-nav";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, status } = useAuth();
  if (status === "loading") return null;
  const ok = roles.some((r) => user?.roles?.includes(r));
  if (!ok) {
    return (
      <EmptyState
        title="Access denied"
        description="Your account role cannot open this page. Use the navigation menu for pages available to you."
        action={
          <Button asChild variant="secondary">
            <Link href={homePathForRoles(user?.roles)}>Go to my dashboard</Link>
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}
