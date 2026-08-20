import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:grid-cols-2 xl:flex xl:flex-wrap",
        "[&>*]:min-w-0 [&>*]:w-full xl:[&>*]:w-auto",
        className
      )}
    >
      {children}
    </div>
  );
}
