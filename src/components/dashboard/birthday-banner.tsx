"use client";

import { Cake } from "lucide-react";
import type { BirthdayPerson } from "@/types/dashboard";

export function BirthdayBanner({ people }: { people: BirthdayPerson[] }) {
  if (!people.length) return null;

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" role="region" aria-label="Birthdays this week">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Cake className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Birthdays this week</p>
          <p className="text-xs text-slate-500">
            {people.length} {people.length === 1 ? "person" : "people"}
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-800">
                  {person.displayName || `${person.firstName} ${person.lastName}`.trim()}
                </td>
                <td className="px-3 py-2.5 text-slate-600">{person.dateLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
