"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { endOfToday, format, subDays } from "date-fns";
import {
  AlertTriangle,
  ClipboardList,
  Clock3,
  FileCheck2,
  LogOut,
  Plane,
  UserCheck,
  UserX,
  Users
} from "lucide-react";
import { dashboardApi } from "@/features/dashboard/dashboard-api";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AttendanceChart } from "@/components/dashboard/attendance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-provider";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { homePathForRoles } from "@/features/navigation/role-nav";
import { humanizeKey } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { LeaveSummaryItem } from "@/types/dashboard";

export default function DashboardPage() {
  const { isSuperAdmin, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSuperAdmin) router.replace(homePathForRoles(user?.roles));
  }, [isSuperAdmin, user?.roles, router]);

  if (isSuperAdmin) return null;

  return (
    <TenantOpsGate>
      <TenantDashboard />
    </TenantOpsGate>
  );
}

function TenantDashboard() {
  const { isOfficeAdmin, user } = useAuth();
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");

  const to = format(endOfToday(), "yyyy-MM-dd");
  const from = format(subDays(new Date(), 13), "yyyy-MM-dd");
  const today = useQuery({ queryKey: ["dashboard", "today"], queryFn: dashboardApi.today, refetchInterval: 60_000 });
  const trend = useQuery({ queryKey: ["dashboard", "trend", from, to], queryFn: () => dashboardApi.trend(from, to) });
  const leave = useQuery({ queryKey: ["dashboard", "leave", from, to], queryFn: () => dashboardApi.leave(from, to) });
  const activity = useQuery({ queryKey: ["dashboard", "activity"], queryFn: dashboardApi.activity });

  if (today.isError) return <ErrorState message="The workforce dashboard could not be loaded." onRetry={() => today.refetch()} />;

  const s = today.data;

  return (
    <>
      <PageHeader
        title={isOfficeAdmin ? "Office dashboard" : "Company dashboard"}
        description={
          isOfficeAdmin
            ? `Today's workforce activity for ${officeLabel ?? "your assigned offices"}.`
            : `Organization-wide view for ${user?.organization?.name ?? "your company"}.`
        }
        action={
          isOfficeAdmin && officeLabel ? (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              Scoped to {officeLabel}
            </span>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {today.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36" />)
        ) : (
          <>
            <MetricCard label="Employees" value={s!.totalEmployees} helper="Active in scope" icon={Users} />
            <MetricCard label="Checked in" value={s!.checkedIn} helper={`${s!.checkedOut} already checked out`} icon={UserCheck} tone="green" />
            <MetricCard label="Late" value={s!.late} helper={`${s!.onTime} on time`} icon={Clock3} tone="amber" />
            <MetricCard label="On leave" value={s!.onLeave} helper={`${s!.pendingLeaveRequests} pending requests`} icon={Plane} />
            <MetricCard label="Missing checkout" value={s!.missingCheckout} helper="Needs attention" icon={AlertTriangle} tone="red" />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance trend · last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.isLoading ? <Skeleton className="h-72" /> : trend.data ? <AttendanceChart data={trend.data} /> : (
              <EmptyState title="Trend unavailable" description="Attendance history could not be loaded for this window." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave summary</CardTitle>
          </CardHeader>
          <CardContent>
            {leave.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : leave.data?.length ? (
              <LeaveBars items={leave.data} />
            ) : (
              <EmptyState title="No leave in this period" description="Approved, pending, and rejected requests will show here." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : activity.data?.length ? (
              <div className="divide-y divide-slate-100">
                {activity.data.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="mt-0.5 rounded-lg bg-slate-100 p-2">
                      <FileCheck2 className="size-4 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{humanizeKey(a.action)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {a.actor?.email ?? "System"} · {humanizeKey(a.entityType)}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">{format(new Date(a.createdAt), "MMM d, HH:mm")}</time>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent activity" description="Admin actions and workforce decisions will appear here." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today at a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <GlanceRow icon={UserX} label="Not checked in" value={s?.notCheckedIn} tone="amber" />
            <GlanceRow icon={ClipboardList} label="Worksheets submitted" value={s?.worksheetsSubmitted} tone="blue" />
            <GlanceRow icon={LogOut} label="Checked out" value={s?.checkedOut} tone="green" />
            <GlanceRow icon={Plane} label="Pending leave" value={s?.pendingLeaveRequests} tone="blue" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LeaveBars({ items }: { items: LeaveSummaryItem[] }) {
  const max = Math.max(...items.map((item) => item.requests), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.status} className="rounded-lg border border-slate-100 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <StatusBadge status={item.status} />
              <p className="mt-1 text-xs text-slate-500">{item.days} days</p>
            </div>
            <p className="text-xl font-bold tabular-nums">{item.requests}</p>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max((item.requests / max) * 100, item.requests ? 6 : 0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GlanceRow({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Users;
  label: string;
  value?: number;
  tone: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700"
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5">
      <span className="flex items-center gap-3 text-sm text-slate-600">
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}>
          <Icon className="size-4" />
        </span>
        {label}
      </span>
      <span className="font-semibold tabular-nums text-slate-950">{value ?? "—"}</span>
    </div>
  );
}
