import { employeeName, formatDate, formatDateRange } from "@/lib/utils/format";
import { bandFromTotal, isSystemScore, type Evaluation } from "@/types/performance";
import type { jsPDF as JsPdfType } from "jspdf";

const MARGIN = 14;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

type Doc = JsPdfType;

function scoreLabel(score: number | null | undefined) {
  if (score == null || !Number.isFinite(score)) return "";
  const labels: Record<number, string> = {
    1: "Unsatisfactory",
    2: "Needs Imp.",
    3: "Meets",
    4: "Exceeds",
    5: "Outstanding"
  };
  return labels[score] ? `${score} ${labels[score]}` : String(score);
}

function safeFilenamePart(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

export function evaluationPdfFilename(ev: Evaluation) {
  const name = safeFilenamePart(employeeName(ev.employee) || "employee");
  const number = safeFilenamePart(ev.number || ev.id);
  return `evaluation_${number}_${name}.pdf`;
}

function ensureSpace(doc: Doc, y: number, needed: number) {
  if (y + needed <= PAGE_H - MARGIN) return y;
  doc.addPage();
  return MARGIN;
}

function sectionTitle(doc: Doc, title: string, y: number) {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(title, MARGIN, y);
  y += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 6;
}

function kvRow(
  doc: Doc,
  y: number,
  leftLabel: string,
  leftValue: string,
  rightLabel: string,
  rightValue: string
) {
  const colW = CONTENT_W / 2;
  const labelW = 28;
  y = ensureSpace(doc, y, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(leftLabel, MARGIN, y);
  doc.text(rightLabel, MARGIN + colW, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const leftLines = doc.splitTextToSize(leftValue || "", colW - labelW - 4);
  const rightLines = doc.splitTextToSize(rightValue || "", colW - labelW - 4);
  doc.text(leftLines, MARGIN + labelW, y);
  doc.text(rightLines, MARGIN + colW + labelW, y);
  return y + Math.max(leftLines.length, rightLines.length) * 4.2 + 2;
}

export async function buildEvaluationPdf(ev: Evaluation): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const manager = ev.employee.supervisor;
  const managerName = manager?.name ?? ev.evaluator?.email ?? "";
  const overall = ev.overallEvaluator;
  const band = bandFromTotal(overall);

  let y = MARGIN;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Performance review · Confidential", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("Employee Performance Evaluation", MARGIN, y);
  y += 10;

  y = sectionTitle(doc, "1. Personal details", y);
  y = kvRow(doc, y, "Employee", employeeName(ev.employee), "Position", ev.employee.jobTitle || "");
  y = kvRow(doc, y, "Department", ev.employee.department || "", "Office", ev.employee.office?.name || "");
  y = kvRow(
    doc,
    y,
    "Manager",
    manager?.jobTitle ? `${managerName} · ${manager.jobTitle}` : managerName,
    "Document no.",
    ev.number
  );
  y = kvRow(
    doc,
    y,
    "Cycle",
    ev.cycle.name,
    "Review period",
    formatDateRange(ev.cycle.periodStart, ev.cycle.periodEnd)
  );
  y += 4;

  y = sectionTitle(doc, "2. Evaluation results", y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Scale: 1 Unsatisfactory · 2 Needs Imp. · 3 Meets · 4 Exceeds · 5 Outstanding", MARGIN, y);
  y += 6;

  const cols = {
    comp: MARGIN,
    self: MARGIN + 88,
    mgr: MARGIN + 118,
    comment: MARGIN + 148
  };
  const widths = { comp: 84, self: 28, mgr: 28, comment: CONTENT_W - 140 };

  const drawScoreHeader = () => {
    y = ensureSpace(doc, y, 10);
    doc.setFillColor(248, 250, 252);
    doc.rect(MARGIN, y - 4, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Competency / question", cols.comp + 1, y);
    doc.text("Self", cols.self + 1, y);
    doc.text("Manager", cols.mgr + 1, y);
    doc.text("Manager comment", cols.comment + 1, y);
    y += 6;
  };

  drawScoreHeader();

  for (const row of ev.scores) {
    const evaluatorScore = isSystemScore(row) ? row.systemScore : row.evaluatorScore;
    const comment = isSystemScore(row)
      ? "System attendance score"
      : (row.evaluatorComment || "").trim();
    const question = row.prompt?.trim().replace(/\s+/g, " ") || "";
    const labelLines = doc.splitTextToSize(row.label, widths.comp - 2);
    const questionLines = question ? doc.splitTextToSize(question, widths.comp - 2) : [];
    const commentLines = doc.splitTextToSize(comment, widths.comment - 2);
    const blockH = Math.max(labelLines.length + questionLines.length, commentLines.length) * 3.8 + 4;

    if (y + blockH > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
      drawScoreHeader();
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(labelLines, cols.comp + 1, y + 2);
    let localY = y + 2 + labelLines.length * 3.8;
    if (questionLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(questionLines, cols.comp + 1, localY);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(scoreLabel(row.selfScore), cols.self + 1, y + 2);
    doc.text(scoreLabel(evaluatorScore), cols.mgr + 1, y + 2);
    doc.text(commentLines, cols.comment + 1, y + 2);
    y += blockH;
  }

  y = ensureSpace(doc, y, 16);
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, y - 3, CONTENT_W, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Self total", MARGIN + 2, y + 4);
  doc.text("Manager total", MARGIN + 55, y + 4);
  doc.text("Overall band", MARGIN + 115, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(ev.overallSelf == null ? "" : `${ev.overallSelf} / 50`, MARGIN + 22, y + 4);
  doc.text(overall == null ? "" : `${overall} / 50`, MARGIN + 82, y + 4);
  doc.text(band?.label ?? "", MARGIN + 142, y + 4);
  y += 16;

  y = sectionTitle(doc, "3. Manager narrative", y);

  const noteBlock = (title: string, body: string) => {
    const lines = doc.splitTextToSize(body.trim() || "", CONTENT_W - 6);
    const h = 8 + lines.length * 4.2;
    y = ensureSpace(doc, y, h + 2);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(MARGIN, y - 3, CONTENT_W, h, 1.5, 1.5, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(title, MARGIN + 3, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(lines, MARGIN + 3, y + 7);
    y += h + 4;
  };

  noteBlock("Key strengths", ev.focusCompetency || "");
  noteBlock("Development notes", ev.actionPlan || "");

  y = ensureSpace(doc, y, 36);
  y += 6;
  const sigW = (CONTENT_W - 8) / 3;
  const signatures = [
    { role: "Employee acknowledgement", name: employeeName(ev.employee) },
    { role: "Manager evaluation", name: managerName },
    { role: "CEO / HR review", name: "Approver" }
  ];
  signatures.forEach((sig, i) => {
    const x = MARGIN + i * (sigW + 4);
    doc.setDrawColor(148, 163, 184);
    doc.line(x, y, x + sigW - 4, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(sig.role, x, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(sig.name, x, y + 10);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Signature / date", x, y + 15);
  });

  return doc.output("blob");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadEvaluationPdf(ev: Evaluation) {
  const blob = await buildEvaluationPdf(ev);
  triggerDownload(blob, evaluationPdfFilename(ev));
}

export async function downloadEvaluationsZip(
  evaluations: Evaluation[],
  onProgress?: (done: number, total: number, label: string) => void
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const used = new Set<string>();

  for (let i = 0; i < evaluations.length; i++) {
    const ev = evaluations[i]!;
    onProgress?.(i, evaluations.length, employeeName(ev.employee));
    let filename = evaluationPdfFilename(ev);
    if (used.has(filename)) {
      const base = filename.replace(/\.pdf$/i, "");
      filename = `${base}_${i + 1}.pdf`;
    }
    used.add(filename);
    zip.file(filename, await buildEvaluationPdf(ev));
    onProgress?.(i + 1, evaluations.length, employeeName(ev.employee));
  }

  onProgress?.(evaluations.length, evaluations.length, "Packaging ZIP…");
  const blob = await zip.generateAsync({ type: "blob" });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `performance_evaluations_${stamp}.zip`);
}
