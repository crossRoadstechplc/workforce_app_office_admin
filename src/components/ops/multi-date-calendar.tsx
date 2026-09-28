"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils/format";

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y!, month: m!, day: d! };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** Monday-first weekday index 0..6 for the 1st of month */
function startWeekdayMondayFirst(year: number, month: number) {
  const js = new Date(year, month - 1, 1).getDay(); // 0=Sun
  return js === 0 ? 6 : js - 1;
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function MultiDateCalendar({
  value,
  onChange,
  label = "Dates",
  max = 14
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  max?: number;
}) {
  const today = useMemo(() => {
    const d = new Date();
    return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }, []);

  const initial = value[0] ? parseIso(value[0]) : parseIso(today);
  const [view, setView] = useState({ year: initial.year, month: initial.month });

  const selected = useMemo(() => new Set(value), [value]);
  const sorted = useMemo(() => [...value].sort(), [value]);

  function toggle(iso: string) {
    if (selected.has(iso)) {
      onChange(value.filter((d) => d !== iso));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, iso].sort());
  }

  const totalDays = daysInMonth(view.year, view.month);
  const offset = startWeekdayMondayFirst(view.year, view.month);
  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ iso: toIso(view.year, view.month, day), day });
  }

  const prev = shiftMonth(view.year, view.month, -1);
  const next = shiftMonth(view.year, view.month, 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>
          {label} *{value.length ? ` (${value.length})` : ""}
        </Label>
        <span className="text-xs text-slate-500">Click days to select</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-3 flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setView(prev)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex h-9 min-w-0 flex-1 items-center justify-center truncate text-sm font-medium">
            {monthLabel(view.year, view.month)}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setView(next)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={`e-${idx}`} />;
            const isSelected = selected.has(cell.iso);
            const isToday = cell.iso === today;
            const atMax = !isSelected && value.length >= max;
            return (
              <button
                key={cell.iso}
                type="button"
                disabled={atMax}
                onClick={() => toggle(cell.iso)}
                className={[
                  "relative flex h-9 items-center justify-center rounded-lg text-sm transition",
                  isSelected
                    ? "bg-sky-600 font-semibold text-white hover:bg-sky-700"
                    : "text-slate-800 hover:bg-slate-100",
                  isToday && !isSelected ? "ring-1 ring-sky-300" : "",
                  atMax ? "cursor-not-allowed opacity-40" : ""
                ].join(" ")}
                aria-pressed={isSelected}
                aria-label={cell.iso}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {sorted.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((iso) => (
            <button
              key={iso}
              type="button"
              onClick={() => toggle(iso)}
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100"
              title="Remove date"
            >
              {formatDate(iso)}
              <X className="size-3.5 opacity-70" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No dates selected yet.</p>
      )}
    </div>
  );
}
