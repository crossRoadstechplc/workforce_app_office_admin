import { cn } from "@/lib/utils/cn";
import type { HttpMethod } from "@/features/developer/types";

const methodStyles: Record<HttpMethod, string> = {
  GET: "bg-sky-50 text-sky-700 ring-sky-600/20",
  POST: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PATCH: "bg-amber-50 text-amber-800 ring-amber-600/25",
  PUT: "bg-amber-50 text-amber-800 ring-amber-600/25",
  DELETE: "bg-red-50 text-red-700 ring-red-600/20"
};

export function MethodBadge({ method, size = "md" }: { method: HttpMethod; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 justify-center rounded-md font-mono font-semibold ring-1 ring-inset",
        size === "sm" ? "w-12 px-1 py-0.5 text-[10px]" : "w-16 px-2 py-1 text-xs",
        methodStyles[method]
      )}
    >
      {method}
    </span>
  );
}

/** Small coloured dot for HTTP status tabs (green 2xx, amber 4xx, red 5xx). */
export function StatusDot({ status }: { status: number }) {
  const color = status < 300 ? "bg-emerald-400" : status < 500 ? "bg-amber-400" : "bg-red-400";
  return <span className={cn("inline-block size-2 rounded-full", color)} aria-hidden />;
}

export function StatusPill({ status }: { status: number }) {
  const tone =
    status < 300
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : status < 500
        ? "bg-amber-50 text-amber-800 ring-amber-600/25"
        : "bg-red-50 text-red-700 ring-red-600/20";
  return <span className={cn("inline-flex rounded-md px-2 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset", tone)}>{status}</span>;
}
