"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
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
import { employeeName, formatDate, formatDateTime, minutesToHours } from "@/lib/utils/format";
import type { Worksheet } from "@/types/operations";

export default function WorksheetsPage() {
  return (
    <TenantOpsGate>
      <WorksheetsPageInner />
    </TenantOpsGate>
  );
}

function WorksheetsPageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const showOfficeFilter = !isOfficeAdmin;
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const qc = useQueryClient();

  const [date, setDate] = useState(defaultOpsDate);
  const [officeId, setOfficeId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const params = useMemo(() => {
    const p = new URLSearchParams({ date });
    if (officeId) p.set("officeId", officeId);
    if (status) p.set("status", status);
    return p;
  }, [date, officeId, status]);

  const q = useQuery({
    queryKey: ["worksheet-day-roster", params.toString()],
    queryFn: () => operationsApi.worksheetDayRoster(params)
  });

  const detail = useQuery({
    queryKey: ["worksheet", selectedId],
    queryFn: () => operationsApi.worksheet(selectedId!),
    enabled: !!selectedId
  });

  const review = useMutation({
    mutationFn: () => operationsApi.reviewWorksheet(selectedId!, { adminComment: comment || undefined }),
    onSuccess: () => {
      toast.success("Worksheet marked reviewed");
      setComment("");
      void qc.invalidateQueries({ queryKey: ["worksheet-day-roster"] });
      void qc.invalidateQueries({ queryKey: ["worksheet", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;

  const items = (q.data?.items ?? []).filter((row) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${row.employee.firstName} ${row.employee.lastName} ${row.employee.employeeCode}`.toLowerCase().includes(needle);
  });
  const d = detail.data as Worksheet | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office worksheets" : "Worksheets"}
        description={
          isOfficeAdmin
            ? `See worksheet submissions for every employee in ${officeLabel ?? "your assigned offices"}.`
            : "Full employee worksheet roster for the selected day, including missing submissions."
        }
      />

      {q.data && (
        <OpsSummaryStrip
          metrics={[
            { label: "Employees", value: q.data.counts.totalEmployees },
            { label: "Submitted", value: q.data.counts.submitted, tone: "warning" },
            { label: "Reviewed", value: q.data.counts.reviewed, tone: "success" },
            { label: "Missing", value: q.data.counts.missing, tone: "danger" }
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
            {["MISSING", "SUBMITTED", "REVIEWED"].map((s) => (
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
              {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Worked", "Description", "Status", ""].map((h) => (
                <th className="px-4 py-3" key={h || "actions"}>
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
                <td className="px-4 py-3">{minutesToHours(row.timesheet?.workedMinutes)}</td>
                <td className="max-w-md truncate px-4 py-3 text-slate-600">{row.worksheet?.workDescription ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.worksheetState} />
                </td>
                <td className="px-4 py-3">
                  {row.worksheet ? (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedId(row.worksheet!.id)}>
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
                <td colSpan={showOfficeFilter ? 6 : 5} className="px-4 py-10 text-center text-slate-500">
                  No employees match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

      <Dialog open={!!selectedId} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Worksheet review</DialogTitle>
          <DialogDescription>{d ? `${employeeName(d.employee)} · ${formatDate(d.workDate)}` : "Loading..."}</DialogDescription>
          {d && (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily work description</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{d.workDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat l="Worked" v={minutesToHours(d.timesheet?.workedMinutes)} />
                <Stat l="Submitted" v={formatDateTime(d.submittedAt)} />
              </div>
              <Field label="Admin comment">
                <Textarea placeholder="Optional review comment" value={comment} onChange={(e) => setComment(e.target.value)} />
              </Field>
              <div className="flex justify-end">
                <Button disabled={review.isPending || d.status === "REVIEWED"} onClick={() => review.mutate()}>
                  {d.status === "REVIEWED" ? "Already reviewed" : "Mark reviewed"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-40 space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-slate-500">{l}</div>
      <div className="mt-1 font-semibold">{v}</div>
    </div>
  );
}
