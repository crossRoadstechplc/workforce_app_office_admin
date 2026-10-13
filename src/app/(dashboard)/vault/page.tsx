"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, MoreHorizontal, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { CredentialFormDialog } from "@/components/vault/credential-form-dialog";
import { MaskedSecret } from "@/components/vault/masked-secret";
import { SubscriptionFormDialog } from "@/components/vault/subscription-form-dialog";
import { SubscriptionHistoryDialog } from "@/components/vault/subscription-history-dialog";
import { VaultLockCard } from "@/components/vault/vault-lock-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Table, TableBody, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { vaultApi } from "@/features/vault/vault-api";
import { clearAllVaultTokens, hasVaultToken } from "@/features/vault/vault-token-store";
import { cn } from "@/lib/utils/cn";
import type { OfficeSubscription, PeriodPaymentStatus, VaultCredential } from "@/types/vault";

type SubFilter = "ACTIVE" | "CANCELLED" | "ALL";

type Tab = "credentials" | "subscriptions";

export default function VaultPage() {
  return (
    <CompanyAdminGate>
      <VaultPageInner />
    </CompanyAdminGate>
  );
}

function VaultPageInner() {
  const [tab, setTab] = useState<Tab>("credentials");
  const [tick, setTick] = useState(0);
  const credsUnlocked = hasVaultToken("credentials");
  const subsUnlocked = hasVaultToken("subscriptions");

  useEffect(() => {
    const timer = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Private vault"
        description="Office credentials and subscription ranges. Unlock each section with its vault PIN. Secrets stay masked until you enter the reveal PIN."
        action={
          credsUnlocked || subsUnlocked ? (
            <Button
              variant="outline"
              onClick={() => {
                clearAllVaultTokens();
                setTick((n) => n + 1);
              }}
            >
              <Lock className="size-4" />
              Lock vault
            </Button>
          ) : null
        }
      />

      <div className="flex gap-2">
        <TabButton active={tab === "credentials"} onClick={() => setTab("credentials")} icon={<KeyRound className="size-4" />} label="Credentials" />
        <TabButton active={tab === "subscriptions"} onClick={() => setTab("subscriptions")} icon={<Receipt className="size-4" />} label="Subscriptions" />
      </div>

      {tab === "credentials" ? (
        credsUnlocked ? (
          <CredentialsPanel onLocked={() => setTick((n) => n + 1)} />
        ) : (
          <VaultLockCard
            scope="credentials"
            title="Unlock credentials"
            description="Enter the credentials PIN to view and manage office emails, passwords, and other secrets."
            onUnlocked={() => setTick((n) => n + 1)}
          />
        )
      ) : subsUnlocked ? (
        <SubscriptionsPanel onLocked={() => setTick((n) => n + 1)} />
      ) : (
        <VaultLockCard
          scope="subscriptions"
          title="Unlock subscriptions"
          description="Enter the subscriptions PIN to manage monthly seat counts, amounts, and renewals."
          onUnlocked={() => setTick((n) => n + 1)}
        />
      )}
      <span className="hidden">{tick}</span>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold",
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CredentialsPanel({ onLocked }: { onLocked: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VaultCredential | null>(null);
  const q = useQuery({ queryKey: ["vault-credentials"], queryFn: () => vaultApi.credentials() });

  useEffect(() => {
    if (q.error && !hasVaultToken("credentials")) onLocked();
  }, [q.error, onLocked]);

  const remove = useMutation({
    mutationFn: (id: string) => vaultApi.deleteCredential(id),
    onSuccess: () => {
      toast.success("Credential deleted");
      void qc.invalidateQueries({ queryKey: ["vault-credentials"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />;

  const rows = q.data ?? [];

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add credential
        </Button>
      </div>
      <CredentialFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["vault-credentials"] })}
      />
      {rows.length === 0 ? (
        <Card className="p-6">
          <EmptyState title="No credentials yet" description="Store office emails, Wi-Fi, and vendor logins here." />
        </Card>
      ) : (
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Title</Th>
                <Th>Type</Th>
                <Th>Email / username</Th>
                <Th>Secret</Th>
                <Th>Office</Th>
                <Th />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <Td className="font-medium text-slate-950">{row.title}</Td>
                  <Td>
                    <StatusBadge status={row.type} />
                  </Td>
                  <Td className="text-slate-600">{row.email || row.username || ""}</Td>
                  <Td>
                    <MaskedSecret credentialId={row.id} masked={row.secretMasked} />
                  </Td>
                  <Td>{row.officeName ?? "Company-wide"}</Td>
                  <Td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm(`Delete ${row.title}?`)) remove.mutate(row.id);
                      }}
                    >
                      Delete
                    </Button>
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </>
  );
}

function SubscriptionsPanel({ onLocked }: { onLocked: () => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeSubscription | null>(null);
  const [historyRow, setHistoryRow] = useState<OfficeSubscription | null>(null);
  const [filter, setFilter] = useState<SubFilter>("ACTIVE");
  const q = useQuery({ queryKey: ["vault-subscriptions"], queryFn: () => vaultApi.subscriptions() });
  const summary = useQuery({ queryKey: ["vault-summary"], queryFn: () => vaultApi.summary() });

  useEffect(() => {
    if (q.error && !hasVaultToken("subscriptions")) onLocked();
  }, [q.error, onLocked]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["vault-subscriptions"] });
    void qc.invalidateQueries({ queryKey: ["vault-summary"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => vaultApi.deleteSubscription(id),
    onSuccess: () => {
      toast.success("Subscription deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const setPayment = useMutation({
    mutationFn: ({ id, yearMonth, paymentStatus }: { id: string; yearMonth: string; paymentStatus: PeriodPaymentStatus }) =>
      vaultApi.upsertPeriod(id, yearMonth, { paymentStatus }),
    onSuccess: (_data, vars) => {
      const label = vars.paymentStatus === "PAID" ? "Marked paid" : vars.paymentStatus === "CANCELLED" ? "Cancelled for month" : "Ready to pay";
      toast.success(label);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />;

  const allRows = q.data ?? [];
  const rows = allRows.filter((row) => {
    if (filter === "ALL") return true;
    return row.status === filter;
  });
  const stats = summary.data;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-sky-200 bg-sky-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Active</p>
          <p className="mt-1 text-2xl font-semibold text-sky-950">{stats?.activeCount ?? ""}</p>
          <p className="text-sm text-sky-700/80">Active subscriptions</p>
        </Card>
        <Card className="border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Waiting to pay</p>
          <p className="mt-1 text-2xl font-semibold text-amber-950">{stats?.waitingTotal ?? ""}</p>
          <p className="text-sm text-amber-800/80">
            {stats?.waitingCount ?? 0} due · {stats?.waitingSeats ?? 0} seats
          </p>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Paid this month</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-950">{stats?.paidThisMonthTotal ?? ""}</p>
          <p className="text-sm text-emerald-800/80">
            {stats?.paidThisMonthCount ?? 0} paid · {stats?.yearMonth}
          </p>
        </Card>
        <Card className="border-rose-200 bg-rose-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Cancelled this month</p>
          <p className="mt-1 text-2xl font-semibold text-rose-950">{stats?.cancelledThisMonthCount ?? 0}</p>
          <p className="text-sm text-rose-800/80">{stats?.yearMonth}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(
            [
              ["ACTIVE", "Active"],
              ["CANCELLED", "Cancelled"],
              ["ALL", "All"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold",
                filter === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add subscription
        </Button>
      </div>

      <SubscriptionFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={invalidate}
      />
      <SubscriptionHistoryDialog open={!!historyRow} onOpenChange={(v) => !v && setHistoryRow(null)} subscription={historyRow} />

      {rows.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={allRows.length === 0 ? "No subscriptions yet" : "No matches"}
            description={allRows.length === 0 ? "Add a subscription for a person, team, or the company." : "Try another filter."}
          />
        </Card>
      ) : (
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Name</Th>
                <Th>For</Th>
                <Th>Month</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const currentPayment = row.currentMonthPaymentStatus ?? "WAITING";
                const isPaidThisMonth = currentPayment === "PAID";
                // Not paid: show waiting month + Pay. Paid: show next due month, no Pay.
                const month = isPaidThisMonth
                  ? (row.actionYearMonth ?? row.currentYearMonth)
                  : row.currentYearMonth;
                const payment = isPaidThisMonth ? "PAID" : currentPayment;
                const amount = isPaidThisMonth ? (row.actionAmount ?? row.currentMonthAmount) : row.currentMonthAmount;
                const seats = isPaidThisMonth ? (row.actionSeats ?? row.currentMonthSeats) : row.currentMonthSeats;
                const canPay = !isPaidThisMonth && (currentPayment === "WAITING" || currentPayment === "CANCELLED");
                const canCancel = !isPaidThisMonth && currentPayment === "WAITING";
                return (
                  <TableRow key={row.id}>
                    <Td>
                      <div className="font-medium text-slate-950">{row.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.vendor ? `${row.vendor} · ` : ""}
                        {seats} seats · {row.currency} {amount}
                      </div>
                    </Td>
                    <Td className="text-slate-700">{row.assigneeLabel ?? "Company"}</Td>
                    <Td>
                      {isPaidThisMonth ? (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Due month</p>
                          <p className="font-medium text-slate-800">{month}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Waiting month</p>
                          <p className="font-medium text-slate-800">{month}</p>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={payment} />
                    </Td>
                    <Td>
                      <StatusBadge status={row.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        {canPay ? (
                          <Button
                            size="sm"
                            disabled={setPayment.isPending}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => setPayment.mutate({ id: row.id, yearMonth: month, paymentStatus: "PAID" })}
                          >
                            Paid
                          </Button>
                        ) : null}
                        {canCancel ? (
                          <Button
                            size="sm"
                            disabled={setPayment.isPending}
                            className="border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            onClick={() => setPayment.mutate({ id: row.id, yearMonth: month, paymentStatus: "CANCELLED" })}
                          >
                            Canceled
                          </Button>
                        ) : null}
                        {!isPaidThisMonth && currentPayment === "CANCELLED" ? (
                          <Button
                            size="sm"
                            disabled={setPayment.isPending}
                            className="border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            onClick={() => setPayment.mutate({ id: row.id, yearMonth: month, paymentStatus: "WAITING" })}
                          >
                            Ready to pay
                          </Button>
                        ) : null}
                        <Dropdown>
                          <DropdownTrigger asChild>
                            <Button size="sm" variant="ghost" aria-label={`More actions for ${row.name}`}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownContent align="end">
                            <DropdownItem onClick={() => setHistoryRow(row)}>History</DropdownItem>
                            <DropdownItem
                              onClick={() => {
                                setEditing(row);
                                setOpen(true);
                              }}
                            >
                              Edit
                            </DropdownItem>
                            <DropdownItem
                              className="text-rose-700 focus:bg-rose-50"
                              onClick={() => {
                                if (window.confirm(`Delete ${row.name}?`)) remove.mutate(row.id);
                              }}
                            >
                              Delete
                            </DropdownItem>
                          </DropdownContent>
                        </Dropdown>
                      </div>
                    </Td>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </>
  );
}
