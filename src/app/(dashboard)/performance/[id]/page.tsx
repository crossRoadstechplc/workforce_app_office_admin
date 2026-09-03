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
import { EmojiRating } from "@/components/performance/emoji-rating";
import { performanceApi } from "@/features/performance/performance-api";
import { employeeName, formatDate } from "@/lib/utils/format";
import { bandFromTotal, isSystemScore, type EvaluationScore } from "@/types/performance";

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
  const [focus, setFocus] = useState("");
  const [plan, setPlan] = useState("");

  const ev = q.data;
  useEffect(() => {
    if (!ev) return;
    setScores(
      Object.fromEntries(
        ev.scores.map((s) => [s.itemKey, { evaluatorScore: s.evaluatorScore?.toString() ?? "", evaluatorComment: s.evaluatorComment ?? "" }])
      )
    );
    setFocus(ev.focusCompetency ?? "");
    setPlan(ev.actionPlan ?? "");
  }, [ev]);

  const canScore = ev && ["SELF_SUBMITTED", "EVALUATOR_DRAFT"].includes(ev.status);
  const canFinalize = ev && ev.status === "EVALUATOR_SUBMITTED" && !isOfficeAdmin;
  const locked = !canScore;

  const overall = useMemo(() => {
    if (!ev) return null;
    let total = 0;
    for (const s of ev.scores) {
      if (isSystemScore(s)) {
        if (s.systemScore == null) return ev.overallEvaluator;
        total += s.systemScore;
      } else {
        const n = Number(scores[s.itemKey]?.evaluatorScore);
        if (!Number.isFinite(n)) return ev.overallEvaluator;
        total += n;
      }
    }
    return total;
  }, [ev, scores]);

  const band = bandFromTotal(overall);

  const save = useMutation({
    mutationFn: () =>
      performanceApi.saveDraft(id, {
        scores: Object.entries(scores)
          .filter(([itemKey]) => !isSystemScore({ itemKey, scoringSource: ev?.scores.find((s) => s.itemKey === itemKey)?.scoringSource }))
          .map(([itemKey, v]) => ({
            itemKey,
            evaluatorScore: v.evaluatorScore ? Number(v.evaluatorScore) : null,
            evaluatorComment: v.evaluatorComment || null
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee performance evaluation</p>
          <h1 className="mt-1 text-2xl font-semibold">{employeeName(ev.employee)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {ev.employee.jobTitle ?? "—"} · {ev.employee.department ?? "—"} · {ev.number}
          </p>
          <p className="text-sm text-slate-500">
            Period {formatDate(ev.cycle.periodStart)} – {formatDate(ev.cycle.periodEnd)} · {ev.cycle.name}
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
            <Row k="Department" v={ev.employee.department} />
            <Row k="Evaluator" v={ev.employee.supervisor?.name ?? ev.evaluator?.email} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Attendance (system)</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <Row k="Expected days" v={String(snap?.expectedDays ?? "—")} />
            <Row k="Attended" v={String(snap?.attendanceDays ?? 0)} />
            <Row k="Late days" v={String(snap?.lateDays ?? 0)} />
            <Row k="Approved leave" v={String(snap?.approvedLeaveDays ?? 0)} />
            <Row k="Unexcused absent" v={String(snap?.unexcusedAbsentDays ?? 0)} />
            <Row k="System rating" v={snap?.systemAttendanceScore != null ? `${snap.systemAttendanceScore} / 5` : "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="Self" v={ev.overallSelf == null ? "—" : `${ev.overallSelf} / 50`} />
            <Row k="Evaluator" v={overall == null ? "—" : `${overall} / 50`} />
            {band ? <Row k="Overall performance" v={band.label} /> : null}
            <Row k="Cycle" v={ev.cycle.name} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {ev.scores.map((row) => (
          <CompetencyCard
            key={row.itemKey}
            row={row}
            draft={scores[row.itemKey]}
            locked={locked || isSystemScore(row)}
            onChange={(patch) =>
              setScores((prev) => ({
                ...prev,
                [row.itemKey]: {
                  evaluatorScore: patch.evaluatorScore ?? prev[row.itemKey]?.evaluatorScore ?? "",
                  evaluatorComment: patch.evaluatorComment ?? prev[row.itemKey]?.evaluatorComment ?? ""
                }
              }))
            }
          />
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Key strengths</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea disabled={locked} value={focus} onChange={(e) => setFocus(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Development notes</Label>
            <Textarea disabled={locked} value={plan} onChange={(e) => setPlan(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="print:hidden fixed inset-x-0 bottom-0 z-20 border-t bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            Official total <b>{overall ?? "—"} / 50</b>
            {band ? <span className="ml-2 text-slate-500">{band.label}</span> : null}
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

function CompetencyCard({
  row,
  draft,
  locked,
  onChange
}: {
  row: EvaluationScore;
  draft?: { evaluatorScore: string; evaluatorComment: string };
  locked: boolean;
  onChange: (patch: { evaluatorScore?: string; evaluatorComment?: string }) => void;
}) {
  const system = isSystemScore(row);
  const evScore = Number(draft?.evaluatorScore);
  const gap = row.selfScore != null && Number.isFinite(evScore) ? Math.abs(row.selfScore - evScore) : 0;
  const warn = !system && Number.isFinite(evScore) && (evScore <= 2 || gap >= 2);

  return (
    <Card className={warn ? "ring-1 ring-amber-300" : undefined}>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{row.label}</h3>
            {row.prompt ? <p className="mt-1 text-sm text-slate-500">{row.prompt}</p> : null}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Self</p>
            <EmojiRating value={row.selfScore} disabled />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{system ? "System" : "Your rating"}</p>
            <EmojiRating
              value={system ? row.systemScore : draft?.evaluatorScore ? Number(draft.evaluatorScore) : null}
              disabled={locked || system}
              onChange={(n) => onChange({ evaluatorScore: String(n) })}
            />
          </div>
        </div>
        {!system && (
          <div>
            <Label>Comment</Label>
            <Textarea
              className="mt-1 min-h-16"
              disabled={locked}
              value={draft?.evaluatorComment ?? ""}
              onChange={(e) => onChange({ evaluatorComment: e.target.value })}
            />
          </div>
        )}
      </CardContent>
    </Card>
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
