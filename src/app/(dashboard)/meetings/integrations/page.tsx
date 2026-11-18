"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronUp, KeyRound, Plus, RefreshCw, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyValue } from "@/components/ui/copy-value";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { employeeApi } from "@/features/employees/employee-api";
import { integrationApi, integrationApiBaseUrl } from "@/features/integrations/integration-api";
import type { ApiIntegration, IntegrationInput, IntegrationSecrets } from "@/types/integrations";

type OfficeOption = { id: string; name: string };
type SecretsView = { title: string; name: string; apiKey?: string; webhookSecret?: string | null };
type ConfirmKind = "revoke" | "rotate-key" | "rotate-secret";

function formatWhen(value?: string | null) {
  if (!value) return "Never";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString();
}

export default function IntegrationsPage() {
  return (
    <CompanyAdminGate>
      <IntegrationsInner />
    </CompanyAdminGate>
  );
}

function IntegrationsInner() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["integrations"], queryFn: integrationApi.list });
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices });
  const [form, setForm] = useState<{ mode: "create" } | { mode: "edit"; integration: ApiIntegration } | null>(null);
  const [secrets, setSecrets] = useState<SecretsView | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; integration: ApiIntegration } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["integrations"] });
  const onError = (e: Error) => toast.error(e.message);

  function showSecrets(title: string, result: IntegrationSecrets) {
    if (result.apiKey || result.webhookSecret) {
      setSecrets({ title, name: result.integration.name, apiKey: result.apiKey, webhookSecret: result.webhookSecret });
    }
  }

  const save = useMutation({
    mutationFn: (input: IntegrationInput) =>
      form?.mode === "edit" ? integrationApi.update(form.integration.id, input) : integrationApi.create(input),
    onSuccess: (result) => {
      const created = form?.mode === "create";
      setForm(null);
      refresh();
      toast.success(created ? "Integration created" : "Integration saved");
      showSecrets(created ? "Integration created" : "Webhook enabled", result);
    },
    onError
  });

  const setActive = useMutation({
    mutationFn: (i: ApiIntegration) => integrationApi.update(i.id, { isActive: !i.isActive }),
    onSuccess: (result) => {
      refresh();
      toast.success(result.integration.isActive ? "Integration resumed" : "Integration paused — its key is rejected until resumed");
    },
    onError
  });

  const runConfirm = useMutation({
    mutationFn: async ({ kind, integration }: { kind: ConfirmKind; integration: ApiIntegration }) => {
      if (kind === "revoke") return integrationApi.revoke(integration.id);
      if (kind === "rotate-key") return integrationApi.rotateKey(integration.id);
      return integrationApi.rotateWebhookSecret(integration.id);
    },
    onSuccess: (result, { kind }) => {
      setConfirm(null);
      refresh();
      if (kind === "revoke") toast.success("Integration revoked");
      if (kind === "rotate-key") showSecrets("New API key", { ...result, webhookSecret: null });
      if (kind === "rotate-secret") showSecrets("New webhook secret", { ...result, apiKey: undefined });
    },
    onError
  });

  const testWebhook = useMutation({
    mutationFn: (i: ApiIntegration) => integrationApi.testWebhook(i.id),
    onSuccess: (delivery, i) => {
      refresh();
      void qc.invalidateQueries({ queryKey: ["integration-deliveries", i.id] });
      if (delivery.status === "SUCCEEDED") toast.success(`Test event delivered (HTTP ${delivery.lastStatusCode})`);
      else toast.error(`Test event failed: ${delivery.lastError ?? "no response"}. It will be retried automatically.`);
    },
    onError
  });

  if (list.isLoading) return <PageSkeleton />;
  const items = list.data?.items ?? [];
  const officeOptions: OfficeOption[] = (offices.data ?? []).map((o) => ({ id: o.id, name: o.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="API access"
        description="Let another app book meeting rooms for your employees with an API key and an employee code (e.g. SPX001)."
        action={
          <Button onClick={() => setForm({ mode: "create" })}>
            <Plus className="size-4" />
            New integration
          </Button>
        }
      />

      <HowItWorks />

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            expanded={expanded === integration.id}
            onToggleDeliveries={() => setExpanded((cur) => (cur === integration.id ? null : integration.id))}
            onEdit={() => setForm({ mode: "edit", integration })}
            onToggleActive={() => setActive.mutate(integration)}
            onConfirm={(kind) => setConfirm({ kind, integration })}
            onTest={() => testWebhook.mutate(integration)}
            busy={setActive.isPending || testWebhook.isPending}
          />
        ))}
      </div>
      {!items.length && (
        <Card>
          <EmptyState
            title="No integrations yet"
            description="Create one to get an API key for the other app's developer."
            action={
              <Button onClick={() => setForm({ mode: "create" })}>
                <Plus className="size-4" />
                New integration
              </Button>
            }
          />
        </Card>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{form?.mode === "edit" ? "Edit integration" : "New integration"}</DialogTitle>
          <DialogDescription>
            {form?.mode === "edit"
              ? "Changes apply to the existing key immediately."
              : "You will see the API key once, right after saving."}
          </DialogDescription>
          {form && (
            <IntegrationForm
              key={form.mode === "edit" ? form.integration.id : "create"}
              initial={form.mode === "edit" ? form.integration : null}
              offices={officeOptions}
              pending={save.isPending}
              onSubmit={(input) => save.mutate(input)}
            />
          )}
        </DialogContent>
      </Dialog>

      <SecretsDialog secrets={secrets} onClose={() => setSecrets(null)} />

      <Dialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent className="max-w-md">
          {confirm && (
            <>
              <DialogTitle>{confirmCopy[confirm.kind].title}</DialogTitle>
              <DialogDescription>{confirmCopy[confirm.kind].body(confirm.integration.name)}</DialogDescription>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant={confirm.kind === "revoke" ? "danger" : "default"}
                  disabled={runConfirm.isPending}
                  onClick={() => runConfirm.mutate(confirm)}
                >
                  {confirmCopy[confirm.kind].action}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const confirmCopy: Record<ConfirmKind, { title: string; action: string; body: (name: string) => string }> = {
  revoke: {
    title: "Revoke integration?",
    action: "Revoke",
    body: (name) =>
      `${name} will immediately lose access and its webhooks stop. Existing bookings stay. This cannot be undone — create a new integration to reconnect.`
  },
  "rotate-key": {
    title: "Generate a new API key?",
    action: "Generate new key",
    body: (name) => `The current key for ${name} stops working right away. Give the new key to the app's developer.`
  },
  "rotate-secret": {
    title: "Generate a new webhook secret?",
    action: "Generate new secret",
    body: (name) => `Webhooks to ${name} will be signed with the new secret from now on. The app must update its secret too.`
  }
};

function HowItWorks() {
  const steps = [
    { title: "Create an integration", text: "Choose which offices it may book and, optionally, a webhook URL." },
    { title: "Share the key", text: "Give the key (shown once) to the other app's developer with the API guide." },
    { title: "The app books rooms", text: "It sends the employee code, room, time and reason. Bookings appear like normal ones." }
  ];
  return (
    <Card className="p-5">
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-slate-900">{step.title}</p>
              <p className="mt-0.5 text-sm text-slate-500">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 border-t pt-4">
        <CopyValue label="API base URL" value={integrationApiBaseUrl} />
      </div>
    </Card>
  );
}

function IntegrationForm({
  initial,
  offices,
  pending,
  onSubmit
}: {
  initial: ApiIntegration | null;
  offices: OfficeOption[];
  pending: boolean;
  onSubmit: (input: IntegrationInput) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [allOffices, setAllOffices] = useState(initial ? initial.allOffices : true);
  const [selected, setSelected] = useState<string[]>(initial?.officeIds ?? []);
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl ?? "");

  const toggleOffice = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const invalid = name.trim().length < 2 || (!allOffices && selected.length === 0);

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        onSubmit({ name: name.trim(), officeIds: allOffices ? [] : selected, webhookUrl: webhookUrl.trim() || null });
      }}
    >
      <div>
        <Label htmlFor="integration-name">Name</Label>
        <Input
          id="integration-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="SPX booking app"
          required
          minLength={2}
          maxLength={120}
        />
        <p className="mt-1 text-xs text-slate-500">Employees see this in notifications, e.g. “booked via SPX booking app”.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-slate-900">Offices this key can book</legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="scope" checked={allOffices} onChange={() => setAllOffices(true)} />
            All offices (including offices added later)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="scope" checked={!allOffices} onChange={() => setAllOffices(false)} />
            Only selected offices
          </label>
        </div>
        {!allOffices && (
          <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border p-3">
            {offices.map((office) => (
              <label key={office.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(office.id)} onChange={() => toggleOffice(office.id)} />
                {office.name}
              </label>
            ))}
            {!offices.length && <p className="text-sm text-slate-500">No offices found.</p>}
          </div>
        )}
        {!allOffices && !selected.length && <p className="mt-1 text-xs text-red-600">Pick at least one office.</p>}
      </fieldset>

      <div>
        <Label htmlFor="integration-webhook">Webhook URL (optional)</Label>
        <Input
          id="integration-webhook"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://spx.example.com/workforce/webhooks"
        />
        <p className="mt-1 text-xs text-slate-500">
          We POST signed events here when a booking made by this app is created, moved or cancelled. Must be https.
          {initial?.webhookUrl ? " Clear the field to stop webhooks." : ""}
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || invalid}>
          {initial ? "Save changes" : "Create and show key"}
        </Button>
      </div>
    </form>
  );
}

