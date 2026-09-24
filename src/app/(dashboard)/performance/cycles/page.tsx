"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { performanceApi } from "@/features/performance/performance-api";
import { employeeApi } from "@/features/employees/employee-api";
import { formatDate } from "@/lib/utils/format";
import type { EvaluationCycle } from "@/types/performance";

export default function CyclesPage() {
  return (
    <CompanyAdminGate>
      <CyclesInner />
    </CompanyAdminGate>
  );
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

type CycleFormProps = {
  name: string;
  setName: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  selfDue: string;
  setSelfDue: (v: string) => void;
  evalDue: string;
  setEvalDue: (v: string) => void;
  officeId: string;
  setOfficeId: (v: string) => void;
  templateId: string;
  setTemplateId: (v: string) => void;
  offices: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  presets: { label: string; from: string }[];
  today: string;
  showNameAndDates?: boolean;
};

function CycleFormFields({
  name,
  setName,
  from,
  setFrom,
  to,
  setTo,
  selfDue,
  setSelfDue,
  evalDue,
  setEvalDue,
  officeId,
  setOfficeId,
  templateId,
  setTemplateId,
  offices,
  templates,
  presets,
  today,
  showNameAndDates = true
}: CycleFormProps) {
  return (
    <>
      {showNameAndDates && (
        <>
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => { setFrom(p.from); setTo(today); }}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Self-score due</Label>
              <Input type="date" value={selfDue} onChange={(e) => setSelfDue(e.target.value)} />
            </div>
            <div>
              <Label>Evaluator due</Label>
              <Input type="date" value={evalDue} onChange={(e) => setEvalDue(e.target.value)} />
            </div>
          </div>
        </>
      )}
      <div>
        <Label>Office</Label>
        <Select value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
          <option value="">All active employees</option>
          {offices.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Template override</Label>
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">Match job title, else default</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </div>
    </>
  );
}

function CyclesInner() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["evaluation-cycles"],
    queryFn: () => performanceApi.cycles(new URLSearchParams({ page: "1", pageSize: "100" }))
  });
  const templates = useQuery({ queryKey: ["evaluation-templates"], queryFn: performanceApi.templates });
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices });
  const [createOpen, setCreateOpen] = useState(false);
  const [openDraftId, setOpenDraftId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(today);
  const [name, setName] = useState("Q review");
  const [officeId, setOfficeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selfDue, setSelfDue] = useState("");
  const [evalDue, setEvalDue] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["evaluation-cycles"] });
    void qc.invalidateQueries({ queryKey: ["evaluations"] });
  };

  const cycleBody = (open: boolean) => ({
    name,
    periodStart: from,
    periodEnd: to,
    officeId: officeId || undefined,
    templateId: templateId || undefined,
    selfDueAt: selfDue ? new Date(selfDue).toISOString() : undefined,
    evaluatorDueAt: evalDue ? new Date(evalDue).toISOString() : undefined,
    open
  });

  const openBody = () => ({
    officeId: officeId || undefined,
    templateId: templateId || undefined
  });

  const saveDraft = useMutation({
    mutationFn: () => performanceApi.createCycle(cycleBody(false)),
    onSuccess: () => {
      toast.success("Cycle saved as draft");
      setCreateOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const createAndOpen = useMutation({
    mutationFn: () => performanceApi.createCycle(cycleBody(true)),
    onSuccess: () => {
      toast.success("Cycle opened and evaluations created");
      setCreateOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const openDraft = useMutation({
    mutationFn: (id: string) => performanceApi.openCycle(id, openBody()),
    onSuccess: () => {
      toast.success("Cycle opened and evaluations created");
      setOpenDraftId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const removeCycle = useMutation({
    mutationFn: ({ id }: { id: string; wasDraft: boolean }) => performanceApi.deleteCycle(id),
    onSuccess: (_data, { wasDraft }) => {
      toast.success(wasDraft ? "Draft deleted" : "Cycle deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const confirmDeleteDraft = (cycle: EvaluationCycle) => {
    if (!window.confirm(`Delete draft "${cycle.name}"? This cannot be undone.`)) return;
    removeCycle.mutate({ id: cycle.id, wasDraft: true });
  };

  const confirmDeleteClosed = (cycle: EvaluationCycle) => {
    const count = cycle.counts?.total ?? 0;
    if (
      !window.confirm(
        `Permanently delete this closed cycle and all ${count} evaluation${count === 1 ? "" : "s"}? Employees will no longer see them. This cannot be undone.`
      )
    ) {
      return;
    }
    removeCycle.mutate({ id: cycle.id, wasDraft: false });
  };

  const close = useMutation({
    mutationFn: (id: string) => performanceApi.closeCycle(id),
    onSuccess: () => {
      toast.success("Cycle closed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const presets = useMemo(
    () => [
      { label: "Last 1 month", from: isoDaysAgo(30) },
      { label: "Last 3 months", from: isoDaysAgo(90) },
      { label: "Last 6 months", from: isoDaysAgo(180) },
      { label: "Last 12 months", from: isoDaysAgo(365) }
    ],
    []
  );

  const formProps: CycleFormProps = {
    name,
    setName,
    from,
    setFrom,
    to,
    setTo,
    selfDue,
    setSelfDue,
    evalDue,
    setEvalDue,
    officeId,
    setOfficeId,
    templateId,
    setTemplateId,
    offices: offices.data ?? [],
    templates: templates.data ?? [],
    presets,
    today
  };

  if (q.isLoading) return <PageSkeleton />;
  const items = q.data?.items ?? [];
  const drafts = items.filter((c) => c.status === "DRAFT");
  const active = items.filter((c) => c.status !== "DRAFT");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation cycles"
        action={<Button onClick={() => setCreateOpen(true)}>New cycle</Button>}
      />
      <p className="text-sm">
        <Link href="/performance" className="text-blue-700 hover:underline">Back to queue</Link>
      </p>

      {drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">Drafts</h2>
          <TableShell>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Name", "Period", "Status", ""].map((h) => (
                    <th key={h || "a"} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {drafts.map((c) => (
                  <DraftRow
                    key={c.id}
                    cycle={c}
                    onOpen={() => { setOfficeId(""); setTemplateId(""); setOpenDraftId(c.id); }}
                    onDelete={() => confirmDeleteDraft(c)}
                    deleting={removeCycle.isPending}
                  />
                ))}
              </tbody>
            </table>
          </TableShell>
        </section>
      )}

      <section className="space-y-2">
        {drafts.length > 0 && <h2 className="text-sm font-semibold text-slate-700">Active & closed cycles</h2>}
        <TableShell>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Name", "Period", "Status", "Awaiting self", "Awaiting evaluator", "Done", ""].map((h) => (
                  <th key={h || "a"} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {active.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{formatDate(c.periodStart)} – {formatDate(c.periodEnd)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">{c.counts?.awaitingSelf ?? "—"}</td>
                  <td className="px-4 py-3">{c.counts?.awaitingEvaluator ?? "—"}</td>
                  <td className="px-4 py-3">{c.counts?.done ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/performance?cycleId=${c.id}`}>View</Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => performanceApi.exportCycle(c.id).then(() => toast.success("CSV exported")).catch((e: Error) => toast.error(e.message))}>
                        <Download className="size-4" />
                        CSV
                      </Button>
                      {c.status !== "CLOSED" && (
                        <Button variant="ghost" size="sm" onClick={() => close.mutate(c.id)}>Close</Button>
                      )}
                      {c.status === "CLOSED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removeCycle.isPending}
                          onClick={() => confirmDeleteClosed(c)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!active.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No open or closed cycles yet.</td></tr>
              )}
            </tbody>
          </table>
        </TableShell>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>New evaluation cycle</DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createAndOpen.mutate();
            }}
          >
            <CycleFormFields {...formProps} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                type="button"
                variant="outline"
                disabled={saveDraft.isPending || createAndOpen.isPending}
                onClick={() => saveDraft.mutate()}
              >
                {saveDraft.isPending ? "Saving…" : "Save as draft"}
              </Button>
              <Button type="submit" disabled={saveDraft.isPending || createAndOpen.isPending}>
                {createAndOpen.isPending ? "Opening…" : "Open cycle"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openDraftId} onOpenChange={(v) => { if (!v) setOpenDraftId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Open draft cycle</DialogTitle>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (openDraftId) openDraft.mutate(openDraftId);
            }}
          >
            <p className="text-sm text-slate-600">
              Choose which employees and template to use when opening this cycle.
            </p>
            <CycleFormFields {...formProps} showNameAndDates={false} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenDraftId(null)}>Cancel</Button>
              <Button type="submit" disabled={openDraft.isPending}>
                {openDraft.isPending ? "Opening…" : "Open cycle"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraftRow({
  cycle,
  onOpen,
  onDelete,
  deleting
}: {
  cycle: EvaluationCycle;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium">{cycle.name}</td>
      <td className="px-4 py-3">{formatDate(cycle.periodStart)} – {formatDate(cycle.periodEnd)}</td>
      <td className="px-4 py-3"><StatusBadge status={cycle.status} /></td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={onOpen}>Open</Button>
          <Button variant="ghost" size="sm" disabled={deleting} onClick={onDelete}>Delete</Button>
        </div>
      </td>
    </tr>
  );
}
