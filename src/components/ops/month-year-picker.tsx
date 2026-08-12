"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function labelFor(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export function MonthYearPicker({
  year,
  month,
  onChange,
  label = "Month"
}: {
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
  label?: string;
}) {
  const now = currentYearMonth();
  const atCurrent = year > now.year || (year === now.year && month >= now.month);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const nextBlocked = next.year > now.year || (next.year === now.year && next.month > now.month);

  return (
    <div className="min-w-56 space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="outline" onClick={() => onChange(prev)} aria-label="Previous month">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex h-10 flex-1 items-center justify-center rounded-lg border bg-white px-3 text-sm font-medium">{labelFor(year, month)}</div>
        <Button type="button" size="sm" variant="outline" disabled={nextBlocked} onClick={() => onChange(next)} aria-label="Next month">
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={atCurrent} onClick={() => onChange(now)}>
          This month
        </Button>
      </div>
    </div>
  );
}

export function defaultOpsMonth() {
  return currentYearMonth();
}