function SecretsDialog({ secrets, onClose }: { secrets: SecretsView | null; onClose: () => void }) {
  const example = secrets?.apiKey
    ? `curl ${integrationApiBaseUrl}/rooms \\\n  -H "X-API-Key: ${secrets.apiKey}"`
    : null;
  return (
    <Dialog open={!!secrets} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogTitle>{secrets?.title}</DialogTitle>
        <DialogDescription>{secrets?.name}</DialogDescription>
        {secrets && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>Copy this now and send it securely to the app&apos;s developer. You won&apos;t be able to see it again.</p>
            </div>
            {secrets.apiKey && <CopyValue label="API key" value={secrets.apiKey} tone="amber" />}
            {secrets.webhookSecret && <CopyValue label="Webhook signing secret" value={secrets.webhookSecret} tone="amber" />}
            {example && (
              <div>
                <Label>Quick test</Label>
                <pre className="mt-1.5 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{example}</pre>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={onClose}>I&apos;ve saved it</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IntegrationCard({
  integration,
  expanded,
  busy,
  onToggleDeliveries,
  onEdit,
  onToggleActive,
  onConfirm,
  onTest
}: {
  integration: ApiIntegration;
  expanded: boolean;
  busy: boolean;
  onToggleDeliveries: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onConfirm: (kind: ConfirmKind) => void;
  onTest: () => void;
}) {
  const revoked = integration.status === "REVOKED";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
            <KeyRound className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{integration.name}</h2>
              <StatusBadge status={integration.status} />
            </div>
            <p className="mt-1 truncate font-mono text-xs text-slate-500">{integration.keyPreview}</p>
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Offices</dt>
          <dd className="font-medium">
            {integration.allOffices ? "All offices" : integration.offices.map((o) => o.name).join(", ")}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Last used</dt>
          <dd className="font-medium">{formatWhen(integration.lastUsedAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Bookings made</dt>
          <dd className="font-medium">{integration.bookingCount}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd className="font-medium">
            {new Date(integration.createdAt).toLocaleDateString()} · {integration.createdByEmail}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Webhook</dt>
          <dd className="flex flex-wrap items-center gap-2 font-medium">
            {integration.webhookUrl ? (
              <>
                <span className="min-w-0 break-all">{integration.webhookUrl}</span>
                {integration.lastDelivery && <StatusBadge status={integration.lastDelivery.status} />}
                {integration.failedDeliveries > 0 && (
                  <span className="text-xs font-semibold text-red-600">{integration.failedDeliveries} failed</span>
                )}
              </>
            ) : (
              <span className="text-slate-500">Not set</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
        {!revoked && (
          <>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={onToggleActive} disabled={busy}>
              {integration.isActive ? "Pause" : "Resume"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onConfirm("rotate-key")}>
              <RefreshCw className="size-3.5" />
              New key
            </Button>
            {integration.webhookUrl && (
              <>
                <Button size="sm" variant="outline" onClick={onTest} disabled={busy || !integration.isActive}>
                  <Send className="size-3.5" />
                  Test webhook
                </Button>
                <Button size="sm" variant="outline" onClick={() => onConfirm("rotate-secret")}>
                  New secret
                </Button>
              </>
            )}
          </>
        )}
        <Button size="sm" variant="ghost" onClick={onToggleDeliveries}>
          <Webhook className="size-3.5" />
          Deliveries
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </Button>
        {!revoked && (
          <Button size="sm" variant="danger" className="ml-auto" onClick={() => onConfirm("revoke")}>
            Revoke
          </Button>
        )}
      </div>

      {expanded && <DeliveriesPanel integrationId={integration.id} />}
    </Card>
  );
}

function DeliveriesPanel({ integrationId }: { integrationId: string }) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["integration-deliveries", integrationId, page],
    queryFn: () => integrationApi.deliveries(integrationId, page)
  });
  const retry = useMutation({
    mutationFn: (deliveryId: string) => integrationApi.retryDelivery(deliveryId),
    onSuccess: (delivery) => {
      void qc.invalidateQueries({ queryKey: ["integration-deliveries", integrationId] });
      void qc.invalidateQueries({ queryKey: ["integrations"] });
      if (delivery.status === "SUCCEEDED") toast.success("Delivered");
      else toast.error(delivery.lastError ?? "Delivery failed again");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const items = q.data?.items ?? [];
  const meta = q.data?.meta;
  return (
    <div className="mt-4 border-t pt-4">
      {q.isLoading ? (
        <p className="text-sm text-slate-500">Loading deliveries…</p>
      ) : !items.length ? (
        <p className="text-sm text-slate-500">No webhook events yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Booking</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Result</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{formatWhen(d.createdAt)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{d.event}</td>
                  <td className="py-2 pr-3">
                    <div className="max-w-40 truncate">{d.payload?.data?.title ?? "—"}</div>
                    {d.payload?.data?.externalId && (
                      <div className="text-xs text-slate-500">{d.payload.data.externalId}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={d.status} />
                    <div className="mt-1 text-xs text-slate-500">
                      {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                      {d.status === "PENDING" && d.attempts > 0 ? ` · next ${formatWhen(d.nextAttemptAt)}` : ""}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs text-slate-600">
                    {d.lastStatusCode ? `HTTP ${d.lastStatusCode}` : ""}
                    {d.lastError && <div className="max-w-48 break-words text-red-600">{d.lastError}</div>}
                  </td>
                  <td className="py-2 text-right">
                    {d.status !== "SUCCEEDED" && (
                      <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate(d.id)}>
                        Retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-slate-500">
            {meta.page} / {meta.totalPages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
