"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import type { OfficeSubscription } from "@/types/vault";

export function SubscriptionHistoryDialog({
  open,
  onOpenChange,
  subscription
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: OfficeSubscription | null;
}) {
  const rows = subscription?.historyPeriods ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Payment history</DialogTitle>
        <DialogDescription>
          {subscription
            ? `${subscription.name} · ${subscription.assigneeLabel}. Paid and cancelled months, including this month.`
            : "Paid and cancelled months."}
        </DialogDescription>
        {!subscription || rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No paid or cancelled history yet.</p>
        ) : (
          <div className="mt-4">
            <TableShell>
              <Table>
                <TableHead>
                  <TableRow>
                    <Th>Month</Th>
                    <Th>Amount</Th>
                    <Th>Status</Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((period) => (
                    <TableRow key={period.id}>
                      <Td className="font-medium text-slate-900">{period.yearMonth}</Td>
                      <Td>
                        {subscription.currency} {period.amount}
                      </Td>
                      <Td>
                        <StatusBadge status={period.paymentStatus} />
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableShell>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
