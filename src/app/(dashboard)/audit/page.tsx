"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { reportApi } from "@/features/reports/report-api";
import { formatDateTime, humanizeKey } from "@/lib/utils/format";

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
  const rows = ((q.data as { data?: unknown[] })?.data ?? q.data ?? []) as Array<{
    id: string;
    createdAt: string;
    actor?: { email?: string } | null;
    action: string;
    entityType: string;
    reason?: string | null;
  }>;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit activity"
        description="Recent administrative changes and workforce decisions. The current backend exposes the latest 100 audit events."
      />
      <TableShell>
        <Table>
          <TableHead>
            <tr>
              {["Time", "Actor", "Action", "Entity", "Reason"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </TableHead>
          <TableBody>
            {rows.map((x) => (
              <TableRow key={x.id}>
                <Td className="whitespace-nowrap">{formatDateTime(x.createdAt)}</Td>
                <Td>{x.actor?.email ?? "System"}</Td>
                <Td className="font-medium">{humanizeKey(String(x.action))}</Td>
                <Td className="text-slate-500">{humanizeKey(x.entityType)}</Td>
                <Td className="max-w-md text-slate-600">{x.reason ?? "—"}</Td>
              </TableRow>
            ))}
            {!rows.length && <TableEmpty colSpan={5}>No audit events yet.</TableEmpty>}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  );
}
