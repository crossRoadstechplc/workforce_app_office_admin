"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Camera, Search } from "lucide-react";
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
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { operationsApi } from "@/features/operations/operations-api";
import { employeeName, formatDate, formatDateTime, formatLeaveDays, minutesToHours } from "@/lib/utils/format";
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
  const [selectedCorrectnessRequestId, setSelectedCorrectnessRequestId] = useState<string | null>(null);
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

  const configQuery = useQuery({
    queryKey: ["attendance-config"],
    queryFn: () => operationsApi.attendanceConfig()
  });

  const configMutate = useMutation({
    mutationFn: (photoRequiredEnabled: boolean) => operationsApi.updateAttendanceConfig({ photoRequiredEnabled }),
    onSuccess: (data) => {
      toast.success("Setting saved");
      qc.setQueryData(["attendance-config"], data);
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const detail = useQuery({
    queryKey: ["timesheet", selectedTimesheetId],
    queryFn: () => operationsApi.timesheet(selectedTimesheetId!),
    enabled: !!selectedTimesheetId
  });

  const decision = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve" ? operationsApi.approveCorrectnessRequest(id) : operationsApi.rejectCorrectnessRequest(id),
    onSuccess: () => {
      toast.success("Request updated");
      setSelectedCorrectnessRequestId(null);
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
    <div className="min-w-0 space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office attendance" : "Attendance"}
        description={
          isOfficeAdmin
            ? `Review daily attendance for ${officeLabel ?? "your assigned offices"}.`
            : "Full employee roster by day, month exception counts, location evidence, and corrections."
        }
      />

      {configQuery.data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="size-4 text-slate-500" />
              Check-in / check-out photos
            </CardTitle>
            {showOfficeFilter ? (
              <button
                type="button"
                role="switch"
                aria-checked={configQuery.data.photoRequiredEnabled}
                aria-label="Check-in and check-out photos"
                disabled={configMutate.isPending}
                onClick={() => configMutate.mutate(!configQuery.data!.photoRequiredEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
                  configQuery.data.photoRequiredEnabled ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                    configQuery.data.photoRequiredEnabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            ) : (
              <span
                className={`size-2.5 shrink-0 rounded-full ${configQuery.data.photoRequired ? "bg-blue-600" : "bg-slate-300"}`}
                aria-label={configQuery.data.photoRequired ? "Enabled" : "Disabled"}
              />
            )}
          </CardHeader>
        </Card>
      )}

      <FilterBar>
        <div className="space-y-1.5">
          <Label>View</Label>
          <div className="flex rounded-lg border p-1">
            <Button type="button" size="sm" className="flex-1" variant={mode === "day" ? "default" : "ghost"} onClick={() => setMode("day")}>
              Day
            </Button>
            <Button type="button" size="sm" className="flex-1" variant={mode === "month" ? "default" : "ghost"} onClick={() => setMode("month")}>
              Month
            </Button>
          </div>
        </div>
        {mode === "day" ? <DateDayPicker value={date} onChange={setDate} /> : <MonthYearPicker year={month.year} month={month.month} onChange={setMonth} />}
        <OfficeFilter visible={showOfficeFilter} value={officeId} onChange={setOfficeId} />
        {mode === "day" && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {[
                "PRESENT_ON_TIME",
                "PRESENT_LATE",
                "COMPLETED_ON_TIME",
                "COMPLETED_LATE",
                "NOT_CHECKED_IN",
                "ON_LEAVE",
                "NON_WORKING_DAY",
                "CORRECTNESS_PENDING",
                "CORRECTNESS_APPROVED",
                "CORRECTNESS_REJECTED"
              ].map((s) => (
                <option key={s} value={s}>
                  {s === "ON_LEAVE" ? "Approved leave" : s === "NOT_CHECKED_IN" ? "Missing check-in" : s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="relative min-w-0 flex-1 xl:min-w-56">
          <Label>Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </FilterBar>

      {mode === "day" && dayQuery.data && (
        <OpsSummaryStrip
          metrics={[
            { label: "Employees", value: dayQuery.data.counts.totalEmployees },
            { label: "Checked in", value: dayQuery.data.counts.checkedIn, tone: "success" },
            { label: "Not checked in", value: dayQuery.data.counts.notCheckedIn, tone: "warning" },
            { label: "Pending requests", value: dayQuery.data.counts.correctnessPending, tone: "warning" },
            { label: "Approved leave", value: dayQuery.data.counts.onLeave }
          ]}
        />
      )}

      {mode === "month" && monthQuery.data && (
        <OpsSummaryStrip
          metrics={[
            { label: "Employees", value: monthQuery.data.counts.totalEmployees },
            { label: "Missing check-in days", value: monthQuery.data.counts.totalMissingCheckInDays, tone: "warning" },
            { label: "Employees missing check-in", value: monthQuery.data.counts.employeesMissingCheckIn }
          ]}
        />
      )}

      {mode === "day" ? (
        <TableShell>
          <Table>
            <TableHead>
              <tr>
                {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Photo", "Check in", "Checkout", "Late", "Worked", "Status", "Correctness", ""].map((h) => (
                  <Th key={h || "actions"}>{h}</Th>
                ))}
              </tr>
            </TableHead>
            <TableBody>
              {dayItems.map((row) => (
                <DayRow
                  key={row.employee.id}
                  row={row}
                  showOffice={showOfficeFilter}
                  deciding={decision.isPending}
                  onApprove={(id) => decision.mutate({ id, action: "approve" })}
                  onReject={(id) => decision.mutate({ id, action: "reject" })}
                  onView={() => {
                    if (row.timesheet) setSelectedTimesheetId(row.timesheet.id);
                    setSelectedCorrectnessRequestId(row.correctnessRequestId ?? null);
                  }}
                  onOpenPhoto={setPhotoPreview}
                />
              ))}
              {!dayItems.length && <TableEmpty colSpan={showOfficeFilter ? 10 : 9}>No employees match this filter.</TableEmpty>}
            </TableBody>
          </Table>
        </TableShell>
      ) : (
        <TableShell>
          <Table>
            <TableHead>
              <tr>
                {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Working days", "Present", "Leave", "Late", "No check-in", ""].map((h) => (
                  <Th key={h || "actions"}>{h}</Th>
                ))}
              </tr>
            </TableHead>
            <TableBody>
              {monthItems.map((row) => (
                <TableRow key={row.employee.id}>
                  <Td>
                    <div className="font-medium">{employeeName(row.employee)}</div>
                    <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
                  </Td>
                  {showOfficeFilter && <Td>{row.office?.name ?? "—"}</Td>}
                  <Td className="tabular-nums">{row.workingDays}</Td>
                  <Td className="tabular-nums">{row.presentDays}</Td>
                  <Td className="tabular-nums">{formatLeaveDays(row.leaveDays)}</Td>
                  <Td className="tabular-nums">{row.lateDays}</Td>
                  <Td className="font-semibold tabular-nums text-amber-700">{row.missingCheckInDays}</Td>
                  <Td>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/employees/${row.employee.id}`)}>
                      Open
                    </Button>
                  </Td>
                </TableRow>
              ))}
              {!monthItems.length && <TableEmpty colSpan={showOfficeFilter ? 8 : 7}>No employees match this filter.</TableEmpty>}
            </TableBody>
          </Table>
        </TableShell>
      )}

      <Dialog
        open={!!selectedTimesheetId || !!selectedCorrectnessRequestId}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedTimesheetId(null);
            setSelectedCorrectnessRequestId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogTitle>Attendance detail</DialogTitle>
          <DialogDescription>{d ? `${employeeName(d.employee)} · ${formatDate(d.workDate)}` : "Loading details..."}</DialogDescription>
          {d && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat l="Check in" v={d.actualCheckIn ? formatDateTime(d.actualCheckIn) : "—"} />
                <Stat l="Checkout" v={d.actualCheckOut ? formatDateTime(d.actualCheckOut) : "—"} />
                <Stat l="Worked" v={minutesToHours(d.workedMinutes)} />
                <Stat l="Late" v={d.lateMinutes > 0 ? `${d.lateMinutes} min` : "—"} />
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
              {selectedCorrectnessRequestId && (
                <div className="flex justify-end gap-2 border-t pt-5">
                  <Button
                    variant="secondary"
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: selectedCorrectnessRequestId, action: "reject" })}
                  >
                    Reject
                  </Button>
                  <Button
                    disabled={decision.isPending}
                    onClick={() => decision.mutate({ id: selectedCorrectnessRequestId, action: "approve" })}
                  >
                    Accept
                  </Button>
                </div>
              )}
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
  onOpenPhoto,
  onApprove,
  onReject,
  deciding
}: {
  row: AttendanceDayRosterRow;
  showOffice: boolean;
  onView: () => void;
  onOpenPhoto: (photos: AttendancePhotoPreview[]) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  deciding: boolean;
}) {
  const photos: AttendancePhotoPreview[] = [
    row.timesheet?.checkInPhotoUrl ? { url: row.timesheet.checkInPhotoUrl, title: "Check-in photo" } : null,
    row.timesheet?.checkOutPhotoUrl ? { url: row.timesheet.checkOutPhotoUrl, title: "Check-out photo" } : null
  ].filter((photo): photo is AttendancePhotoPreview => photo !== null);

  return (
    <TableRow>
      <Td>
        <div className="font-medium">{employeeName(row.employee)}</div>
        <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
      </Td>
      {showOffice && <Td>{row.office?.name ?? "—"}</Td>}
      <Td>
        <AttendancePhotoStack photos={photos} onOpen={onOpenPhoto} />
      </Td>
      <Td>
        {row.timesheet?.actualCheckIn ? (
          formatDateTime(row.timesheet.actualCheckIn)
        ) : (
          <span className="text-slate-500">Not checked in</span>
        )}
      </Td>
      <Td>
        {row.timesheet?.actualCheckOut ? formatDateTime(row.timesheet.actualCheckOut) : "—"}
      </Td>
      <Td className="tabular-nums">{row.timesheet ? (row.timesheet.lateMinutes > 0 ? `${row.timesheet.lateMinutes}m` : "—") : "—"}</Td>
      <Td className="tabular-nums">{row.timesheet ? minutesToHours(row.timesheet.workedMinutes) : "—"}</Td>
      <Td>
        <div className="space-y-1">
          <StatusBadge status={row.attendanceState} />
          {row.attendanceState === "ON_LEAVE" && row.leave ? (
            <div className="text-xs text-violet-700">
              {row.leave.label ?? "Approved leave"}
              {row.leave.leaveType?.name ? ` · ${row.leave.leaveType.name}` : ""}
            </div>
          ) : null}
        </div>
      </Td>
      <Td>
        {row.correctnessStatus ? <StatusBadge status={row.correctnessStatus} /> : "—"}
      </Td>
      <Td>
        {row.correctnessStatus === "PENDING" && row.correctnessRequestId ? (
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" disabled={deciding} onClick={() => onReject(row.correctnessRequestId!)}>
              Reject
            </Button>
            <Button size="sm" disabled={deciding} onClick={() => onApprove(row.correctnessRequestId!)}>
              Accept
            </Button>
          </div>
        ) : row.timesheet || row.correctnessRequestId ? (
          <Button size="sm" variant="ghost" onClick={onView}>
            View
          </Button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </Td>
    </TableRow>
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
