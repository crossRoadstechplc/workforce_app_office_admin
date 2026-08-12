"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateDayPicker({
  value,
  onChange,
  label = "Date"
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const max = todayIso();
  const atToday = value >= max;

  return (
    <div className="min-w-52 space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="outline" onClick={() => onChange(shiftDate(value, -1))} aria-label="Previous day">
          <ChevronLeft className="size-4" />
        </Button>
        <Input
          type="date"
          max={max}
          value={value}
          onChange={(e) => {
            const next = e.target.value || max;
            onChange(next > max ? max : next);
          }}
        />
        <Button type="button" size="sm" variant="outline" disabled={atToday} onClick={() => onChange(shiftDate(value, 1))} aria-label="Next day">
          <ChevronRight className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={atToday} onClick={() => onChange(max)}>
          Today
        </Button>
      </div>
    </div>
  );
}

export function defaultOpsDate() {
  return todayIso();
}
