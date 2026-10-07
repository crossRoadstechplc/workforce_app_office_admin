"use client";

import {
  employeeName,
  formatCheckoutDateTime,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatLateMinutes,
  formatLeaveDays,
  minutesToHours
} from "@/lib/utils/format";
import type { AttendanceDayRosterRow, AttendanceMonthSummaryRow, Timesheet } from "@/types/operations";
import { useCleanPrintTitle } from "@/components/performance/evaluation-print-report";

export type AttendancePrintMode = "day" | "month" | "range";

function checkOutSourceLabel(source?: Timesheet["checkOutSource"]) {
  if (source === "EMPLOYEE") return "Employee";
  if (source === "SYSTEM") return "System";
  if (source === "ADMIN") return "Admin";
  return "";
}

function statusLabel(state: string, row: AttendanceDayRosterRow) {
  if (state === "ON_LEAVE") {
    const parts = [row.leave?.label ?? "Approved leave"];
    if (row.leave?.leaveType?.name) parts.push(row.leave.leaveType.name);
    return parts.join(" · ");
  }
  if (state === "PUBLIC_HOLIDAY") return row.holiday?.label ?? row.holiday?.nameEn ?? "Holiday";
  if (state === "NOT_CHECKED_IN") return "Missing check-in";
  return state.replaceAll("_", " ");
}

function periodLabel(mode: AttendancePrintMode, period: string) {
  if (mode === "day") return `Date: ${period}`;
  return `Period: ${period}`;
}

export function AttendancePrintReport({
  mode,
  period,
  officeNames,
  showOffice,
  dayRows,
  periodRows
}: {
  mode: AttendancePrintMode;
  period: string;
  officeNames: string[];
  showOffice: boolean;
  dayRows: AttendanceDayRosterRow[];
  periodRows: AttendanceMonthSummaryRow[];
}) {
  useCleanPrintTitle();
  const officesLine = officeNames.length ? officeNames.join(", ") : "-";

  return (
    <div className="attendance-print-report hidden print:block">
      <header className="att-print-header">
        <p className="att-print-eyebrow">Workforce · Attendance</p>
        <h1>Attendance report</h1>
        <div className="att-print-meta">
          <div>
            <span className="att-print-meta-label">Offices</span>
            <span>{officesLine}</span>
          </div>
          <div>
            <span className="att-print-meta-label">{mode === "day" ? "Date" : "Period"}</span>
            <span>{period}</span>
          </div>
        </div>
      </header>

      {mode === "day" ? (
        <table className="att-print-table">
          <thead>
            <tr>
              <th className="col-no">No.</th>
              <th>Employee</th>
              <th>Code</th>
              {showOffice ? <th>Office</th> : null}
              <th>Check in</th>
              <th>Checkout</th>
              <th>Checkout by</th>
              <th>Late</th>
              <th>Worked</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dayRows.map((row, index) => (
              <tr key={row.employee.id}>
                <td className="num col-no">{index + 1}</td>
                <td>{employeeName(row.employee)}</td>
                <td>{row.employee.employeeCode}</td>
                {showOffice ? <td>{row.office?.name ?? ""}</td> : null}
                <td>{row.timesheet?.actualCheckIn ? formatDateTime(row.timesheet.actualCheckIn) : "Not checked in"}</td>
                <td>{row.timesheet?.actualCheckOut ? formatCheckoutDateTime(row.timesheet) : ""}</td>
                <td>{row.timesheet?.actualCheckOut ? checkOutSourceLabel(row.timesheet.checkOutSource) : ""}</td>
                <td className="num">{row.timesheet ? formatLateMinutes(row.timesheet.lateMinutes) : ""}</td>
                <td className="num">{row.timesheet ? minutesToHours(row.timesheet.workedMinutes) : ""}</td>
                <td>{statusLabel(row.attendanceState, row)}</td>
              </tr>
            ))}
            {!dayRows.length ? (
              <tr>
                <td colSpan={showOffice ? 10 : 9}>No employees match this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      ) : (
        <table className="att-print-table">
          <thead>
            <tr>
              <th className="col-no">No.</th>
              <th>Employee</th>
              <th>Code</th>
              {showOffice ? <th>Office</th> : null}
              <th>Working days</th>
              <th>Present</th>
              <th>Leave</th>
              <th>Holiday</th>
              <th>Late</th>
              <th>No check-in</th>
              <th>Employee checkout</th>
              <th>System checkout</th>
            </tr>
          </thead>
          <tbody>
            {periodRows.map((row, index) => (
              <tr key={row.employee.id}>
                <td className="num col-no">{index + 1}</td>
                <td>{employeeName(row.employee)}</td>
                <td>{row.employee.employeeCode}</td>
                {showOffice ? <td>{row.office?.name ?? ""}</td> : null}
                <td className="num">{row.workingDays}</td>
                <td className="num">{row.presentDays}</td>
                <td className="num">{formatLeaveDays(row.leaveDays)}</td>
                <td className="num">{row.holidayDays ?? 0}</td>
                <td className="num">{row.lateDays}</td>
                <td className="num">{row.missingCheckInDays}</td>
                <td className="num">{row.employeeCheckoutDays}</td>
                <td className="num">{row.systemCheckoutDays}</td>
              </tr>
            ))}
            {!periodRows.length ? (
              <tr>
                <td colSpan={showOffice ? 12 : 11}>No employees match this filter.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}

      <p className="att-print-footer">{periodLabel(mode, period)}</p>
    </div>
  );
}

export function attendancePrintPeriod(mode: AttendancePrintMode, opts: {
  date: string;
  month: { year: number; month: number };
  rangeFrom: string;
  rangeTo: string;
}) {
  if (mode === "day") return formatDate(opts.date);
  if (mode === "month") {
    const start = `${opts.month.year}-${String(opts.month.month).padStart(2, "0")}-01`;
    const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(start));
    return label;
  }
  return formatDateRange(opts.rangeFrom, opts.rangeTo);
}

/** Unique office names for the print header (never “All offices”). */
export function attendancePrintOfficeNames(args: {
  officeId: string;
  catalog: { id: string; name: string }[];
  fallbackNames: string[];
  rowOffices: ({ id?: string; name?: string } | null | undefined)[];
}) {
  if (args.officeId) {
    const match = args.catalog.find((o) => o.id === args.officeId);
    if (match?.name) return [match.name];
  }

  const fromRows = [
    ...new Set(
      args.rowOffices
        .map((o) => o?.name?.trim())
        .filter((n): n is string => !!n)
    )
  ].sort((a, b) => a.localeCompare(b));
  if (fromRows.length) return fromRows;

  if (args.catalog.length) return args.catalog.map((o) => o.name).filter(Boolean);

  return args.fallbackNames.filter(Boolean);
}
