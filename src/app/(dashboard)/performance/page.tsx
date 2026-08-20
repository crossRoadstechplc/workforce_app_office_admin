"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileBarChart2, Search, Settings2 } from "lucide-react";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { OfficeFilter } from "@/components/ops/office-filter";
import { OpsSummaryStrip } from "@/components/ops/ops-summary-strip";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { FilterBar } from "@/components/ui/filter-bar";
import { performanceApi } from "@/features/performance/performance-api";
import { employeeName, formatDate } from "@/lib/utils/format";

export default function PerformancePage() {
  return (
    <TenantOpsGate>
      <Suspense fallback={<PageSkeleton />}>
        <PerformanceQueue />
      </Suspense>
    </TenantOpsGate>
  );
}

function PerformanceQueue() {
  const { isOfficeAdmin } = useAuth();
  const searchParams = useSearchParams();
  const [officeId, setOfficeId] = useState("");
  const [status, setStatus] = useState("");
  const [cycleId, setCycleId] = useState(searchParams.get("cycleId") ?? "");
  const [search, setSearch] = useState("");
  const [myReports, setMyReports] = useState(false);
  const [page, setPage] = useState(1);
  const employeeId = searchParams.get("employeeId") ?? "";

  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (officeId) p.set("officeId", officeId);
    if (status) p.set("status", status);
    if (cycleId) p.set("cycleId", cycleId);
    if (search.trim()) p.set("search", search.trim());
    if (myReports) p.set("myReports", "true");
    if (employeeId) p.set("employeeId", employeeId);
    return p;
  }, [officeId, status, cycleId, search, myReports, page, employeeId]);

  const q = useQuery({ queryKey: ["evaluations", params.toString()], queryFn: () => performanceApi.list(params) });
  const cycles = useQuery({ queryKey: ["evaluation-cycles"], queryFn: () => performanceApi.cycles() });

  if (q.isLoading) return <PageSkeleton />;
  const items = q.data?.items ?? [];
  const counts = q.data?.counts;
  const meta = q.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office performance" : "Performance"}
        description="Internal evaluations by date range. Employees self-score in the app; office and company admins complete evaluator scores here."
        action={
          !isOfficeAdmin ? (
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/performance/templates">
                  <Settings2 className="size-4" />
                  Templates
                </Link>
              </Button>
              <Button asChild>
                <Link href="/performance/cycles">
                  <FileBarChart2 className="size-4" />
                  Cycles
                </Link>
              </Button>
            </div>
          ) : undefined
        }
      />

      {counts && (
        <OpsSummaryStrip
          metrics={[
            { label: "Awaiting self", value: counts.awaitingSelf, tone: "warning" },
            { label: "Awaiting evaluator", value: counts.awaitingEvaluator, tone: "default" },
            { label: "Done", value: counts.done, tone: "success" },
            { label: "Overdue", value: counts.overdue, tone: "danger" }
          ]}
        />
      )}

      <FilterBar>
        <OfficeFilter visible={!isOfficeAdmin} value={officeId} onChange={(v) => { setOfficeId(v); setPage(1); }} />
        <div className="min-w-0 space-y-1.5">
          <Label>Cycle</Label>
          <Select value={cycleId} onChange={(e) => { setCycleId(e.target.value); setPage(1); }}>
            <option value="">All cycles</option>
            {(cycles.data?.items ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="SELF_DRAFT">Self draft</option>
            <option value="SELF_SUBMITTED">Self submitted</option>
            <option value="EVALUATOR_DRAFT">Evaluator draft</option>
            <option value="EVALUATOR_SUBMITTED">Evaluator submitted</option>
            <option value="FINALIZED">Finalized</option>
          </Select>
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" checked={myReports} onChange={(e) => { setMyReports(e.target.checked); setPage(1); }} />
          My reports
        </label>
        <div className="relative min-w-0 flex-1">
          <Label>Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Name or code" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
      </FilterBar>

      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Employee", "Number", "Period", "Supervisor", "Self", "Evaluator", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <b>{employeeName(row.employee)}</b>
                  <div className="text-xs text-slate-500">{row.employee.employeeCode} · {row.employee.jobTitle ?? "—"}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.number}</td>
                <td className="px-4 py-3">{formatDate(row.cycle.periodStart)} – {formatDate(row.cycle.periodEnd)}</td>
                <td className="px-4 py-3">{row.employee.supervisor?.name ?? "—"}</td>
                <td className="px-4 py-3">{row.overallSelf ?? "—"}</td>
                <td className="px-4 py-3">{row.overallEvaluator ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/performance/${row.id}`}>Open</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No evaluations match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-slate-500">Page {meta.page} of {meta.totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
