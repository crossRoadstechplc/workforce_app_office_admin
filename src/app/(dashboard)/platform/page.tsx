"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building, Building2, History, UserCog, Users } from "lucide-react";
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
      <div className="grid gap-4 md:grid-cols-3">
        <QuickLink href="/organizations" title="Organizations" description="Onboard a customer tenant and manage activation." />
        <QuickLink href="/org-admins" title="Company Admins" description="Create the admin who will run that tenant." />
        <QuickLink href="/audit" title="Audit log" description="Review recent platform and tenant changes." icon={History} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  icon: Icon = Building
}: {
  href: string;
  title: string;
  description: string;
  icon?: typeof Building;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <Icon className="size-4" />
          </div>
          <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </div>
        <p className="mt-4 font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </Card>
    </Link>
  );
}
