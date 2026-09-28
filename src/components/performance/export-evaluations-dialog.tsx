"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { performanceApi } from "@/features/performance/performance-api";
import {
  downloadEvaluationPdf,
  downloadEvaluationsZip
} from "@/lib/performance/evaluation-pdf";
import { employeeName } from "@/lib/utils/format";
import type { Evaluation } from "@/types/performance";

type Phase = "idle" | "fetching" | "building" | "done" | "error";

export function ExportEvaluationsDialog({
  open,
  onOpenChange,
  ids
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentLabel, setCurrentLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!open) {
      started.current = false;
      setPhase("idle");
      setDone(0);
      setTotal(0);
      setCurrentLabel("");
      setError(null);
      return;
    }
    if (started.current || ids.length === 0) return;
    started.current = true;

    void (async () => {
      try {
        setPhase("fetching");
        setTotal(ids.length);
        setDone(0);
        const evaluations: Evaluation[] = [];

        for (let i = 0; i < ids.length; i++) {
          const id = ids[i]!;
          setCurrentLabel(`Loading evaluation ${i + 1} of ${ids.length}…`);
          const ev = await performanceApi.get(id);
          evaluations.push(ev);
          setDone(i + 1);
        }

        setPhase("building");
        setDone(0);
        setTotal(evaluations.length);

        if (evaluations.length === 1) {
          const ev = evaluations[0]!;
          setCurrentLabel(employeeName(ev.employee));
          await downloadEvaluationPdf(ev);
          setDone(1);
        } else {
          await downloadEvaluationsZip(evaluations, (built, count, label) => {
            setDone(built);
            setTotal(count);
            setCurrentLabel(label);
          });
        }

        setPhase("done");
        toast.success(
          evaluations.length === 1
            ? "PDF downloaded"
            : `${evaluations.length} evaluations exported as ZIP`
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Export failed";
        setError(message);
        setPhase("error");
        toast.error(message);
      }
    })();
  }, [open, ids]);

  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const busy = phase === "fetching" || phase === "building";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => { if (busy) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }}
      >
        <DialogTitle className="flex items-center gap-2">
          {phase === "done" ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : busy ? (
            <Loader2 className="size-5 animate-spin text-slate-700" />
          ) : (
            <Download className="size-5 text-slate-700" />
          )}
          {phase === "done" ? "Export complete" : phase === "error" ? "Export failed" : "Exporting PDFs"}
        </DialogTitle>
        <DialogDescription>
          {phase === "done"
            ? ids.length === 1
              ? "Your evaluation PDF is ready."
              : `Downloaded a ZIP with ${ids.length} evaluation PDFs.`
            : phase === "error"
              ? error ?? "Something went wrong while exporting."
              : phase === "fetching"
                ? "Fetching evaluation details…"
                : "Building PDF files…"}
        </DialogDescription>

        {(busy || phase === "done") && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate text-slate-600">{currentLabel || "Preparing…"}</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-900">
                {done}/{total || ids.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-[width] duration-300 ease-out"
                style={{ width: `${phase === "done" ? 100 : pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {phase === "fetching"
                ? "Loading selected evaluations"
                : phase === "building"
                  ? ids.length === 1
                    ? "Generating PDF"
                    : "Generating PDFs and packaging ZIP"
                  : "All files ready"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button disabled={busy} onClick={() => onOpenChange(false)}>
            {phase === "done" || phase === "error" ? "Close" : "Please wait…"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
