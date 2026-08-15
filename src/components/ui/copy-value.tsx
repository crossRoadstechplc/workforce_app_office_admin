"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

export function CopyValue({
  label,
  value,
  tone = "muted"
}: {
  label: string;
  value: string;
  tone?: "muted" | "amber";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copied`);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <Label>{label}</Label>
      <div
        className={cn(
          "mt-1.5 flex items-center gap-2 rounded-xl border p-3",
          tone === "amber" ? "border-amber-200 bg-amber-50" : "bg-muted/40"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 break-all font-mono text-base font-semibold",
            tone === "amber" ? "text-amber-950" : "text-slate-950"
          )}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copy ${label}`}
          className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-white/80 hover:text-slate-900"
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}
