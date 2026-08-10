"use client";
import { useQuery } from "@tanstack/react-query";
import { PortalAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { TableShell } from "@/components/ui/table-shell";
import { reportApi } from "@/features/reports/report-api";
import { formatDateTime } from "@/lib/utils/format";

export default function AuditPage() {
  return (
    <PortalAdminGate>
      <AuditPageInner />
    </PortalAdminGate>
  );
}

function AuditPageInner() {
  const q = useQuery({ queryKey: ["audit", "recent"], queryFn: reportApi.activity });
  if (q.isLoading) return <PageSkeleton />;
  const rows = ((q.data as any)?.data ?? q.data ?? []) as any[];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit activity"
        description="Recent administrative changes and workforce decisions. The current backend exposes the latest 100 audit events."
      />
      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Time", "Actor", "Action", "Entity", "Reason"].map((h) => (
                <th key={h} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap px-4 py-3">{formatDateTime(x.createdAt)}</td>
                <td className="px-4 py-3">{x.actor?.email ?? "System"}</td>
                <td className="px-4 py-3 font-medium">{String(x.action).replaceAll("_", " ")}</td>
                <td className="px-4 py-3 text-slate-500">{x.entityType}</td>
                <td className="max-w-md px-4 py-3 text-slate-600">{x.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
