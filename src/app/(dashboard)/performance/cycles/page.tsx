"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { performanceApi } from "@/features/performance/performance-api";
import { employeeApi } from "@/features/employees/employee-api";
import { formatDate } from "@/lib/utils/format";

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

function CyclesInner() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["evaluation-cycles"], queryFn: () => performanceApi.cycles() });
  const templates = useQuery({ queryKey: ["evaluation-templates"], queryFn: performanceApi.templates });
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices });
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(today);
  const [name, setName] = useState("Q review");
  const [officeId, setOfficeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selfDue, setSelfDue] = useState("");
  const [evalDue, setEvalDue] = useState("");

  const create = useMutation({
    mutationFn: () =>
      performanceApi.createCycle({
        name,
        periodStart: from,
        periodEnd: to,
        officeId: officeId || undefined,
        templateId: templateId || undefined,
        selfDueAt: selfDue ? new Date(selfDue).toISOString() : undefined,
        evaluatorDueAt: evalDue ? new Date(evalDue).toISOString() : undefined,
        open: true
      }),
    onSuccess: () => {
      toast.success("Cycle opened and evaluations created");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["evaluation-cycles"] });
      void qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const close = useMutation({
    mutationFn: (id: string) => performanceApi.closeCycle(id),
    onSuccess: () => {
      toast.success("Cycle closed");
      void qc.invalidateQueries({ queryKey: ["evaluation-cycles"] });
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

  if (q.isLoading) return <PageSkeleton />;
  const items = q.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation cycles"
        description="Open a cycle for any date range. Employees are notified to self-score; office and company admins then evaluate."
        action={<Button onClick={() => setOpen(true)}>New cycle</Button>}
      />
      <p className="text-sm">
        <Link href="/performance" className="text-blue-700 hover:underline">Back to queue</Link>
      </p>
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
            {items.map((c) => (
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
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No cycles yet.</td></tr>
            )}
          </tbody>
        </table>
      </TableShell>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Open evaluation cycle</DialogTitle>
          <DialogDescription>Choose any date range. Presets only fill the dates — the cycle stores from and to.</DialogDescription>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
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
            <div>
              <Label>Office</Label>
              <Select value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                <option value="">All active employees</option>
                {(offices.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Template override</Label>
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Match job title, else default</option>
                {(templates.data ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? "Opening…" : "Open cycle"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
