"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { employeeApi } from "@/features/employees/employee-api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { employeeName } from "@/lib/utils/format";
import type { Employee } from "@/types/employee";

async function fetchAllEmployees(): Promise<Employee[]> {
  const first = await employeeApi.list(new URLSearchParams({ page: "1", pageSize: "100" }));
  const items = [...(first.items ?? [])];
  const totalPages = first.meta?.totalPages ?? 1;
  for (let page = 2; page <= totalPages; page++) {
    const next = await employeeApi.list(new URLSearchParams({ page: String(page), pageSize: "100" }));
    items.push(...(next.items ?? []));
  }
  return items.sort((a, b) => {
    const byName = employeeName(a).localeCompare(employeeName(b), undefined, { sensitivity: "base" });
    if (byName !== 0) return byName;
    return a.employeeCode.localeCompare(b.employeeCode);
  });
}

export function EmployeeBrowseNav({ currentId }: { currentId: string }) {
  const router = useRouter();
  const listQ = useQuery({
    queryKey: ["employees", "browse-nav"],
    queryFn: fetchAllEmployees,
    staleTime: 60_000
  });

  const items = listQ.data ?? [];
  const index = useMemo(() => items.findIndex((e) => e.id === currentId), [items, currentId]);
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const positionLabel = index >= 0 && items.length > 0 ? `${index + 1} of ${items.length}` : null;

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/employees" className="inline-flex shrink-0 items-center gap-2 text-sm text-slate-500 hover:text-slate-950">
        <ArrowLeft className="size-4" />
        Employees
      </Link>

      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!prev || listQ.isLoading}
          onClick={() => prev && router.push(`/employees/${prev.id}`)}
          aria-label="Previous employee"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Select
          aria-label="Choose employee"
          className="min-w-0 flex-1 sm:w-72 sm:flex-none"
          value={currentId}
          disabled={listQ.isLoading || items.length === 0}
          onChange={(event) => {
            const id = event.target.value;
            if (id && id !== currentId) router.push(`/employees/${id}`);
          }}
        >
          {listQ.isLoading ? <option value={currentId}>Loading employees…</option> : null}
          {!listQ.isLoading && items.length === 0 ? <option value={currentId}>No employees</option> : null}
          {items.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employeeName(employee)} · {employee.employeeCode}
            </option>
          ))}
          {!listQ.isLoading && index < 0 ? (
            <option value={currentId}>Current employee</option>
          ) : null}
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!next || listQ.isLoading}
          onClick={() => next && router.push(`/employees/${next.id}`)}
          aria-label="Next employee"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>

        {positionLabel ? <span className="shrink-0 text-xs tabular-nums text-slate-500">{positionLabel}</span> : null}
      </div>
    </div>
  );
}
