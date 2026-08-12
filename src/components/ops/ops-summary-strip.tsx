import { Card } from "@/components/ui/card";

export type OpsMetric = {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger" | "success";
};

const toneClass: Record<NonNullable<OpsMetric["tone"]>, string> = {
  default: "text-slate-900",
  warning: "text-amber-700",
  danger: "text-red-700",
  success: "text-emerald-700"
};

export function OpsSummaryStrip({ metrics }: { metrics: OpsMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {metrics.map((m) => (
        <Card key={m.label} className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{m.label}</div>
          <div className={`mt-2 text-2xl font-bold ${toneClass[m.tone ?? "default"]}`}>{m.value}</div>
        </Card>
      ))}
    </div>
  );
}
