"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  AttendancePhotoLightbox,
  AttendancePhotoThumb,
  locationPhotoTitle,
  locationPhotoType,
  type AttendancePhotoPreview
} from "@/components/attendance/attendance-photo";
import { MonthYearPicker, defaultOpsMonth } from "@/components/ops/month-year-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { Textarea } from "@/components/ui/textarea";
import { operationsApi } from "@/features/operations/operations-api";
import { formatDate, formatDateTime, formatLateMinutes, formatTime, minutesToHours } from "@/lib/utils/format";
import type { Timesheet, Worksheet } from "@/types/operations";

const PAGE_SIZE = 10;

type EmployeePanel = "leave" | "attendance" | "worksheets";

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, "0")}`
  };
}

export function EmployeeOpsHistory({ employeeId, leave }: { employeeId: string; leave: ReactNode }) {
  const [openPanel, setOpenPanel] = useState<EmployeePanel | null>("leave");
  const [month, setMonth] = useState(defaultOpsMonth);
  const [allTime, setAllTime] = useState(false);
  const range = useMemo(() => (allTime ? null : monthRange(month.year, month.month)), [allTime, month]);

  const toggle = (panel: EmployeePanel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const periodFilter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 sm:max-w-md">
        <MonthYearPicker
          year={month.year}
          month={month.month}
          onChange={(next) => {
            setAllTime(false);
            setMonth(next);
          }}
        />
      </div>
      <Button type="button" variant={allTime ? "default" : "outline"} onClick={() => setAllTime((value) => !value)}>
        {allTime ? "Showing all time" : "All time"}
      </Button>
    </div>
  );

  return (
    <div className="mt-6 space-y-4">
      <CollapsibleGadget title="Annual leave" open={openPanel === "leave"} onToggle={() => toggle("leave")}>
        {leave}
      </CollapsibleGadget>
      <EmployeeAttendanceHistory
        employeeId={employeeId}
        from={range?.from}
        to={range?.to}
        open={openPanel === "attendance"}
        onToggle={() => toggle("attendance")}
        periodFilter={periodFilter}
      />
      <EmployeeWorksheetHistory
        employeeId={employeeId}
        from={range?.from}
        to={range?.to}
        open={openPanel === "worksheets"}
        onToggle={() => toggle("worksheets")}
        periodFilter={periodFilter}
      />
    </div>
  );
}

function CollapsibleGadget({
  title,
  open,
  onToggle,
  children
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-slate-50"
        >
          <span className="text-base font-semibold text-slate-900">{title}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
        </button>
      </h3>
      {open ? <CardContent className="space-y-4 pt-0">{children}</CardContent> : null}
    </Card>
  );
}

function EmployeeAttendanceHistory({
  employeeId,
  from,
  to,
  open,
  onToggle,
  periodFilter
}: {
  employeeId: string;
  from?: string;
  to?: string;
  open: boolean;
  onToggle: () => void;
  periodFilter: ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    setPage(1);
  }, [employeeId, from, to]);
  const params = useMemo(() => {
    const p = new URLSearchParams({ employeeId, page: String(page), pageSize: String(PAGE_SIZE) });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [employeeId, page, from, to]);

  const q = useQuery({
    queryKey: ["employee-timesheets", params.toString()],
    queryFn: () => operationsApi.timesheets(params),
    enabled: open
  });

  const items = q.data?.items ?? [];
  const meta = q.data?.meta;

  return (
    <>
      <CollapsibleGadget title="Attendance" open={open} onToggle={onToggle}>
        {periodFilter}
        {q.isLoading ? (
          <Skeleton className="h-48" />
        ) : q.isError ? (
          <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <TableShell>
              <Table>
                <TableHead>
                  <tr>
                    {["Date", "Check in", "Checkout", "Worked", "Late", "Status", ""].map((h) => (
                      <Th key={h || "actions"}>{h}</Th>
                    ))}
                  </tr>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <Td className="whitespace-nowrap">{formatDate(row.workDate)}</Td>
                      <Td className="tabular-nums">{row.actualCheckIn ? formatTime(row.actualCheckIn) : "—"}</Td>
                      <Td className="tabular-nums">{row.actualCheckOut ? formatTime(row.actualCheckOut) : "—"}</Td>
                      <Td className="tabular-nums">{minutesToHours(row.workedMinutes)}</Td>
                      <Td className="tabular-nums">{formatLateMinutes(row.lateMinutes)}</Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                      <Td>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedId(row.id)}>
                          View
                        </Button>
                      </Td>
                    </TableRow>
                  ))}
                  {!items.length && <TableEmpty colSpan={7}>No attendance records for this period.</TableEmpty>}
                </TableBody>
              </Table>
            </TableShell>
            <Pager page={page} meta={meta} onPage={setPage} noun="attendance days" />
          </>
        )}
      </CollapsibleGadget>
      <TimesheetDetailDialog timesheetId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}

function EmployeeWorksheetHistory({
  employeeId,
  from,
  to,
  open,
  onToggle,
  periodFilter
}: {
  employeeId: string;
  from?: string;
  to?: string;
  open: boolean;
  onToggle: () => void;
  periodFilter: ReactNode;
}) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  useEffect(() => {
    setPage(1);
  }, [employeeId, from, to]);
  const params = useMemo(() => {
    const p = new URLSearchParams({ employeeId, page: String(page), pageSize: String(PAGE_SIZE) });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  }, [employeeId, page, from, to]);

  const q = useQuery({
    queryKey: ["employee-worksheets", params.toString()],
    queryFn: () => operationsApi.worksheets(params),
    enabled: open
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
      void qc.invalidateQueries({ queryKey: ["employee-worksheets"] });
      void qc.invalidateQueries({ queryKey: ["worksheet", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const items = q.data?.items ?? [];
  const meta = q.data?.meta;
  const d = detail.data as Worksheet | undefined;

  return (
    <>
      <CollapsibleGadget title="Worksheets" open={open} onToggle={onToggle}>
        {periodFilter}
        {q.isLoading ? (
          <Skeleton className="h-48" />
        ) : q.isError ? (
          <ErrorState message={q.error instanceof Error ? q.error.message : undefined} onRetry={() => void q.refetch()} />
        ) : (
          <>
            <TableShell>
              <Table>
                <TableHead>
                  <tr>
                    {["Date", "Worked", "Description", "Status", ""].map((h) => (
                      <Th key={h || "actions"}>{h}</Th>
                    ))}
                  </tr>
                </TableHead>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <Td className="whitespace-nowrap">{formatDate(row.workDate)}</Td>
                      <Td className="tabular-nums">{minutesToHours(row.timesheet?.workedMinutes)}</Td>
                      <Td className="max-w-md truncate text-slate-600">{row.workDescription || "—"}</Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                      <Td>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setComment("");
                            setSelectedId(row.id);
                          }}
                        >
                          View
                        </Button>
                      </Td>
                    </TableRow>
                  ))}
                  {!items.length && <TableEmpty colSpan={5}>No worksheets for this period.</TableEmpty>}
                </TableBody>
              </Table>
            </TableShell>
            <Pager page={page} meta={meta} onPage={setPage} noun="worksheets" />
          </>
        )}
      </CollapsibleGadget>
      <Dialog
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogTitle>Worksheet</DialogTitle>
          <DialogDescription>{d ? formatDate(d.workDate) : "Loading..."}</DialogDescription>
          {d && (
            <div className="mt-5 space-y-5">
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily work description</div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{d.workDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Worked" value={minutesToHours(d.timesheet?.workedMinutes)} />
                <Stat label="Submitted" value={formatDateTime(d.submittedAt)} />
              </div>
              {d.adminComment ? (
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Admin comment:</span> {d.adminComment}
                </p>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="worksheet-comment">Admin comment</Label>
                <Textarea
                  id="worksheet-comment"
                  placeholder="Optional review comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={d.status === "REVIEWED"}
                />
              </div>
              <div className="flex justify-end">
                <Button disabled={review.isPending || d.status === "REVIEWED"} onClick={() => review.mutate()}>
                  {d.status === "REVIEWED" ? "Already reviewed" : "Mark reviewed"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TimesheetDetailDialog({ timesheetId, onClose }: { timesheetId: string | null; onClose: () => void }) {
  const [photoPreview, setPhotoPreview] = useState<AttendancePhotoPreview[] | null>(null);
  const detail = useQuery({
    queryKey: ["timesheet", timesheetId],
    queryFn: () => operationsApi.timesheet(timesheetId!),
    enabled: !!timesheetId
  });
  const d = detail.data as Timesheet | undefined;

  return (
    <>
      <Dialog open={!!timesheetId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl">
          <DialogTitle>Attendance detail</DialogTitle>
          <DialogDescription>{d ? formatDate(d.workDate) : "Loading details..."}</DialogDescription>
          {d && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Check in" value={d.actualCheckIn ? formatDateTime(d.actualCheckIn) : "—"} />
                <Stat label="Checkout" value={d.actualCheckOut ? formatDateTime(d.actualCheckOut) : "—"} />
                <Stat label="Worked" value={minutesToHours(d.workedMinutes)} />
                <Stat label="Late" value={formatLateMinutes(d.lateMinutes)} />
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
                    d.locations.map((location, index) => {
                      const type = locationPhotoType(location);
                      return (
                        <div className="flex items-center gap-3 rounded-lg border p-3 text-sm" key={index}>
                          <AttendancePhotoThumb url={location.photoUrl} title={locationPhotoTitle(type)} onOpen={setPhotoPreview} />
                          <div>
                            <b>{type.replaceAll("_", " ")}</b>
                            <div className="mt-1 text-slate-500">
                              {location.source === "DESKTOP"
                                ? "Company PC (no GPS)"
                                : `${location.distanceFromOfficeMeters ?? "—"}m from office · accuracy ${location.accuracyMeters ?? "—"}m`}
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
              {d.corrections?.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Corrections</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {d.corrections.map((correction) => (
                      <li key={correction.id}>
                        {formatDateTime(correction.createdAt)} — {correction.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AttendancePhotoLightbox photos={photoPreview} onClose={() => setPhotoPreview(null)} />
    </>
  );
}

function Pager({
  page,
  meta,
  onPage,
  noun
}: {
  page: number;
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
  onPage: (page: number) => void;
  noun: string;
}) {
  const total = meta?.total ?? 0;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        {total} {noun}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {meta?.page ?? page} of {totalPages}
          </span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
