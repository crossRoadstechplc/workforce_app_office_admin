"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vaultApi } from "@/features/vault/vault-api";
import type { OfficeSubscription } from "@/types/vault";

export function SubscriptionPeriodGrid({ subscription }: { subscription: OfficeSubscription }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { seats: string; amount: string }>>({});

  const save = useMutation({
    mutationFn: ({ yearMonth, seats, amount, paid }: { yearMonth: string; seats?: number; amount?: number; paid?: boolean }) =>
      vaultApi.upsertPeriod(subscription.id, yearMonth, { seats, amount, paid }),
    onSuccess: () => {
      toast.success("Month updated");
      void qc.invalidateQueries({ queryKey: ["vault-subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["vault-summary"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (!subscription.periods.length) {
    return <p className="text-sm text-slate-500">No monthly rows yet.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {subscription.periods.map((period) => {
        const draft = drafts[period.yearMonth] ?? { seats: String(period.seats), amount: period.amount };
        return (
          <div key={period.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{period.yearMonth}</p>
              <button
                type="button"
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${period.paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                onClick={() => save.mutate({ yearMonth: period.yearMonth, paid: !period.paid })}
              >
                {period.paid ? "Paid" : "Unpaid"}
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Input
                aria-label={`${period.yearMonth} seats`}
                type="number"
                min={1}
                value={draft.seats}
                onChange={(e) => setDrafts((d) => ({ ...d, [period.yearMonth]: { ...draft, seats: e.target.value } }))}
              />
              <Input
                aria-label={`${period.yearMonth} amount`}
                type="number"
                min={0}
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDrafts((d) => ({ ...d, [period.yearMonth]: { ...draft, amount: e.target.value } }))}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 w-full"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  yearMonth: period.yearMonth,
                  seats: Number(draft.seats),
                  amount: Number(draft.amount)
                })
              }
            >
              Save month
            </Button>
          </div>
        );
      })}
    </div>
  );
}
