/** Dummy leap year so Feb 29 can be stored without collecting a real year. */
export const BIRTH_DATE_STORAGE_YEAR = 2000;

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
] as const;

export function birthMonths() {
  return MONTHS;
}

export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export function parseBirthMonthDay(value?: string | null): { month: number; day: number } | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month)) return null;
  return { month, day };
}

/** Store as ISO date with dummy year (month/day only for birthday matching). */
export function toStoredBirthDate(month: number, day: number): string {
  return `${BIRTH_DATE_STORAGE_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatBirthMonthDay(value?: string | null): string {
  const parsed = parseBirthMonthDay(value);
  if (!parsed) return "Not set";
  const month = MONTHS.find((m) => m.value === parsed.month)?.label ?? String(parsed.month);
  return `${parsed.day} ${month}`;
}
