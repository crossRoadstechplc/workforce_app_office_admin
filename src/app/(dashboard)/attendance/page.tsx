"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PencilLine, Search } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import {
  AttendancePhotoLightbox,
  AttendancePhotoStack,
  AttendancePhotoThumb,
  locationPhotoTitle,
  locationPhotoType,
  type AttendancePhotoPreview
} from "@/components/attendance/attendance-photo";
import { DateDayPicker, defaultOpsDate } from "@/components/ops/date-day-picker";
import { MonthYearPicker, defaultOpsMonth } from "@/components/ops/month-year-picker";
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
import type { AttendanceDayRosterRow, Timesheet } from "@/types/operations";

export default function AttendancePage() {
  return (
    <TenantOpsGate>
      <AttendancePageInner />
    </TenantOpsGate>
  );
}

function AttendancePageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const showOfficeFilter = !isOfficeAdmin;
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const router = useRouter();
  const qc = useQueryClient();

  const [mode, setMode] = useState<"day" | "month">("day");
  const [date, setDate] = useState(defaultOpsDate);
  const [month, setMonth] = useState(defaultOpsMonth);
  const [officeId, setOfficeId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<string | null>(null);
  const [correction, setCorrection] = useState({ actualCheckIn: "", actualCheckOut: "", reason: "" });
  const [photoPreview, setPhotoPreview] = useState<AttendancePhotoPreview[] | null>(null);

  const dayParams = useMemo(() => {
    const p = new URLSearchParams({ date });
    if (officeId) p.set("officeId", officeId);
    if (status) p.set("status", status);
    return p;
  }, [date, officeId, status]);

  const monthParams = useMemo(() => {
    const p = new URLSearchParams({ year: String(month.year), month: String(month.month) });
    if (officeId) p.set("officeId", officeId);
    return p;
  }, [month, officeId]);

  const dayQuery = useQuery({
    queryKey: ["attendance-day-roster", dayParams.toString()],
    queryFn: () => operationsApi.attendanceDayRoster(dayParams),
    enabled: mode === "day"
  });

  const monthQuery = useQuery({
    queryKey: ["attendance-month-summary", monthParams.toString()],
    queryFn: () => operationsApi.attendanceMonthSummary(monthParams),
    enabled: mode === "month"
  });

  const detail = useQuery({
    queryKey: ["timesheet", selectedTimesheetId],
    queryFn: () => operationsApi.timesheet(selectedTimesheetId!),
    enabled: !!selectedTimesheetId
  });

  const mutate = useMutation({
    mutationFn: () =>
      operationsApi.correctTimesheet(selectedTimesheetId!, {
        actualCheckIn: correction.actualCheckIn ? new Date(correction.actualCheckIn).toISOString() : undefined,
        actualCheckOut: correction.actualCheckOut ? new Date(correction.actualCheckOut).toISOString() : undefined,
        reason: correction.reason
      }),
    onSuccess: () => {
      toast.success("Attendance corrected");
      setCorrection({ actualCheckIn: "", actualCheckOut: "", reason: "" });
      void qc.invalidateQueries({ queryKey: ["attendance-day-roster"] });
      void qc.invalidateQueries({ queryKey: ["timesheet", selectedTimesheetId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const loading = mode === "day" ? dayQuery.isLoading : monthQuery.isLoading;
  if (loading) return <PageSkeleton />;

  const dayItems = (dayQuery.data?.items ?? []).filter((row) => matchesSearch(row.employee, search));
  const monthItems = (monthQuery.data?.items ?? []).filter((row) => matchesSearch(row.employee, search));
  const d = detail.data as Timesheet | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office attendance" : "Attendance"}
        description={
          isOfficeAdmin
            ? `Review daily attendance for ${officeLabel ?? "your assigned offices"}.`
            : "Full employee roster by day, month exception counts, location evidence, and corrections."
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <div className="space-y-1.5">
          <Label>View</Label>
          <div className="flex rounded-lg border p-1">
            <Button type="button" size="sm" variant={mode === "day" ? "default" : "ghost"} onClick={() => setMode("day")}>
              Day
            </Button>
            <Button type="button" size="sm" variant={mode === "month" ? "default" : "ghost"} onClick={() => setMode("month")}>
              Month
            </Button>
          </div>
        </div>
        {mode === "day" ? <DateDayPicker value={date} onChange={setDate} /> : <MonthYearPicker year={month.year} month={month.month} onChange={setMonth} />}
        <OfficeFilter visible={showOfficeFilter} value={officeId} onChange={setOfficeId} />
        {mode === "day" && (
          <div className="min-w-44 space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {[
                "PRESENT_ON_TIME",
                "PRESENT_LATE",
                "COMPLETED_ON_TIME",
                "COMPLETED_LATE",
                "MISSING_CHECKOUT",
                "NOT_CHECKED_IN",
                "ON_LEAVE",
                "NON_WORKING_DAY"
              ].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="relative min-w-56 flex-1">
          <Label>Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {mode === "day" && dayQuery.data && (
        <OpsSummaryStrip
          metrics={[
            { label: "Employees", value: dayQuery.data.counts.totalEmployees },
            { label: "Checked in", value: dayQuery.data.counts.checkedIn, tone: "success" },
            { label: "Not checked in", value: dayQuery.data.counts.notCheckedIn, tone: "warning" },
            { label: "Missing checkout", value: dayQuery.data.counts.missingCheckout, tone: "danger" },
            { label: "On leave", value: dayQuery.data.counts.onLeave }
          ]}
        />
      )}

      {mode === "month" && monthQuery.data && (
        <OpsSummaryStrip
          metrics={[
            { label: "Employees", value: monthQuery.data.counts.totalEmployees },
            { label: "Missing check-in days", value: monthQuery.data.counts.totalMissingCheckInDays, tone: "warning" },
            { label: "Missing checkout days", value: monthQuery.data.counts.totalMissingCheckOutDays, tone: "danger" },
            { label: "Employees missing check-in", value: monthQuery.data.counts.employeesMissingCheckIn },
            { label: "Employees missing checkout", value: monthQuery.data.counts.employeesMissingCheckOut }
          ]}
        />
      )}

      {mode === "day" ? (
        <TableShell>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Photo", "Check in", "Checkout", "Late", "Worked", "Status", ""].map((h) => (
                  <th className="px-4 py-3" key={h || "actions"}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {dayItems.map((row) => (
                <DayRow
                  key={row.employee.id}
                  row={row}
                  showOffice={showOfficeFilter}
                  onView={() => row.timesheet && setSelectedTimesheetId(row.timesheet.id)}
                  onOpenPhoto={setPhotoPreview}
                />
              ))}
              {!dayItems.length && (
                <tr>
                  <td colSpan={showOfficeFilter ? 9 : 8} className="px-4 py-10 text-center text-slate-500">
                    No employees match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableShell>
      ) : (
        <TableShell>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Working days", "Present", "Leave", "Late", "No check-in", "No checkout", ""].map((h) => (
                  <th className="px-4 py-3" key={h || "actions"}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {monthItems.map((row) => (
                <tr key={row.employee.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{employeeName(row.employee)}</div>
                    <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
                  </td>
                  {showOfficeFilter && <td className="px-4 py-3">{row.office?.name ?? "—"}</td>}
                  <td className="px-4 py-3">{row.workingDays}</td>
                  <td className="px-4 py-3">{row.presentDays}</td>
                  <td className="px-4 py-3">{row.leaveDays}</td>
                  <td className="px-4 py-3">{row.lateDays}</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{row.missingCheckInDays}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">{row.missingCheckOutDays}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/employees/${row.employee.id}`)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
              {!monthItems.length && (
                <tr>
                  <td colSpan={showOfficeFilter ? 9 : 8} className="px-4 py-10 text-center text-slate-500">
                    No employees match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableShell>
      )}

      <Dialog open={!!selectedTimesheetId} onOpenChange={(v) => !v && setSelectedTimesheetId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Attendance detail</DialogTitle>
          <DialogDescription>{d ? `${employeeName(d.employee)} · ${formatDate(d.workDate)}` : "Loading details..."}</DialogDescription>
          {d && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat l="Check in" v={formatDateTime(d.actualCheckIn)} />
                <Stat l="Checkout" v={formatDateTime(d.actualCheckOut)} />
                <Stat l="Worked" v={minutesToHours(d.workedMinutes)} />
                <Stat l="Late" v={`${d.lateMinutes} min`} />
              </div>
              {d.lateReason && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm">
                  <b>Late reason:</b> {d.lateReason.reasonType}
                  {d.lateReason.reasonDescription ? ` — ${d.lateReason.reasonDescription}` : ""}
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Photos & location</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {d.locations?.length ? (
                    d.locations.map((l, i) => {
                      const type = locationPhotoType(l);
                      return (
                        <div className="flex items-center gap-3 rounded-lg border p-3 text-sm" key={i}>
                          <AttendancePhotoThumb
                            url={l.photoUrl}
                            title={locationPhotoTitle(type)}
                            onOpen={setPhotoPreview}
                          />
                          <div>
                            <b>{type.replaceAll("_", " ")}</b>
                            <div className="mt-1 text-slate-500">
                              {l.distanceFromOfficeMeters}m from office · accuracy {l.accuracyMeters}m
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No location or photo evidence for this timesheet.</p>
                  )}
                </div>
              </div>
              <div className="border-t pt-5">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <PencilLine className="size-4" />
                  Correct attendance
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Correct check-in">
                    <Input type="datetime-local" value={correction.actualCheckIn} onChange={(e) => setCorrection({ ...correction, actualCheckIn: e.target.value })} />
                  </Field>
                  <Field label="Correct checkout">
                    <Input type="datetime-local" value={correction.actualCheckOut} onChange={(e) => setCorrection({ ...correction, actualCheckOut: e.target.value })} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Correction reason">
                      <Textarea value={correction.reason} onChange={(e) => setCorrection({ ...correction, reason: e.target.value })} />
                    </Field>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    disabled={mutate.isPending || correction.reason.length < 5 || (!correction.actualCheckIn && !correction.actualCheckOut)}
                    onClick={() => mutate.mutate()}
                  >
                    Apply correction
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AttendancePhotoLightbox photos={photoPreview} onClose={() => setPhotoPreview(null)} />
    </div>
  );
}

function DayRow({
  row,
  showOffice,
  onView,
  onOpenPhoto
}: {
  row: AttendanceDayRosterRow;
  showOffice: boolean;
  onView: () => void;
  onOpenPhoto: (photos: AttendancePhotoPreview[]) => void;
}) {
  const photos: AttendancePhotoPreview[] = [
    row.timesheet?.checkInPhotoUrl ? { url: row.timesheet.checkInPhotoUrl, title: "Check-in photo" } : null,
    row.timesheet?.checkOutPhotoUrl ? { url: row.timesheet.checkOutPhotoUrl, title: "Check-out photo" } : null
  ].filter((photo): photo is AttendancePhotoPreview => photo !== null);

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <div className="font-medium">{employeeName(row.employee)}</div>
        <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
      </td>
      {showOffice && <td className="px-4 py-3">{row.office?.name ?? "—"}</td>}
      <td className="px-4 py-3">
        <AttendancePhotoStack photos={photos} onOpen={onOpenPhoto} />
      </td>
      <td className="px-4 py-3">{formatDateTime(row.timesheet?.actualCheckIn)}</td>
      <td className="px-4 py-3">{formatDateTime(row.timesheet?.actualCheckOut)}</td>
      <td className="px-4 py-3">{row.timesheet ? `${row.timesheet.lateMinutes}m` : "—"}</td>
      <td className="px-4 py-3">{minutesToHours(row.timesheet?.workedMinutes)}</td>
      <td className="px-4 py-3">
        <StatusBadge status={row.attendanceState} />
      </td>
      <td className="px-4 py-3">
        {row.timesheet ? (
          <Button size="sm" variant="ghost" onClick={onView}>
            View
          </Button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}

function matchesSearch(employee: { firstName?: string; lastName?: string; employeeCode?: string }, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return `${employee.firstName ?? ""} ${employee.lastName ?? ""} ${employee.employeeCode ?? ""}`.toLowerCase().includes(q);
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
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{l}</div>
      <div className="mt-1 font-semibold">{v}</div>
    </div>
  );
}
