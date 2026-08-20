"use client";

import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { AttendanceTrend } from "@/types/dashboard";
import { EmptyState } from "@/components/ui/empty-state";

function formatTick(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "MMM d");
}

function ChartTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const date = label ? new Date(label) : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? format(date, "MMM d, yyyy") : label;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-md">
      <p className="font-semibold text-slate-900">{dateLabel}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="size-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceChart({ data }: { data: AttendanceTrend }) {
  if (!data.length) {
    return <EmptyState title="No attendance trend yet" description="Check-ins from the last 14 days will appear here." />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            tickFormatter={(v) => formatTick(String(v))}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => <span className="text-slate-600">{value}</span>}
          />
          <Line type="monotone" dataKey="attendance" name="Attendance" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="late" name="Late" stroke="#d97706" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
