"use client";

import { RATING_SCALE } from "@/types/performance";

export function EmojiRating({
  value,
  onChange,
  disabled,
  size = "md"
}: {
  value: number | null | undefined;
  onChange?: (n: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const selected = RATING_SCALE.find((r) => r.value === value);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {RATING_SCALE.map((r) => {
          const active = value === r.value;
          const dim = size === "sm" ? "h-11 min-w-11 px-2" : "h-14 min-w-14 px-2.5";
          return (
            <button
              key={r.value}
              type="button"
              disabled={disabled}
              title={`${r.value} — ${r.label}`}
              onClick={() => onChange?.(r.value)}
              className={`${dim} rounded-2xl text-2xl transition ${
                active
                  ? "bg-emerald-50 ring-2 ring-emerald-500 shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 ring-1 ring-slate-200"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {r.emoji}
            </button>
          );
        })}
      </div>
      {selected ? (
        <p className="text-xs font-medium text-slate-600">
          {selected.value} — {selected.label}
        </p>
      ) : null}
    </div>
  );
}
