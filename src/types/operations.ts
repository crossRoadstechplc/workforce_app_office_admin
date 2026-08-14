export type Person = {
  id?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department?: string | null;
  officeId?: string | null;
  office?: { id: string; name: string } | null;
};

export type Timesheet = {
  id: string;
  workDate: string;
  status: string;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  scheduledCheckIn?: string | null;
  scheduledCheckOut?: string | null;
  lateMinutes: number;
  workedMinutes: number;
  earlyCheckoutMinutes: number;
  overtimeMinutes: number;
  isMissingCheckout?: boolean;
  isOpen?: boolean;
  isLate?: boolean;
  employee: Person;
  office?: { id: string; name: string };
  lateReason?: { reasonType: string; reasonDescription?: string | null };
  worksheet?: { id: string; workDescription: string; status: string } | null;
  locations?: Array<{
    type?: string;
    locationType?: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    distanceFromOfficeMeters: number;
    isInsideRadius: boolean;
    photoUrl?: string | null;
  }>;
  corrections?: Array<{ id: string; reason: string; createdAt: string }>;
};

export type Worksheet = {
  id: string;
  workDate: string;
  workDescription: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
  adminComment?: string | null;
  employee: Person;
  timesheet?: { id: string; workedMinutes: number; actualCheckIn?: string | null; actualCheckOut?: string | null };
};

export type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  numberOfDays: number | string;
  reason: string;
  status: string;
  requestedAt: string;
  employee: Person;
  leaveType: { id: string; name: string };
  decisions?: Array<{ id: string; decision: string; decisionReason?: string | null; decidedAt: string; adminUser?: { email: string } }>;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

export type Activity = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string | null;
  createdAt: string;
  actor?: { email?: string } | null;
};

export type AttendanceDayRosterRow = {
  employee: Person;
  office?: { id: string; name: string } | null;
  attendanceState: string;
  isWorkingDay: boolean;
  timesheet: {
    id: string;
    status: string;
    actualCheckIn?: string | null;
    actualCheckOut?: string | null;
    lateMinutes: number;
    workedMinutes: number;
    isOpen: boolean;
    isLate: boolean;
    isMissingCheckout: boolean;
    lateReason?: { reasonType: string; reasonDescription?: string | null } | null;
    checkInPhotoUrl?: string | null;
    checkOutPhotoUrl?: string | null;
  } | null;
  leave: { id: string; startDate: string; endDate: string } | null;
  worksheet: { id: string; status: string } | null;
};

export type AttendanceDayRoster = {
  date: string;
  items: AttendanceDayRosterRow[];
  counts: {
    totalEmployees: number;
    checkedIn: number;
    checkedOut: number;
    late: number;
    onLeave: number;
    notCheckedIn: number;
    missingCheckout: number;
    worksheetsSubmitted: number;
    nonWorkingDay: number;
  };
};

export type AttendanceMonthSummaryRow = {
  employee: Person;
  office?: { id: string; name: string } | null;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lateDays: number;
  missingCheckInDays: number;
  missingCheckOutDays: number;
};

export type AttendanceMonthSummary = {
  year: number;
  month: number;
  from: string;
  to: string;
  items: AttendanceMonthSummaryRow[];
  counts: {
    totalEmployees: number;
    employeesMissingCheckIn: number;
    employeesMissingCheckOut: number;
    totalMissingCheckInDays: number;
    totalMissingCheckOutDays: number;
  };
};

export type LeaveDayRosterRow = {
  employee: Person;
  office?: { id: string; name: string } | null;
  leaveState: string;
  leave: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    numberOfDays: number | string;
    reason: string;
    leaveType: { id: string; name: string };
  } | null;
};

export type LeaveDayRoster = {
  date: string;
  items: LeaveDayRosterRow[];
  counts: { totalEmployees: number; onLeave: number; pending: number; none: number; rejected: number; cancelled: number };
};

export type WorksheetDayRosterRow = {
  employee: Person;
  office?: { id: string; name: string } | null;
  worksheetState: string;
  worksheet: { id: string; status: string; workDescription: string; submittedAt: string } | null;
  timesheet: {
    id: string;
    workedMinutes: number;
    status: string;
    actualCheckIn?: string | null;
    actualCheckOut?: string | null;
  } | null;
};

export type WorksheetDayRoster = {
  date: string;
  items: WorksheetDayRosterRow[];
  counts: { totalEmployees: number; submitted: number; reviewed: number; missing: number };
};
