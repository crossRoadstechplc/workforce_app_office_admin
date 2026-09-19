export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(value));
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

export function formatTime(value?: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function minutesToHours(minutes?: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  return `${h}h ${m}m`;
}

/** Formats late duration as "1H 32min" (or "32min" when under an hour). */
export function formatLateMinutes(minutes?: number | null) {
  if (minutes == null || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  if (h > 0 && m > 0) return `${h}H ${m}min`;
  if (h > 0) return `${h}H`;
  return `${m}min`;
}

/** Formats leave day totals that may be fractional (e.g. 3.5). */
export function formatLeaveDays(value?: number | string | null) {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export function employeeName(e?: { firstName?: string; lastName?: string } | null) {
  return e ? `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() : "—";
}

export function humanizeKey(value?: string | null) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
