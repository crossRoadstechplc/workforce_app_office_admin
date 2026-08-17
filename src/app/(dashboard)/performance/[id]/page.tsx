"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { performanceApi } from "@/features/performance/performance-api";
import { employeeName, formatDate } from "@/lib/utils/format";
import type { EvaluationGoal, EvaluationScore } from "@/types/performance";

export default function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <TenantOpsGate>
      <EvaluationWorkspace params={params} />
    </TenantOpsGate>
  );
}

function EvaluationWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isOfficeAdmin } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["evaluations", id], queryFn: () => performanceApi.get(id) });
  const [scores, setScores] = useState<Record<string, { evaluatorScore: string; evaluatorComment: string }>>({});
  const [goals, setGoals] = useState<Record<string, { improvementEvaluatorScore: string; targetDate: string; criteria: string }>>({});
  const [focus, setFocus] = useState("");
  const [plan, setPlan] = useState("");

  const ev = q.data;
  useEffect(() => {
    if (!ev) return;
    setScores(Object.fromEntries(ev.scores.map((s) => [s.itemKey, { evaluatorScore: s.evaluatorScore?.toString() ?? "", evaluatorComment: s.evaluatorComment ?? "" }])));
    setGoals(Object.fromEntries(ev.goals.map((g) => [g.id, { improvementEvaluatorScore: g.improvementEvaluatorScore?.toString() ?? "", targetDate: g.targetDate ?? "", criteria: g.criteria ?? "" }])));
    setFocus(ev.focusCompetency ?? "");
    setPlan(ev.actionPlan ?? "");
  }, [ev]);

  const canScore = ev && ["SELF_SUBMITTED", "EVALUATOR_DRAFT"].includes(ev.status);
  const canFinalize = ev && ev.status === "EVALUATOR_SUBMITTED" && !isOfficeAdmin;
  const locked = !canScore;

  const overall = useMemo(() => {
    if (!ev) return null;
    const scored = ev.scores.filter((s) => s.section === "METRIC" || s.section === "RESPONSIBILITY");
    const vals = scored.map((s) => Number(scores[s.itemKey]?.evaluatorScore)).filter((n) => Number.isFinite(n) && n >= 1);
    if (!vals.length) return ev.overallEvaluator;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }, [ev, scores]);

  const save = useMutation({
    mutationFn: () =>
      performanceApi.saveDraft(id, {
        scores: Object.entries(scores).map(([itemKey, v]) => ({
          itemKey,
          evaluatorScore: v.evaluatorScore ? Number(v.evaluatorScore) : null,
          evaluatorComment: v.evaluatorComment || null
        })),
        goals: Object.entries(goals).map(([gid, v]) => ({
          id: gid,
          improvementEvaluatorScore: v.improvementEvaluatorScore ? Number(v.improvementEvaluatorScore) : null,
          targetDate: v.targetDate || null,
          criteria: v.criteria || null
        })),
        focusCompetency: focus,
        actionPlan: plan
      }),
    onSuccess: (data) => {
      toast.success("Draft saved");
      qc.setQueryData(["evaluations", id], data);
      void qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const submit = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      return performanceApi.submit(id);
    },
    onSuccess: (data) => {
      toast.success("Evaluator scores submitted");
      qc.setQueryData(["evaluations", id], data);
      void qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const finalize = useMutation({
    mutationFn: () => performanceApi.finalize(id),
    onSuccess: (data) => {
      toast.success("Evaluation finalized");
      qc.setQueryData(["evaluations", id], data);
      void qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  if (!ev) return <p>Evaluation not found.</p>;

  const metrics = ev.scores.filter((s) => s.section === "METRIC");
  const roles = ev.scores.filter((s) => s.section === "RESPONSIBILITY");
  const snap = ev.periodSnapshot;

  return (
    <div className="space-y-6 pb-28">
      <div className="print:hidden">
        <Link href="/performance" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950">
          <ArrowLeft className="size-4" />
          Performance
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Internal performance evaluation</p>
          <h1 className="mt-1 text-2xl font-semibold">{employeeName(ev.employee)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ev.employee.jobTitle ?? "—"} · {ev.number} · {formatDate(ev.cycle.periodStart)} – {formatDate(ev.cycle.periodEnd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <StatusBadge status={ev.status} />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Employee</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Name" v={employeeName(ev.employee)} />
            <Row k="Position" v={ev.employee.jobTitle} />
            <Row k="Direct supervisor" v={ev.employee.supervisor?.name} />
            <Row k="Office" v={ev.employee.office?.name} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Period facts</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <Row k="Attendance days" v={String(snap?.attendanceDays ?? 0)} />
            <Row k="Late days" v={String(snap?.lateDays ?? 0)} />
            <Row k="Missing checkouts" v={String(snap?.missingCheckoutDays ?? 0)} />
            <Row k="Worksheets" v={String(snap?.worksheetsSubmitted ?? 0)} />
            <Row k="Leave days" v={String(snap?.approvedLeaveDays ?? 0)} />
            <Row k="Late minutes" v={String(snap?.lateMinutes ?? 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scores</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Self average" v={ev.overallSelf?.toFixed(1) ?? "—"} />
            <Row k="Evaluator average" v={overall?.toFixed?.(1) ?? (overall == null ? "—" : String(overall))} />
            <Row k="Cycle" v={ev.cycle.name} />
          </CardContent>
        </Card>
      </div>

      <ScoreTable title="Metrics" rows={metrics} scores={scores} locked={locked} onChange={setScores} />
      <ScoreTable title="Roles & responsibilities" rows={roles} scores={scores} locked={locked} onChange={setScores} />

      <Card>
        <CardHeader><CardTitle>Skill improved over previous period</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="pb-2">Skill</th>
                <th className="pb-2">Previous</th>
                <th className="pb-2">Self (1–10)</th>
                <th className="pb-2">Evaluator (1–10)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ev.goals.map((g) => (
                <tr key={g.id}>
                  <td className="py-3 pr-3 font-medium">{g.skill}</td>
                  <td className="py-3">{g.previousSelfScore ?? "—"} / {g.previousEvaluatorScore ?? "—"}</td>
                  <td className="py-3">{g.improvementSelfScore ?? "—"}</td>
                  <td className="py-3">
                    <ScoreInput
                      disabled={locked}
                      value={goals[g.id]?.improvementEvaluatorScore ?? ""}
                      onChange={(v) => setGoals((prev) => ({ ...prev, [g.id]: { ...goalState(prev, g), improvementEvaluatorScore: v } }))}
                    />
                  </td>
                </tr>
              ))}
              {!ev.goals.length && <tr><td colSpan={4} className="py-6 text-slate-500">No skill rows on this template.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Skill development goals</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ev.goals.map((g) => (
            <div key={g.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-3">
              <div className="md:col-span-3 font-medium">{g.skill}</div>
              <div>
                <Label>Target date</Label>
                <Input type="date" disabled={locked} value={goals[g.id]?.targetDate ?? ""} onChange={(e) => setGoals((prev) => ({ ...prev, [g.id]: { ...goalState(prev, g), targetDate: e.target.value } }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Evaluation criteria</Label>
                <Textarea disabled={locked} value={goals[g.id]?.criteria ?? ""} onChange={(e) => setGoals((prev) => ({ ...prev, [g.id]: { ...goalState(prev, g), criteria: e.target.value } }))} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Focus and action plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Competency to focus on for the biggest organizational impact</Label>
            <Textarea disabled={locked} value={focus} onChange={(e) => setFocus(e.target.value)} />
          </div>
          <div>
            <Label>Action plans or steps</Label>
            <Textarea disabled={locked} value={plan} onChange={(e) => setPlan(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="print:hidden fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            Evaluator average <b>{overall ?? "—"}</b>
            {ev.status === "OPEN" || ev.status === "SELF_DRAFT" ? <span className="ml-2 text-slate-500">Waiting for employee self-scores.</span> : null}
          </div>
          <div className="flex gap-2">
            {canScore && (
              <>
                <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate()}>
                  <Save className="size-4" />
                  Save draft
                </Button>
                <Button disabled={submit.isPending} onClick={() => submit.mutate()}>Submit scores</Button>
              </>
            )}
            {canFinalize && (
              <Button disabled={finalize.isPending} onClick={() => finalize.mutate()}>Finalize</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function goalState(
  prev: Record<string, { improvementEvaluatorScore: string; targetDate: string; criteria: string }>,
  g: EvaluationGoal
) {
  return prev[g.id] ?? { improvementEvaluatorScore: "", targetDate: g.targetDate ?? "", criteria: g.criteria ?? "" };
}

function ScoreTable({
  title,
  rows,
  scores,
  locked,
  onChange
}: {
  title: string;
  rows: EvaluationScore[];
  scores: Record<string, { evaluatorScore: string; evaluatorComment: string }>;
  locked: boolean;
  onChange: React.Dispatch<React.SetStateAction<Record<string, { evaluatorScore: string; evaluatorComment: string }>>>;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="pb-2">Item</th>
              <th className="pb-2">Self</th>
              <th className="pb-2">Evaluator</th>
              <th className="pb-2">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const evScore = Number(scores[row.itemKey]?.evaluatorScore);
              const gap = row.selfScore != null && Number.isFinite(evScore) ? Math.abs(row.selfScore - evScore) : 0;
              const warn = Number.isFinite(evScore) && (evScore <= 4 || gap >= 3);
              return (
                <tr key={row.itemKey} className={warn ? "bg-amber-50/70" : undefined}>
                  <td className="py-3 pr-3 font-medium">{row.label}</td>
                  <td className="py-3 text-slate-500">{row.selfScore ?? "—"}</td>
                  <td className="py-3">
                    <ScoreInput
                      disabled={locked}
                      value={scores[row.itemKey]?.evaluatorScore ?? ""}
                      onChange={(v) => onChange((prev) => ({ ...prev, [row.itemKey]: { evaluatorScore: v, evaluatorComment: prev[row.itemKey]?.evaluatorComment ?? "" } }))}
                    />
                  </td>
                  <td className="py-3 min-w-56">
                    <Textarea
                      className="min-h-16"
                      disabled={locked}
                      value={scores[row.itemKey]?.evaluatorComment ?? ""}
                      onChange={(e) => onChange((prev) => ({ ...prev, [row.itemKey]: { evaluatorScore: prev[row.itemKey]?.evaluatorScore ?? "", evaluatorComment: e.target.value } }))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ScoreInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(String(n))}
          className={`size-8 rounded-md text-xs font-semibold ${value === String(n) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-50`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{k}</div>
      <div className="font-medium">{v || "—"}</div>
    </div>
  );
}
