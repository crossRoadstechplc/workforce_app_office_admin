"use client";

import { Cake } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { BirthdayPerson } from "@/types/dashboard";

function formatNames(people: BirthdayPerson[]) {
  const names = people.map((p) => p.displayName || `${p.firstName} ${p.lastName}`.trim());
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
}

export function BirthdayBanner({ people }: { people: BirthdayPerson[] }) {
  if (!people.length) return null;

  const label = people.length === 1 ? "birthday today" : "birthdays today";

  return (
    <div
      className={cn(
        "birthday-banner relative mb-6 overflow-hidden rounded-2xl border border-rose-200/80",
        "bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 px-5 py-4 shadow-sm"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="birthday-banner-shimmer pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex items-start gap-3 sm:items-center">
        <div className="birthday-banner-icon flex size-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <Cake className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700/80">Celebrate</p>
          <p className="mt-1 text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            Happy Birthday, <span className="birthday-banner-names text-rose-700">{formatNames(people)}</span>!
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {people.length} {label} — send your congratulations.
          </p>
        </div>
      </div>
    </div>
  );
}
