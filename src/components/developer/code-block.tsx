"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy — select the text and copy it manually");
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={label}
      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition", className)}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Dark code panel with an optional header row (title or tabs) and a copy button. */
export function CodeBlock({ code, title, className }: { code: string; title?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-800 bg-slate-950", className)}>
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-slate-800 px-3">
        <div className="min-w-0 text-xs font-medium text-slate-400">{title}</div>
        <CopyButton value={code} className="text-slate-400 hover:bg-slate-800 hover:text-slate-100" />
      </div>
      <pre className="max-h-[28rem] overflow-auto p-4 text-[12.5px] leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export type CodeTab = { label: string; code: string; badge?: React.ReactNode };

/** Code panel with tabs, e.g. cURL / JavaScript or 200 / 409 responses. */
export function CodeTabs({ tabs, className }: { tabs: CodeTab[]; className?: string }) {
  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, tabs.length - 1)];
  if (!current) return null;
  return (
    <CodeBlock
      className={className}
      code={current.code}
      title={
        <div role="tablist" className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2 py-2 transition",
                index === active ? "border-blue-400 text-slate-100" : "border-transparent text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.badge}
              {tab.label}
            </button>
          ))}
        </div>
      }
    />
  );
}
