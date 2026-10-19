"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { operationsApi } from "@/features/operations/operations-api";
import { employeeName, formatLateMinutes, formatTime } from "@/lib/utils/format";
import type { AttendanceDayRosterRow } from "@/types/operations";

export type SummaryCategory = "employees" | "checkedIn" | "late" | "onLeave" | "missingCheckout";

const CATEGORY_COPY: Record<SummaryCategory, { title: string; description: string; empty: string }> = {
  employees: {
    title: "Employees",
    description: "Active employees in scope today.",
    empty: "No employees are in scope."
  },
  checkedIn: {
    title: "Checked in",
    description: "Employees currently checked in.",
    empty: "No one is checked in right now."
  },
  late: {
    title: "Late",
    description: "Employees who checked in late today.",
    empty: "No late check-ins today."
  },
  onLeave: {
    title: "On leave",
    description: "Employees on approved leave today.",
    empty: "No one is on leave today."
  },
  missingCheckout: {
    title: "Missing checkout",
    description: "Employees who still need to check out.",
    empty: "No missing checkouts."
  }
};

function matchesCategory(row: AttendanceDayRosterRow, category: SummaryCategory) {
  switch (category) {
    case "employees":
      return true;
    case "checkedIn":
      return Boolean(row.timesheet?.isOpen && !row.timesheet.isMissingCheckout);
    case "late":
      return Boolean(row.timesheet?.isLate);
    case "onLeave":
      return row.attendanceState === "ON_LEAVE";
    case "missingCheckout":
      return Boolean(row.timesheet?.isMissingCheckout);
  }
}

function rowDetail(row: AttendanceDayRosterRow, category: SummaryCategory) {
  if (category === "late" && row.timesheet) {
    return `Late ${formatLateMinutes(row.timesheet.lateMinutes)} · In ${formatTime(row.timesheet.actualCheckIn)}`;
  }
  if (category === "checkedIn" && row.timesheet?.actualCheckIn) {
    return `In ${formatTime(row.timesheet.actualCheckIn)}`;
  }
  if (category === "missingCheckout" && row.timesheet?.actualCheckIn) {
    return `In ${formatTime(row.timesheet.actualCheckIn)}`;
  }
  if (category === "onLeave" && row.leave) {
    const leaveType = row.leave.leaveType?.name;
    return [row.leave.label ?? "Approved leave", leaveType].filter(Boolean).join(" · ");
  }
  if (row.office?.name) return row.office.name;
  return row.employee.department ?? null;
}

export function SummaryEmployeesDialog({
  open,
  onOpenChange,
  category
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: SummaryCategory | null;
}) {
  const date = format(new Date(), "yyyy-MM-dd");
  const copy = category ? CATEGORY_COPY[category] : null;

  const roster = useQuery({
    queryKey: ["attendance-day-roster", "dashboard-summary", date],
    queryFn: () => operationsApi.attendanceDayRoster(new URLSearchParams({ date })),
    enabled: open && !!category,
    staleTime: 30_000
  });

  const rows = useMemo(() => {
    if (!category || !roster.data?.items) return [];
    return roster.data.items.filter((row) => matchesCategory(row, category));
  }, [category, roster.data?.items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>{copy?.title ?? "Employees"}</DialogTitle>
        <DialogDescription>
          {copy?.description ?? "Employees in this summary."}
          {rows.length > 0 ? ` · ${rows.length}` : ""}
        </DialogDescription>

        <div className="mt-4">
          {roster.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : roster.isError ? (
            <ErrorState message="Could not load employees for this summary." onRetry={() => roster.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="Nothing to show" description={copy?.empty ?? "No employees in this category."} />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
              {rows.map((row) => {
                const detail = rowDetail(row, category!);
                return (
                  <li key={row.employee.id} className="flex items-start justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-950">{employeeName(row.employee)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {row.employee.employeeCode}
                        {detail ? ` · ${detail}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={row.attendanceState} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
