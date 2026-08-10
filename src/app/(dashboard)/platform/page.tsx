"use client";
import { useQuery } from "@tanstack/react-query";
import { Building, Building2, UserCog, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PlatformGate } from "@/components/auth/role-gates";
import { platformApi } from "@/features/platform/platform-api";
import { MetricCard } from "@/components/dashboard/metric-card";

export default function PlatformDashboardPage() {
  return (
    <PlatformGate>
      <PlatformDashboardInner />
    </PlatformGate>
  );
}

function PlatformDashboardInner() {
  const q = useQuery({ queryKey: ["platform", "dashboard"], queryFn: () => platformApi.dashboard() });
  if (q.isLoading) return <PageSkeleton />;
  const d = q.data?.data;
  return (
    <div className="space-y-6">
      <PageHeader title="Platform dashboard" description="Tenant health across all organizations on this deployment." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Organizations" value={d?.organizations ?? 0} helper="Total tenants" icon={Building} />
        <MetricCard label="Active orgs" value={d?.activeOrganizations ?? 0} helper="Currently active" icon={Building} tone="green" />
        <MetricCard label="Org admins" value={d?.orgAdmins ?? 0} helper="Customer admins" icon={UserCog} />
        <MetricCard label="Employees" value={d?.employees ?? 0} helper="Across all orgs" icon={Users} />
        <MetricCard label="Offices" value={d?.offices ?? 0} helper="Branch locations" icon={Building2} />
      </div>
      <Card className="p-5 text-sm text-slate-600">
        Onboard a customer under <b>Organizations</b>, then create a <b>Company Admin</b> for that tenant. Company admins manage offices,
        office admins, and day-to-day workforce operations inside their company only.
      </Card>
    </div>
  );
}
