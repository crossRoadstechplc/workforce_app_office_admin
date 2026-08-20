import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const tones = {
  blue: {
    icon: "bg-blue-50 text-blue-700",
    wash: "from-blue-50/80 to-white"
  },
  green: {
    icon: "bg-emerald-50 text-emerald-700",
    wash: "from-emerald-50/70 to-white"
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    wash: "from-amber-50/70 to-white"
  },
  red: {
    icon: "bg-red-50 text-red-700",
    wash: "from-red-50/70 to-white"
  }
} as const;

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue"
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <Card className="min-w-0 overflow-hidden transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <CardContent className={cn("bg-gradient-to-br pt-5", tones[tone].wash)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-950">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
          </div>
          <div className={cn("rounded-xl p-2.5", tones[tone].icon)}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
