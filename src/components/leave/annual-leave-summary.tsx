"use client";

import { formatDate, formatLeaveDays } from "@/lib/utils/format";
import type { AnnualLeaveBalance, LeaveBalanceAllocation } from "@/types/leave-balance";

export function AnnualLeaveSummary({
  balance,
  allocations
}: {
  balance?: AnnualLeaveBalance | null;
  allocations?: LeaveBalanceAllocation[];
}) {
  if (!balance) return null;
  const openBuckets = (balance.buckets ?? []).filter((b) => b.kind !== "EXPIRED");
  return (
    <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Annual leave remaining</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{formatLeaveDays(balance.available)} days</div>
        </div>
        <div className="text-right text-xs text-slate-500">
          This year {formatLeaveDays(balance.currentYearGrant)}
          {balance.carriedIn > 0 ? ` · carried ${formatLeaveDays(balance.carriedIn)}` : ""}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="Used" value={formatLeaveDays(balance.used)} />
        <Stat label="Pending" value={formatLeaveDays(balance.pending)} />
        <Stat label="Entitled" value={formatLeaveDays(balance.entitledTotal)} />
      </div>
      {balance.completedYears != null && (
        <p className="text-xs text-slate-500">
          {balance.completedYears} year{balance.completedYears === 1 ? "" : "s"} of service
          {balance.nextAnniversary ? ` · next grant ${formatLeaveDays(balance.nextYearGrant ?? 0)} on ${formatDate(balance.nextAnniversary)}` : ""}
        </p>
      )}
      {openBuckets.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Year</th>
                <th className="px-3 py-2 font-medium">Granted</th>
                <th className="px-3 py-2 font-medium">Used</th>
                <th className="px-3 py-2 font-medium">Remaining</th>
                <th className="px-3 py-2 font-medium">Expires</th>
              </tr>
            </thead>
            <tbody>
              {openBuckets.map((bucket) => (
                <tr key={bucket.id} className="border-t">
                  <td className="px-3 py-2">
                    {formatDate(bucket.periodStart)} – {formatDate(bucket.periodEnd)}
                    {bucket.kind === "CARRY" ? <span className="ml-1 text-amber-700">carry</span> : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatLeaveDays(bucket.granted)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatLeaveDays(bucket.used)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium">{formatLeaveDays(bucket.remaining)}</td>
                  <td className="px-3 py-2">{formatDate(bucket.expiresOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {allocations?.length ? (
        <p className="text-xs text-slate-500">
          This request uses{" "}
          {allocations.map((row) => `${formatLeaveDays(row.days)} from ${formatDate(row.periodStart)}`).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}
