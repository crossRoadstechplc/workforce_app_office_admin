"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { DateDayPicker, defaultOpsDate } from "@/components/ops/date-day-picker";
import { OfficeFilter } from "@/components/ops/office-filter";
import { OpsSummaryStrip } from "@/components/ops/ops-summary-strip";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { Textarea } from "@/components/ui/textarea";
import { operationsApi } from "@/features/operations/operations-api";
import { employeeName, formatDate, formatDateTime } from "@/lib/utils/format";
import type { LeaveRequest } from "@/types/operations";

export default function LeavePage() {
  return (
    <TenantOpsGate>
      <LeavePageInner />
    </TenantOpsGate>
  );
}

function LeavePageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const showOfficeFilter = !isOfficeAdmin;
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const qc = useQueryClient();

  const [date, setDate] = useState(defaultOpsDate);
  const [officeId, setOfficeId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams({ date });
    if (officeId) p.set("officeId", officeId);
    if (status) p.set("status", status);
    return p;
  }, [date, officeId, status]);

  const q = useQuery({
    queryKey: ["leave-day-roster", params.toString()],
    queryFn: () => operationsApi.leaveDayRoster(params)
  });

  const detail = useQuery({
    queryKey: ["leave", selectedId],
    queryFn: () => operationsApi.leave(selectedId!),
    enabled: !!selectedId
  });

  const approve = useMutation({
    mutationFn: () => operationsApi.approveLeave(selectedId!, reason || undefined),
    onSuccess: () => done("Leave approved"),
    onError: (e: Error) => toast.error(e.message)
  });
  const reject = useMutation({
    mutationFn: () => operationsApi.rejectLeave(selectedId!, reason),
    onSuccess: () => done("Leave rejected"),
    onError: (e: Error) => toast.error(e.message)
  });

  function done(message: string) {
    toast.success(message);
    setReason("");
    setSelectedId(null);
    void qc.invalidateQueries({ queryKey: ["leave-day-roster"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (q.isLoading) return <PageSkeleton />;

  const items = (q.data?.items ?? []).filter((row) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${row.employee.firstName} ${row.employee.lastName} ${row.employee.employeeCode}`.toLowerCase().includes(needle);
  });
  const d = detail.data as LeaveRequest | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office leave" : "Leave"}
        description={
          isOfficeAdmin
            ? `See leave status for every employee in ${officeLabel ?? "your assigned offices"}.`
            : "Full employee leave roster for the selected day, with review and decision history."
        }
      />

      {q.data && (
        <OpsSummaryStrip
          metrics={[
            { label: "Employees", value: q.data.counts.totalEmployees },
            { label: "On leave", value: q.data.counts.onLeave, tone: "success" },
            { label: "Pending", value: q.data.counts.pending, tone: "warning" },
            { label: "No leave", value: q.data.counts.none }
          ]}
        />
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <DateDayPicker value={date} onChange={setDate} />
        <OfficeFilter visible={showOfficeFilter} value={officeId} onChange={setOfficeId} />
        <div className="min-w-44 space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["ON_LEAVE", "PENDING", "NONE", "REJECTED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="relative min-w-56 flex-1">
          <Label>Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Type", "Dates", "Days", "Reason", "Status", ""].map((h) => (
                <th key={h || "actions"} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((row) => (
              <tr key={row.employee.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <b>{employeeName(row.employee)}</b>
                  <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
                </td>
                {showOfficeFilter && <td className="px-4 py-3">{row.office?.name ?? "—"}</td>}
                <td className="px-4 py-3">{row.leave?.leaveType.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {row.leave ? `${formatDate(row.leave.startDate)} – ${formatDate(row.leave.endDate)}` : "—"}
                </td>
                <td className="px-4 py-3">{row.leave ? String(row.leave.numberOfDays) : "—"}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">{row.leave?.reason ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.leaveState} />
                </td>
                <td className="px-4 py-3">
                  {row.leave ? (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.leave!.id)}>
                      Review
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={showOfficeFilter ? 8 : 7} className="px-4 py-10 text-center text-slate-500">
                  No employees match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Leave request</DialogTitle>
          <DialogDescription>{d ? `${employeeName(d.employee)} · ${d.leaveType.name}` : "Loading..."}</DialogDescription>
          {d && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info l="Dates" v={`${formatDate(d.startDate)} – ${formatDate(d.endDate)}`} />
                <Info l="Days" v={String(d.numberOfDays)} />
                <Info l="Status" v={d.status} />
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">Employee reason</div>
                <p className="mt-2 text-sm leading-6">{d.reason}</p>
              </div>
              {d.decisions?.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Decision history</h3>
                  {d.decisions.map((x) => (
                    <div key={x.id} className="mb-2 rounded-lg border p-3 text-sm">
                      <b>{x.decision}</b> · {formatDateTime(x.decidedAt)}
                      <div className="mt-1 text-slate-500">{x.decisionReason || "No decision reason"}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {d.status === "PENDING" && (
                <>
                  <div>
                    <Label>Decision reason</Label>
                    <Textarea
                      className="mt-1.5"
                      placeholder="Required for rejection; optional for approval"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="danger" disabled={reject.isPending || reason.trim().length < 5} onClick={() => reject.mutate()}>
                      <XCircle className="size-4" />
                      Reject
                    </Button>
                    <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
                      <CheckCircle2 className="size-4" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-slate-500">{l}</div>
      <div className="mt-1 font-semibold">{v}</div>
    </div>
  );
}
