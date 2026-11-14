"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Link from "next/link";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { OfficeFilter } from "@/components/ops/office-filter";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { useAuth } from "@/features/auth/auth-provider";
import {
  assetStatusLabel,
  assetTypeLabel,
  companyAssetApi,
  type AssetStatus
} from "@/features/company-assets/company-asset-api";
import { cn } from "@/lib/utils/cn";
import { employeeName, formatDateTime } from "@/lib/utils/format";

const filters: Array<{ id: "" | AssetStatus; label: string }> = [
  { id: "", label: "All" },
  { id: "PENDING", label: "Waiting" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "DECLINED", label: "Declined" },
  { id: "RETURNED", label: "Returned" }
];

export default function CompanyAssetsPage() {
  return (
    <TenantOpsGate>
      <CompanyAssetsInner />
    </TenantOpsGate>
  );
}

function CompanyAssetsInner() {
  const { isOfficeAdmin } = useAuth();
  const [status, setStatus] = useState<"" | AssetStatus>("PENDING");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [officeId, setOfficeId] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["company-assets", "list", status, deferredSearch, officeId, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status) params.set("status", status);
      if (deferredSearch.trim()) params.set("search", deferredSearch.trim());
      if (officeId) params.set("officeId", officeId);
      return companyAssetApi.list(params);
    }
  });

  const counts = query.data?.counts;
  const meta = query.data?.meta;

  return (
    <>
      <PageHeader
        title="Company assets"
        description="Items issued to employees. An item stays waiting until the employee accepts it in the employee app."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <SummaryTile label="Waiting" value={counts?.PENDING} tone="text-amber-700" />
        <SummaryTile label="Accepted" value={counts?.ACCEPTED} tone="text-emerald-700" />
        <SummaryTile label="Declined" value={counts?.DECLINED} tone="text-red-700" />
        <SummaryTile label="Returned" value={counts?.RETURNED} tone="text-slate-600" />
      </div>
      <FilterBar className="mb-4">
        <div className="space-y-1.5 xl:min-w-56">
          <Label>Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Name, serial, or employee"
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as "" | AssetStatus);
            }}
          >
            {filters.map((filter) => (
              <option key={filter.id || "all"} value={filter.id}>
                {filter.label}
              </option>
            ))}
          </Select>
        </div>
        <OfficeFilter
          visible={!isOfficeAdmin}
          value={officeId}
          onChange={(next) => {
            setPage(1);
            setOfficeId(next);
          }}
        />
      </FilterBar>
      {query.isLoading ? (
        <PageSkeleton />
      ) : query.isError ? (
        <p className="text-sm text-red-600">{query.error instanceof Error ? query.error.message : "Could not load company assets"}</p>
      ) : (
        <TableShell
          footer={
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <span>
                {meta?.total ?? 0} item{(meta?.total ?? 0) === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta || page >= meta.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          }
        >
          <Table>
            <TableHead>
              <TableRow>
                <Th>Employee</Th>
                <Th>Item</Th>
                <Th>Identifier</Th>
                <Th>Status</Th>
                <Th>Assigned</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data?.items.length ? (
                query.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <Td>
                      <Link href={`/employees/${item.employee.id}`} className="font-medium text-slate-950 hover:underline">
                        {employeeName(item.employee)}
                      </Link>
                      <p className="text-xs text-slate-500">{item.employee.employeeCode}</p>
                    </Td>
                    <Td>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">{assetTypeLabel(item.type)}</p>
                    </Td>
                    <Td className="font-mono text-xs text-slate-700">{item.identifier}</Td>
                    <Td>
                      <span className="text-sm text-slate-700">{assetStatusLabel(item.status)}</span>
                      {item.responseNote ? <p className="mt-1 max-w-xs text-xs text-slate-500">{item.responseNote}</p> : null}
                    </Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDateTime(item.createdAt)}</Td>
                  </TableRow>
                ))
              ) : (
                <TableEmpty colSpan={5}>No company assets match these filters. Assign one from an employee profile, or while creating or inviting someone.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </TableShell>
      )}
    </>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value?: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold", tone)}>{value ?? "–"}</p>
    </div>
  );
}
