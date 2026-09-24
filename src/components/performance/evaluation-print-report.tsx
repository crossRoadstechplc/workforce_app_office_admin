"use client";

import { useEffect } from "react";
import { employeeName, formatDate } from "@/lib/utils/format";
import {
  bandFromTotal,
  isSystemScore,
  type Evaluation,
  type EvaluationScore
} from "@/types/performance";

function scoreDisplay(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return "—";
  const match = [
    [1, "Unsatisfactory"],
    [2, "Needs Imp."],
    [3, "Meets"],
    [4, "Exceeds"],
    [5, "Outstanding"]
  ].find(([v]) => v === score);
  return match ? `${score} ${match[1]}` : String(score);
}

function scoreValue(row: EvaluationScore, draft?: { evaluatorScore: string }) {
  if (isSystemScore(row)) return row.systemScore;
  if (draft?.evaluatorScore) {
    const n = Number(draft.evaluatorScore);
    return Number.isFinite(n) ? n : row.evaluatorScore;
  }
  return row.evaluatorScore;
}

/** Clears browser print header/footer title ("Workforce Control") for this print only. */
export function useCleanPrintTitle() {
  useEffect(() => {
    const prev = document.title;
    const onBefore = () => {
      document.title = " ";
    };
    const onAfter = () => {
      document.title = prev;
    };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
      document.title = prev;
    };
  }, []);
}

export function EvaluationPrintReport({
  evaluation,
  scores,
  overall,
  focus,
  plan
}: {
  evaluation: Evaluation;
  scores: Record<string, { evaluatorScore: string; evaluatorComment: string }>;
  overall: number | null;
  focus: string;
  plan: string;
}) {
  const ev = evaluation;
  const band = bandFromTotal(overall);
  const manager = ev.employee.supervisor;
  const managerName = manager?.name ?? ev.evaluator?.email ?? "—";
  const managerTitle = manager?.jobTitle?.trim() || "Manager / Evaluator";

  return (
    <div className="evaluation-print-report hidden print:block">
      <div className="print-body">
        <header className="print-doc-header">
          <p className="print-eyebrow">Performance review · Confidential</p>
          <h1>Employee Performance Evaluation</h1>
        </header>

        <section className="print-section">
          <h2>1. Personal details</h2>
          <table className="print-kv">
            <tbody>
              <tr>
                <th>Employee</th>
                <td>{employeeName(ev.employee)}</td>
                <th>Position</th>
                <td>{ev.employee.jobTitle || "—"}</td>
              </tr>
              <tr>
                <th>Department</th>
                <td>{ev.employee.department || "—"}</td>
                <th>Office</th>
                <td>{ev.employee.office?.name || "—"}</td>
              </tr>
              <tr>
                <th>Manager</th>
                <td>
                  {managerName}
                  {manager?.jobTitle ? ` · ${manager.jobTitle}` : ""}
                </td>
                <th>Document no.</th>
                <td>{ev.number}</td>
              </tr>
              <tr>
                <th>Cycle</th>
                <td>{ev.cycle.name}</td>
                <th>Review period</th>
                <td>
                  {formatDate(ev.cycle.periodStart)} – {formatDate(ev.cycle.periodEnd)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="print-section print-eval">
          <h2>2. Evaluation results</h2>
          <p className="print-scale">
            Scale: 1 Unsatisfactory · 2 Needs Imp. · 3 Meets · 4 Exceeds · 5 Outstanding
          </p>
          <table className="print-scores">
            <thead>
              <tr>
                <th className="col-comp">Competency / question</th>
                <th className="col-score">Self</th>
                <th className="col-score">Manager</th>
                <th className="col-comment">Manager comment</th>
              </tr>
            </thead>
            <tbody>
              {ev.scores.map((row) => {
                const draft = scores[row.itemKey];
                const evaluatorScore = scoreValue(row, draft);
                const comment = isSystemScore(row)
                  ? "System attendance score"
                  : (draft?.evaluatorComment || row.evaluatorComment || "—").trim();
                const question = row.prompt?.trim().replace(/\s+/g, " ") || null;
                return (
                  <tr key={row.itemKey}>
                    <td>
                      <div className="comp-label">{row.label}</div>
                      {question ? <div className="comp-desc">{question}</div> : null}
                    </td>
                    <td className="col-score">{scoreDisplay(row.selfScore)}</td>
                    <td className="col-score">{scoreDisplay(evaluatorScore)}</td>
                    <td className="col-comment">{comment}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <table className="print-summary">
            <tbody>
              <tr>
                <th>Self total</th>
                <td>{ev.overallSelf == null ? "—" : `${ev.overallSelf} / 50`}</td>
                <th>Manager total</th>
                <td>{overall == null ? "—" : `${overall} / 50`}</td>
                <th>Overall band</th>
                <td>{band?.label ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="print-section print-narrative">
          <h2>3. Manager narrative</h2>
          <div className="print-note">
            <h3>Key strengths</h3>
            <p>{focus.trim() || "—"}</p>
          </div>
          <div className="print-note">
            <h3>Development notes</h3>
            <p>{plan.trim() || "—"}</p>
          </div>
        </section>
      </div>

      <section className="print-signatures">
        <div className="sig-block">
          <div className="sig-line" />
          <p className="sig-role">Employee acknowledgement</p>
          <p className="sig-name">{employeeName(ev.employee)}</p>
          <p className="sig-meta">Signature / date</p>
        </div>
        <div className="sig-block sig-manager">
          <div className="sig-line" />
          <p className="sig-role">Manager evaluation</p>
          <p className="sig-name">{managerName}</p>
          <p className="sig-meta">
            {managerTitle} · Signature / date
          </p>
        </div>
        <div className="sig-block">
          <div className="sig-line" />
          <p className="sig-role">CEO / HR review</p>
          <p className="sig-name">Approver</p>
          <p className="sig-meta">Signature / date</p>
        </div>
      </section>
    </div>
  );
}
