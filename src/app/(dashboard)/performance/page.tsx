"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart2, Plus, Search, Settings2, X } from "lucide-react";
import { NewEvaluationDialog } from "@/components/performance/new-evaluation-dialog";
import { ExportEvaluationsDialog } from "@/components/performance/export-evaluations-dialog";
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
import { employeeName, formatDate, formatDateRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

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
  const [newOpen, setNewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportIds, setExportIds] = useState<string[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
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
  const cycles = useQuery({
    queryKey: ["evaluation-cycles", "dropdown"],
    queryFn: () => performanceApi.cycles(new URLSearchParams({ page: "1", pageSize: "100" }))
  });

  if (q.isLoading) return <PageSkeleton />;
  const items = q.data?.items ?? [];
  const counts = q.data?.counts;
  const meta = q.data?.meta;

  const pageIds = items.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id));
  const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected;

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function togglePage(checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return Array.from(next);
      }
      return prev.filter((id) => !pageIds.includes(id));
    });
  }

  function startExport(ids: string[]) {
    if (!ids.length) return;
    setExportIds(ids);
    setExportOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office performance" : "Performance"}
        action={
          <div className="flex gap-2">
            {!isOfficeAdmin ? (
              <>
                <Button onClick={() => setNewOpen(true)}>
                  <Plus className="size-4" />
                  New evaluation
                </Button>
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
              </>
            ) : null}
          </div>
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
            {(cycles.data?.items ?? [])
              .filter((c) => c.status === "OPEN" || c.status === "CLOSED")
              .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status === "OPEN" ? "Open" : "Closed"})
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

      {selectedIds.length > 0 && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="text-sm text-slate-700">
            <span className="font-semibold text-slate-950">{selectedIds.length}</span> selected
            {selectedOnPage.length > 0 && selectedOnPage.length !== selectedIds.length ? (
              <span className="text-slate-500"> · {selectedOnPage.length} on this page</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => startExport(selectedIds)}>
              <Download className="size-4" />
              Download PDF{selectedIds.length > 1 ? "s" : ""}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              <X className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      )}

      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected;
                  }}
                  onChange={(e) => togglePage(e.target.checked)}
                  disabled={!items.length}
                />
              </th>
              {["Employee", "Number", "Period", "Supervisor", "Self", "Evaluator", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((row) => {
              const checked = selectedIds.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={cn("hover:bg-slate-50", checked && "bg-slate-50/80")}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${employeeName(row.employee)}`}
                      checked={checked}
                      onChange={() => toggleOne(row.id, checked)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <b>{employeeName(row.employee)}</b>
                    <div className="text-xs text-slate-500">{row.employee.employeeCode} · {row.employee.jobTitle ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.number}</td>
                  <td className="px-4 py-3">{formatDateRange(row.cycle.periodStart, row.cycle.periodEnd)}</td>
                  <td className="px-4 py-3">{row.employee.supervisor?.name ?? ""}</td>
                  <td className="px-4 py-3">{row.overallSelf == null ? "" : `${row.overallSelf}/50`}</td>
                  <td className="px-4 py-3">{row.overallEvaluator == null ? "" : `${row.overallEvaluator}/50`}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Download PDF"
                        onClick={() => startExport([row.id])}
                      >
                        <Download className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/performance/${row.id}`}>Open</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No evaluations match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>
      <NewEvaluationDialog open={newOpen} onOpenChange={setNewOpen} />
      <ExportEvaluationsDialog
        open={exportOpen}
        onOpenChange={(open) => {
          setExportOpen(open);
          if (!open) setExportIds([]);
        }}
        ids={exportIds}
      />
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
