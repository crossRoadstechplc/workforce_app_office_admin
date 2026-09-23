"use client";

import { cn } from "@/lib/utils/cn";

export type OpsRequestTab = {
  id: string;
  label: string;
  badge?: number;
};

export function OpsRequestTabs({
  tabs,
  active,
  onChange
}: {
  tabs: OpsRequestTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
              selected ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  selected ? "bg-red-500 text-white" : "bg-red-600 text-white"
                )}
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
