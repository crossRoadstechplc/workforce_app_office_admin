"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { birthMonths, daysInMonth, parseBirthMonthDay, toStoredBirthDate } from "@/lib/birth-date";
import { cn } from "@/lib/utils/cn";

type BirthMonthDayFieldProps = {
  /** Controlled ISO `YYYY-MM-DD` (year rewritten to storage year). */
  value?: string;
  onChange?: (isoOrEmpty: string) => void;
  /** Uncontrolled initial value for create/invite forms. */
  defaultValue?: string;
  id?: string;
  name?: string;
  className?: string;
};

export function BirthMonthDayField({
  value,
  onChange,
  defaultValue = "",
  id = "birthDate",
  name = "birthDate",
  className
}: BirthMonthDayFieldProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;

  useEffect(() => {
    if (!controlled) setInternal(defaultValue);
  }, [controlled, defaultValue]);

  const parsed = parseBirthMonthDay(current);
  const month = parsed?.month ?? 0;
  const day = parsed?.day ?? 0;
  const maxDay = month ? daysInMonth(month) : 31;

  function commit(next: string) {
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  function setMonth(nextMonth: number) {
    if (!nextMonth) {
      commit("");
      return;
    }
    const nextDay = day && day <= daysInMonth(nextMonth) ? day : 1;
    commit(toStoredBirthDate(nextMonth, nextDay));
  }

  function setDay(nextDay: number) {
    if (!month || !nextDay) {
      commit("");
      return;
    }
    commit(toStoredBirthDate(month, nextDay));
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={`${id}-month`}>Birthday</Label>
      <div className="grid grid-cols-2 gap-2">
        <select
          id={`${id}-month`}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={month || ""}
          onChange={(e) => setMonth(Number(e.target.value) || 0)}
        >
          <option value="">Month</option>
          {birthMonths().map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          id={`${id}-day`}
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={day || ""}
          disabled={!month}
          onChange={(e) => setDay(Number(e.target.value) || 0)}
        >
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name={name} value={current || ""} />
      <p className="text-xs text-slate-500">Month and day only. Year is not needed.</p>
    </div>
  );
}
