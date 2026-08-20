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

export function minutesToHours(minutes?: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  return `${h}h ${m}m`;
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
