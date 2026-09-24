"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Loader2,
  Users,
  FolderKanban,
  AlertTriangle,
  Flame
} from "lucide-react";
import { apiFetch } from "@/lib/api/api-client";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils/cn";

type TaskSummary = {
  enabled: false;
} | {
  enabled: true;
  workspaceId: string;
  name: string;
  enabledAt: string;
  revision: number;
  counts: {
    staff: number;
    projects: number;
    orgTeams: number;
    upcomingSchedule: number;
    tasks: {
      toDo: number;
      inProgress: number;
      done: number;
      open: number;
      highPriorityOpen: number;
      overdue: number;
    };
  };
  roles: Record<string, number>;
  staffPreview: Array<{
    id: string;
    displayName: string;
    jobTitle: string;
    permissionRole: string;
  }>;
  overdue: Array<{
    id: string;
    title: string;
    due: string;
    priority: string;
    status: string;
    project: string;
    owners: string[];
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due: string;
    project: string;
    updatedAt: string;
    owners: string[];
  }>;
  recommendations: string[];
};

type ExchangeResponse = {
  exchangeToken?: string;
  expiresAt?: string;
  data?: { exchangeToken?: string; expiresAt?: string };
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  LEAD: "Lead",
  SENIOR_STAFF: "Senior Staff",
  JUNIOR_STAFF: "Junior Staff"
};

const STATUS_LABEL: Record<string, string> = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done"
};

function unwrapSummary(raw: TaskSummary | { data: TaskSummary }): TaskSummary {
  if ("data" in raw && raw.data && typeof raw.data === "object" && "enabled" in raw.data) {
    return raw.data;
  }
  return raw as TaskSummary;
}

export default function TaskOperationsOverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const trackerBase = process.env.NEXT_PUBLIC_TASK_TRACKER_URL?.replace(/\/$/, "") ?? "";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch<TaskSummary | { data: TaskSummary }>("/admin/task-tracker/summary");
      setSummary(unwrapSummary(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Task Operations overview.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openInNewTab() {
    setOpenError(null);
    if (!trackerBase) {
      setOpenError("NEXT_PUBLIC_TASK_TRACKER_URL is not configured on the portal.");
      return;
    }
    setOpening(true);
    try {
      const raw = await apiFetch<ExchangeResponse>("/task-tracker/session/exchange", {
        method: "POST",
        body: "{}"
      });
      const token = raw.exchangeToken ?? raw.data?.exchangeToken;
      if (!token) throw new Error("No exchange token returned.");
      const url = `${trackerBase}/auth/handoff?token=${encodeURIComponent(token)}`;
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        setOpenError("Pop-up blocked. Allow pop-ups for this site, then try Continue again.");
      }
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Could not open Task Operations.");
    } finally {
      setOpening(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Task Operations" description="Loading board overview…" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!summary?.enabled) {
    return <ErrorState message="Could not open Task Operations for this organization." onRetry={() => void refresh()} />;
  }

  const { counts, roles, staffPreview, overdue, recentTasks, recommendations } = summary;
  const enabledLabel = new Date(summary.enabledAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Operations"
        description={`Overview for ${user?.organization?.name ?? "your company"}. Stay in Workforce to review, then continue into the board in a new tab.`}
        action={
          <Button onClick={() => void openInNewTab()} disabled={opening || !trackerBase}>
            {opening ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
            {opening ? "Opening…" : "Continue to Task Operations"}
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Workspace</p>
            <p className="mt-1 text-base font-semibold text-slate-950">{summary.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              Available since {enabledLabel} · {counts.staff} people · revision {summary.revision}
            </p>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600">
            Workforce stays open. Continue opens the full board in another browser tab with your
            current session — no second password.
          </p>
        </div>
        {openError ? <p className="mt-3 text-sm text-red-600">{openError}</p> : null}
        {!trackerBase ? (
          <p className="mt-3 text-sm text-amber-700">
            Set <code className="rounded bg-amber-50 px-1">NEXT_PUBLIC_TASK_TRACKER_URL</code> on the
            portal to enable Continue.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open tasks"
          value={counts.tasks.open}
          helper={`${counts.tasks.toDo} to do · ${counts.tasks.inProgress} in progress`}
          icon={CircleDashed}
          tone="blue"
        />
        <MetricCard
          label="Done"
          value={counts.tasks.done}
          helper="Completed and still on the board"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricCard
          label="People"
          value={counts.staff}
          helper={`${counts.projects} projects · ${counts.orgTeams} teams`}
          icon={Users}
          tone="amber"
        />
        <MetricCard
          label="Attention"
          value={counts.tasks.overdue + counts.tasks.highPriorityOpen}
          helper={`${counts.tasks.overdue} overdue · ${counts.tasks.highPriorityOpen} high priority`}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recommended next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((item) => (
              <div
                key={item}
                className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5"
              >
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-blue-600" />
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
            <Button className="mt-2 w-full" onClick={() => void openInNewTab()} disabled={opening || !trackerBase}>
              {opening ? "Preparing session…" : "Continue — open board in new tab"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderKanban className="size-4 text-slate-500" />
              Who is on the board
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(roles).map(([role, count]) =>
                count > 0 ? (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {ROLE_LABEL[role] ?? role}
                    <span className="tabular-nums text-slate-500">{count}</span>
                  </span>
                ) : null
              )}
            </div>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
              {staffPreview.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{person.displayName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {person.jobTitle || "No job title"} · {ROLE_LABEL[person.permissionRole] ?? person.permissionRole}
                    </p>
                  </div>
                </li>
              ))}
              {staffPreview.length === 0 ? (
                <li className="px-3 py-4 text-sm text-slate-500">No staff members yet.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="size-4 text-amber-600" />
              Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <p className="text-sm text-slate-500">No overdue open tasks detected from dated due fields.</p>
            ) : (
              <ul className="space-y-2">
                {overdue.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-lg border border-red-100 bg-red-50/40 px-3 py-2.5"
                  >
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {task.project} · due {task.due}
                      {task.owners.length ? ` · ${task.owners.join(", ")}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recently updated</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks yet — continue to the board to create the first ones.</p>
            ) : (
              <ul className="space-y-2">
                {recentTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {task.project}
                        {task.owners.length ? ` · ${task.owners.join(", ")}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        task.status === "DONE"
                          ? "bg-emerald-50 text-emerald-800"
                          : task.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {STATUS_LABEL[task.status] ?? task.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
