"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { configurationApi, itemsOf } from "@/features/configuration/configuration-api";
import type { Schedule, ScheduleDay } from "@/types/configuration";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type DayForm = { enabled: boolean; checkInTime: string; checkOutTime: string };

type ScheduleForm = {
  name: string;
  lateGraceMinutes: string;
  timezone: string;
  days: DayForm[];
};

function defaultDays(): DayForm[] {
  return Array.from({ length: 7 }, (_, i) => ({
    enabled: i < 5,
    checkInTime: "08:30",
    checkOutTime: "17:30"
  }));
}

const blank: ScheduleForm = {
  name: "",
  lateGraceMinutes: "10",
  timezone: "Africa/Addis_Ababa",
  days: defaultDays()
};

function daysFromSchedule(s: Schedule): DayForm[] {
  const byWeekday = new Map((s.days ?? []).map((d) => [d.weekday, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const weekday = i + 1;
    const existing = byWeekday.get(weekday);
    if (existing) {
      return { enabled: true, checkInTime: existing.checkInTime, checkOutTime: existing.checkOutTime };
    }
    if (s.workingDays.includes(weekday)) {
      return { enabled: true, checkInTime: s.checkInTime, checkOutTime: s.checkOutTime };
    }
    return { enabled: false, checkInTime: s.checkInTime || "08:30", checkOutTime: s.checkOutTime || "17:30" };
  });
}

function toApiDays(days: DayForm[]): ScheduleDay[] {
  return days
    .map((d, i) => ({ weekday: i + 1, checkInTime: d.checkInTime, checkOutTime: d.checkOutTime, enabled: d.enabled }))
    .filter((d) => d.enabled)
    .map(({ weekday, checkInTime, checkOutTime }) => ({ weekday, checkInTime, checkOutTime }));
}

function hoursLabel(checkIn: string, checkOut: string) {
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  if ([ih, im, oh, om].some((n) => Number.isNaN(n))) return "";
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function SchedulesPage() {
  return (
    <CompanyAdminGate>
      <SchedulesPageInner />
    </CompanyAdminGate>
  );
}

function SchedulesPageInner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState<ScheduleForm>(blank);
  const q = useQuery({ queryKey: ["schedules"], queryFn: () => configurationApi.schedules() });

  const save = useMutation({
    mutationFn: () => {
      const days = toApiDays(form.days);
      if (days.length === 0) throw new Error("Select at least one working day");
      for (const d of days) {
        if (d.checkOutTime <= d.checkInTime) {
          throw new Error(`${DAY_NAMES[d.weekday - 1]}: checkout must be after check-in`);
        }
      }
      const input = {
        name: form.name,
        timezone: form.timezone,
        lateGraceMinutes: Number(form.lateGraceMinutes),
        days
      };
      return editing ? configurationApi.updateSchedule(editing.id, input) : configurationApi.createSchedule(input);
    },
    onSuccess: () => {
      toast.success(editing ? "Schedule updated" : "Schedule created");
      setOpen(false);
      setForm(blank);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const status = useMutation({
    mutationFn: ({ s, reason }: { s: Schedule; reason: string }) => configurationApi.scheduleStatus(s.id, !s.isActive, reason),
    onSuccess: () => {
      toast.success("Schedule status updated");
      void qc.invalidateQueries({ queryKey: ["schedules"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  const schedules = itemsOf(q.data ?? []);

  function edit(s: Schedule) {
    setEditing(s);
    setForm({
      name: s.name,
      lateGraceMinutes: String(s.lateGraceMinutes),
      timezone: s.timezone ?? "Africa/Addis_Ababa",
      days: daysFromSchedule(s)
    });
    setOpen(true);
  }

  function setDay(index: number, patch: Partial<DayForm>) {
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d, i) => (i === index ? { ...d, ...patch } : d))
    }));
  }

  function applyDefaultsToEnabled() {
    const first = form.days.find((d) => d.enabled) ?? form.days[0];
    if (!first) return;
    setForm((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.enabled ? { ...d, checkInTime: first.checkInTime, checkOutTime: first.checkOutTime } : d
      )
    }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work schedules"
        description="Define expected attendance times per weekday, grace periods, and working days."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditing(null);
                  setForm({ ...blank, days: defaultDays() });
                }}
              >
                <Plus className="size-4" />
                Add schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogTitle>{editing ? "Edit schedule" : "Create schedule"}</DialogTitle>
              <DialogDescription>
                Each working day can have its own check-in and check-out times (for example Saturday shorter hours).
              </DialogDescription>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Timezone">
                  <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                </Field>
                <Field label="Late grace (minutes)">
                  <Input
                    type="number"
                    value={form.lateGraceMinutes}
                    onChange={(e) => setForm({ ...form, lateGraceMinutes: e.target.value })}
                  />
                </Field>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Working days</Label>
                  <Button type="button" size="sm" variant="outline" onClick={applyDefaultsToEnabled}>
                    Apply first day times to all
                  </Button>
                </div>
                <div className="space-y-2">
                  {DAY_NAMES.map((name, i) => {
                    const day = form.days[i]!;
                    return (
                      <div
                        key={name}
                        className={`rounded-lg border p-3 ${day.enabled ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"}`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setDay(i, { enabled: !day.enabled })}
                            className={`min-w-14 rounded-md border px-3 py-1.5 text-sm font-medium ${
                              day.enabled
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 text-slate-500"
                            }`}
                          >
                            {name}
                          </button>
                          {day.enabled ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">In</span>
                                <Input
                                  type="time"
                                  className="w-[8.5rem]"
                                  value={day.checkInTime}
                                  onChange={(e) => setDay(i, { checkInTime: e.target.value })}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Out</span>
                                <Input
                                  type="time"
                                  className="w-[8.5rem]"
                                  value={day.checkOutTime}
                                  onChange={(e) => setDay(i, { checkOutTime: e.target.value })}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-500">
                                {hoursLabel(day.checkInTime, day.checkOutTime)}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">Off</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                Late threshold uses each day&apos;s check-in + <b>{form.lateGraceMinutes} min</b> grace.
              </div>
              <div className="mt-6 flex justify-end">
                <Button disabled={save.isPending} onClick={() => save.mutate()}>
                  Save schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {schedules.map((s) => {
          const dayRows =
            s.days && s.days.length > 0
              ? s.days
              : s.workingDays.map((weekday) => ({
                  weekday,
                  checkInTime: s.checkInTime,
                  checkOutTime: s.checkOutTime
                }));
          return (
            <Card className="p-5" key={s.id}>
              <div className="flex justify-between gap-4">
                <div className="flex gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Clock3 className="size-5" />
                  </div>
                  <div>
                    <div className="flex gap-2">
                      <h2 className="font-semibold">{s.name}</h2>
                      <StatusBadge status={s.isActive ? "ACTIVE" : "INACTIVE"} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{s.lateGraceMinutes} min grace · {s.timezone ?? "—"}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => edit(s)}>
                  Edit
                </Button>
              </div>
              <div className="mt-5 space-y-1.5">
                {dayRows.map((d) => (
                  <div key={d.weekday} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-700">{DAY_NAMES[d.weekday - 1]}</span>
                    <span className="text-slate-500">
                      {d.checkInTime} – {d.checkOutTime}
                      <span className="ml-2 text-xs text-slate-400">{hoursLabel(d.checkInTime, d.checkOutTime)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t pt-4">
                <Button
                  size="sm"
                  variant={s.isActive ? "danger" : "secondary"}
                  onClick={() => {
                    const reason = window.prompt(`Reason to ${s.isActive ? "deactivate" : "activate"} this schedule?`);
                    if (reason) status.mutate({ s, reason });
                  }}
                >
                  <Power className="size-4" />
                  {s.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
