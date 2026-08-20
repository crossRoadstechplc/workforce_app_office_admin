import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export type OpsMetric = {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger" | "success";
};

const toneClass: Record<NonNullable<OpsMetric["tone"]>, string> = {
  default: "text-slate-950",
  warning: "text-amber-700",
  danger: "text-red-700",
  success: "text-emerald-700"
};

const washClass: Record<NonNullable<OpsMetric["tone"]>, string> = {
  default: "from-slate-50/80 to-white",
  warning: "from-amber-50/70 to-white",
  danger: "from-red-50/70 to-white",
  success: "from-emerald-50/70 to-white"
};

export function OpsSummaryStrip({ metrics }: { metrics: OpsMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {metrics.map((m) => {
        const tone = m.tone ?? "default";
        return (
          <Card key={m.label} className={cn("min-w-0 overflow-hidden bg-gradient-to-br p-4", washClass[tone])}>
            <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{m.label}</div>
            <div className={cn("mt-2 text-2xl font-bold tabular-nums", toneClass[tone])}>{m.value}</div>
          </Card>
        );
      })}
    </div>
  );
}
