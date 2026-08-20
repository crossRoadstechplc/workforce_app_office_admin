"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { CredentialFormDialog } from "@/components/vault/credential-form-dialog";
import { MaskedSecret } from "@/components/vault/masked-secret";
import { SubscriptionFormDialog } from "@/components/vault/subscription-form-dialog";
import { SubscriptionPeriodGrid } from "@/components/vault/subscription-period-grid";
import { VaultLockCard } from "@/components/vault/vault-lock-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Table, TableBody, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { vaultApi } from "@/features/vault/vault-api";
import { clearAllVaultTokens, hasVaultToken } from "@/features/vault/vault-token-store";
import { cn } from "@/lib/utils/cn";
import type { OfficeSubscription, VaultCredential } from "@/types/vault";

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
                  <Td className="text-slate-600">{row.email || row.username || "—"}</Td>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["vault-subscriptions"], queryFn: () => vaultApi.subscriptions() });
  const summary = useQuery({ queryKey: ["vault-summary"], queryFn: () => vaultApi.summary() });

  useEffect(() => {
    if (q.error && !hasVaultToken("subscriptions")) onLocked();
  }, [q.error, onLocked]);

  const remove = useMutation({
    mutationFn: (id: string) => vaultApi.deleteSubscription(id),
    onSuccess: () => {
      toast.success("Subscription deleted");
      void qc.invalidateQueries({ queryKey: ["vault-subscriptions"] });
      void qc.invalidateQueries({ queryKey: ["vault-summary"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  if (q.error) return <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />;

  const rows = q.data ?? [];
  const stats = summary.data;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This month</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats ? `${stats.thisMonthTotal}` : "—"}</p>
          <p className="text-sm text-slate-500">{stats?.yearMonth}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats?.activeCount ?? "—"}</p>
          <p className="text-sm text-slate-500">{stats?.thisMonthSeats ?? 0} seats this month</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Renewing in 30 days</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats?.renewingSoon.length ?? 0}</p>
          <p className="truncate text-sm text-slate-500">{stats?.renewingSoon[0]?.name ?? "None upcoming"}</p>
        </Card>
      </div>

      <div className="flex justify-end">
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
        onSaved={() => {
          void qc.invalidateQueries({ queryKey: ["vault-subscriptions"] });
          void qc.invalidateQueries({ queryKey: ["vault-summary"] });
        }}
      />
      {rows.length === 0 ? (
        <Card className="p-6">
          <EmptyState title="No subscriptions yet" description="Create a range with seats and monthly amounts." />
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{row.name}</h3>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {row.vendor ? `${row.vendor} · ` : ""}
                    {row.currentMonthSeats} seats · {row.currency} {row.currentMonthAmount} this month
                    {row.officeName ? ` · ${row.officeName}` : ""}
                    {row.loginCredentialTitle ? ` · login: ${row.loginCredentialTitle}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    {expanded === row.id ? "Hide months" : "Months"}
                  </Button>
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
                      if (window.confirm(`Delete ${row.name}?`)) remove.mutate(row.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {expanded === row.id ? (
                <div className="mt-4">
                  <SubscriptionPeriodGrid subscription={row} />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
