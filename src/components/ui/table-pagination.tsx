"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  noun?: string;
  className?: string;
  pageSizeOptions?: readonly number[];
};

function pageWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, totalPages, page]);
  for (let i = page - 1; i <= page + 1; i++) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  if (page <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (page >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i]!;
    const prev = sorted[i - 1];
    if (prev != null && current - prev > 1) out.push("ellipsis");
    out.push(current);
  }
  return out;
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  noun = "results",
  className,
  pageSizeOptions = PAGE_SIZE_OPTIONS
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const pages = pageWindow(safePage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-slate-600">
          {total === 0 ? (
            <>No {noun}</>
          ) : (
            <>
              Showing <span className="font-medium text-slate-900">{from}</span>
              {" to "}
              <span className="font-medium text-slate-900">{to}</span> of{" "}
              <span className="font-medium text-slate-900">{total}</span> {noun}
            </>
          )}
        </p>
        {onPageSizeChange && total > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap">Rows per page</span>
            <Select
              className="h-8 w-[4.5rem] px-2 py-0"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-end gap-1" aria-label="Pagination">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <div className="mx-1 hidden items-center gap-1 md:flex">
            {pages.map((item, idx) =>
              item === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-1.5 text-sm text-slate-400" aria-hidden>
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={item === safePage ? "default" : "ghost"}
                  className={cn(
                    "h-8 min-w-8 px-2",
                    item === safePage ? "pointer-events-none" : "text-slate-700"
                  )}
                  onClick={() => onPageChange(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </Button>
              )
            )}
          </div>

          <span className="px-2 text-sm text-slate-500 md:hidden">
            {safePage} / {totalPages}
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
