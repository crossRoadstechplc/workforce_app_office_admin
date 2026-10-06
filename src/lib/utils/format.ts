export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
}

/** Date range without a dash separator, e.g. "Oct 05, 2026 to Oct 08, 2026". */
export function formatDateRange(start?: string | Date | null, end?: string | Date | null) {
  const from = formatDate(start);
  const to = formatDate(end);
  if (from === "-" && to === "-") return "-";
  if (from === to) return from;
  return `${from} to ${to}`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function formatTime(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/** For SYSTEM auto-checkout, prefer scheduled end time over the 22:00 trigger timestamp. */
export function checkoutDisplayAt(timesheet?: {
  actualCheckOut?: string | Date | null;
  scheduledCheckOut?: string | Date | null;
  checkOutSource?: string | null;
} | null) {
  if (!timesheet?.actualCheckOut) return null;
  if (timesheet.checkOutSource === "SYSTEM" && timesheet.scheduledCheckOut) {
    return timesheet.scheduledCheckOut;
  }
  return timesheet.actualCheckOut;
}

export function formatCheckoutDateTime(timesheet?: {
  actualCheckOut?: string | Date | null;
  scheduledCheckOut?: string | Date | null;
  checkOutSource?: string | null;
} | null) {
  return formatDateTime(checkoutDisplayAt(timesheet));
}

export function formatCheckoutTime(timesheet?: {
  actualCheckOut?: string | Date | null;
  scheduledCheckOut?: string | Date | null;
  checkOutSource?: string | null;
} | null) {
  return formatTime(checkoutDisplayAt(timesheet));
}

export function minutesToHours(minutes?: number | null) {
  if (minutes == null) return "-";
  return formatDuration(minutes);
}

/** Formats late/early/overtime duration as 45m, 5h 30m, or 1d 2h. */
export function formatLateMinutes(minutes?: number | null) {
  if (minutes == null || minutes <= 0) return "-";
  return formatDuration(minutes);
}

function formatDuration(totalMinutes: number): string {
  const total = Math.max(0, Math.round(Math.abs(totalMinutes)));
  if (total === 0) return "0m";
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/** Formats leave day totals that may be fractional (e.g. 3.5). */
export function formatLeaveDays(value?: number | string | null) {
  if (value == null || value === "") return "-";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function formatLeaveSession(value?: string | null) {
  switch ((value ?? "FULL").toUpperCase()) {
    case "MORNING":
      return "Half · Morning";
    case "AFTERNOON":
      return "Half · Afternoon";
    default:
      return "Full day";
  }
}

export function employeeName(e?: { firstName?: string; lastName?: string } | null) {
  return e ? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() : "-";
}

export function humanizeKey(value?: string | null) {
  if (!value) return "-";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
