import { apiFetch } from "@/lib/api/api-client";
import type {
  AttendanceCorrectnessRequestRow,
  AttendanceDayRoster,
  AttendanceMonthSummary,
  AttendanceRangeSummary,
  LeaveDayRoster,
  HistoryList,
  LeaveRequest,
  LeaveRequestList,
  Timesheet,
  Worksheet,
  WorksheetDayRoster,
  HolidayCatalogResponse,
  HolidayDetail,
  HolidayApplyResult,
  HolidayCustomCreateResult,
  HolidayAutoApplyResult
} from "@/types/operations";

const d = <T>(v: any): T => (v?.data ?? v) as T;

export const operationsApi = {
  timesheets: async (params: URLSearchParams) => d<HistoryList<Timesheet>>(await apiFetch<any>(`/admin/timesheets?${params}`)),
  timesheet: async (id: string) => d<Timesheet>(await apiFetch<any>(`/admin/timesheets/${id}`)),
  correctTimesheet: async (id: string, input: { actualCheckIn?: string; actualCheckOut?: string; reason: string }) =>
    d<Timesheet>(await apiFetch<any>(`/admin/timesheets/${id}/correct`, { method: "POST", body: JSON.stringify(input) })),
  attendanceDayRoster: async (params: URLSearchParams) =>
    d<AttendanceDayRoster>(await apiFetch<any>(`/admin/attendance/day-roster?${params}`)),
  attendanceMonthSummary: async (params: URLSearchParams) =>
    d<AttendanceMonthSummary>(await apiFetch<any>(`/admin/attendance/month-summary?${params}`)),
  attendanceRangeSummary: async (params: URLSearchParams) =>
    d<AttendanceRangeSummary>(await apiFetch<any>(`/admin/attendance/range-summary?${params}`)),
  attendanceConfig: async () =>
    d<{
      photoRequiredEnabled: boolean;
      photoRequired: boolean;
      photosAvailable: boolean;
      desktopSkipLocationEnabled: boolean;
      autoCheckoutEnabled: boolean;
      autoCheckoutTime: string;
    }>(await apiFetch<any>("/admin/attendance/config")),
  updateAttendanceConfig: async (input: {
    photoRequiredEnabled?: boolean;
    desktopSkipLocationEnabled?: boolean;
    autoCheckoutEnabled?: boolean;
    autoCheckoutTime?: string;
  }) =>
    d<{
      photoRequiredEnabled: boolean;
      photoRequired: boolean;
      photosAvailable: boolean;
      desktopSkipLocationEnabled: boolean;
      autoCheckoutEnabled: boolean;
      autoCheckoutTime: string;
    }>(await apiFetch<any>("/admin/attendance/config", { method: "PATCH", body: JSON.stringify(input) })),
  approveCorrectnessRequest: async (id: string, adminNote?: string) =>
    d<any>(await apiFetch<any>(`/admin/attendance/correctness-requests/${id}/approve`, { method: "POST", body: JSON.stringify({ adminNote }) })),
  rejectCorrectnessRequest: async (id: string, adminNote?: string) =>
    d<any>(await apiFetch<any>(`/admin/attendance/correctness-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNote }) })),
  correctnessRequests: async (params: URLSearchParams) =>
    d<AttendanceCorrectnessRequestRow[]>(await apiFetch<any>(`/admin/attendance/correctness-requests?${params}`)),
  worksheets: async (params: URLSearchParams) => d<HistoryList<Worksheet>>(await apiFetch<any>(`/admin/worksheets?${params}`)),
  worksheetDayRoster: async (params: URLSearchParams) =>
    d<WorksheetDayRoster>(await apiFetch<any>(`/admin/worksheets/day-roster?${params}`)),
  worksheet: async (id: string) => d<Worksheet>(await apiFetch<any>(`/admin/worksheets/${id}`)),
  reviewWorksheet: async (id: string, input: { adminComment?: string }) =>
    d<Worksheet>(await apiFetch<any>(`/admin/worksheets/${id}/review`, { method: "POST", body: JSON.stringify(input) })),
  leaves: async (params: URLSearchParams) => d<LeaveRequestList>(await apiFetch<any>(`/admin/leave-requests?${params}`)),
  leaveDayRoster: async (params: URLSearchParams) =>
    d<LeaveDayRoster>(await apiFetch<any>(`/admin/leave/day-roster?${params}`)),
  leave: async (id: string) => d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}`)),
  approveLeave: async (id: string, reason?: string) =>
    d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}/approve`, { method: "POST", body: JSON.stringify({ reason }) })),
  rejectLeave: async (id: string, reason: string) =>
    d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) })),
  holidays: async (params?: URLSearchParams) =>
    d<HolidayCatalogResponse>(await apiFetch<any>(`/admin/holidays${params ? `?${params}` : ""}`)),
  holiday: async (key: string, year?: number) => {
    const p = new URLSearchParams();
    if (year) p.set("year", String(year));
    const q = p.toString();
    return d<HolidayDetail>(await apiFetch<any>(`/admin/holidays/${encodeURIComponent(key)}${q ? `?${q}` : ""}`));
  },
  applyHoliday: async (input: {
    kenatKey?: string;
    holidayId?: string;
    year?: number;
    officeId?: string | null;
    employeeIds?: string[];
    notify?: boolean;
    message?: string | null;
  }) => d<HolidayApplyResult>(await apiFetch<any>("/admin/holidays/apply", { method: "POST", body: JSON.stringify(input) })),
  createCustomHoliday: async (input: {
    nameEn: string;
    nameAm?: string | null;
    description?: string | null;
    gregorianDates: string[];
    linkedKenatKey?: string | null;
    officeId?: string | null;
    employeeIds?: string[];
    notify?: boolean;
    message?: string | null;
    applyNow?: boolean;
    autoApply?: boolean;
  }) => d<HolidayCustomCreateResult>(await apiFetch<any>("/admin/holidays/custom", { method: "POST", body: JSON.stringify(input) })),
  setHolidayAutoApply: async (input: {
    kenatKey?: string;
    holidayId?: string;
    year?: number;
    autoApply: boolean;
    notify?: boolean;
    message?: string | null;
    officeId?: string | null;
    employeeIds?: string[];
  }) => d<HolidayAutoApplyResult>(await apiFetch<any>("/admin/holidays/auto-apply", { method: "POST", body: JSON.stringify(input) })),
  holidayApplication: async (id: string) => d<any>(await apiFetch<any>(`/admin/holidays/applications/${id}`))
};
