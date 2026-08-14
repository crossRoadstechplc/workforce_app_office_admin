import { apiFetch } from "@/lib/api/api-client";
import type {
  AttendanceDayRoster,
  AttendanceMonthSummary,
  LeaveDayRoster,
  LeaveRequest,
  LeaveRequestList,
  Timesheet,
  Worksheet,
  WorksheetDayRoster
} from "@/types/operations";

const d = <T>(v: any): T => (v?.data ?? v) as T;

export const operationsApi = {
  timesheets: async (params: URLSearchParams) => d<any>(await apiFetch<any>(`/admin/timesheets?${params}`)),
  timesheet: async (id: string) => d<Timesheet>(await apiFetch<any>(`/admin/timesheets/${id}`)),
  correctTimesheet: async (id: string, input: { actualCheckIn?: string; actualCheckOut?: string; reason: string }) =>
    d<Timesheet>(await apiFetch<any>(`/admin/timesheets/${id}/correct`, { method: "POST", body: JSON.stringify(input) })),
  attendanceDayRoster: async (params: URLSearchParams) =>
    d<AttendanceDayRoster>(await apiFetch<any>(`/admin/attendance/day-roster?${params}`)),
  attendanceMonthSummary: async (params: URLSearchParams) =>
    d<AttendanceMonthSummary>(await apiFetch<any>(`/admin/attendance/month-summary?${params}`)),
  worksheets: async (params: URLSearchParams) => d<any>(await apiFetch<any>(`/admin/worksheets?${params}`)),
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
    d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }))
};
