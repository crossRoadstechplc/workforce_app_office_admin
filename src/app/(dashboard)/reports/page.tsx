"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { reportApi } from "@/features/reports/report-api";
import { employeeName, formatDate, formatDateTime, minutesToHours } from "@/lib/utils/format";

type Kind = "timesheets" | "worksheets" | "leave";

type ReportItem = {
  id: string;
  employee?: { firstName?: string; lastName?: string };
  workDate?: string;
  office?: { name?: string };
  actualCheckIn?: string;
  actualCheckOut?: string;
  workedMinutes?: number;
  lateMinutes?: number;
  status?: string;
  workDescription?: string;
  timesheet?: { workedMinutes?: number };
  leaveType?: { name?: string };
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  decisions?: Array<{ decisionReason?: string }>;
};

export default function ReportsPage() {
  return (
    <TenantOpsGate>
      <ReportsPageInner />
    </TenantOpsGate>
  );
}

function ReportsPageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const [kind, setKind] = useState<Kind>("timesheets");
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [status, setStatus] = useState("");
  const p = useMemo(() => {
    const x = new URLSearchParams({ from, to, page: "1", pageSize: "100" });
    if (status) x.set("status", status);
    return x;
  }, [from, to, status]);
  const q = useQuery({
    queryKey: ["reports", kind, from, to, status],
    queryFn: () => reportApi[kind](new URLSearchParams(p))
  });
  const result = (q.data as { data?: { items?: unknown[] }; items?: unknown[] })?.data ?? q.data ?? {};
  const items = ((result as { items?: ReportItem[] }).items ?? []) as ReportItem[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office reports" : "Reports"}
        description={
          isOfficeAdmin
            ? `Operational reports scoped to ${officeLabel ?? "your assigned offices"}.`
            : "Operational workforce reports backed directly by PostgreSQL aggregates."
        }
        action={
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await reportApi.export(kind, new URLSearchParams(p));
                toast.success("CSV exported");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
        }
      />
      <FilterBar>
        <Field label="Report">
          <Select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as Kind);
              setStatus("");
            }}
          >
            <option value="timesheets">Timesheets</option>
            <option value="worksheets">Worksheets</option>
            <option value="leave">Leave</option>
          </Select>
        </Field>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Status">
          <Input placeholder="Optional exact status" value={status} onChange={(e) => setStatus(e.target.value)} />
        </Field>
      </FilterBar>
      {q.isLoading ? <PageSkeleton /> : <ReportTable kind={kind} items={items} />}
    </div>
  );
}

function ReportTable({ kind, items }: { kind: Kind; items: ReportItem[] }) {
  if (kind === "timesheets") {
    return (
      <TableShell>
        <Table>
          <Head labels={["Employee", "Date", "Office", "Check in", "Checkout", "Worked", "Late", "Status"]} />
          <TableBody>
            {items.map((x) => (
              <TableRow key={x.id}>
                <Td>{employeeName(x.employee)}</Td>
                <Td>{formatDate(x.workDate)}</Td>
                <Td>{x.office?.name ?? "—"}</Td>
                <Td>{formatDateTime(x.actualCheckIn)}</Td>
                <Td>{formatDateTime(x.actualCheckOut)}</Td>
                <Td className="tabular-nums">{minutesToHours(x.workedMinutes)}</Td>
                <Td className="tabular-nums">{x.lateMinutes}m</Td>
                <Td>
                  <StatusBadge status={x.status ?? "NONE"} />
                </Td>
              </TableRow>
            ))}
            {!items.length && <TableEmpty colSpan={8}>No timesheets for this range.</TableEmpty>}
          </TableBody>
        </Table>
      </TableShell>
    );
  }
  if (kind === "worksheets") {
    return (
      <TableShell>
        <Table>
          <Head labels={["Employee", "Date", "Worked", "Description", "Status"]} />
          <TableBody>
            {items.map((x) => (
              <TableRow key={x.id}>
                <Td>{employeeName(x.employee)}</Td>
                <Td>{formatDate(x.workDate)}</Td>
                <Td className="tabular-nums">{minutesToHours(x.timesheet?.workedMinutes)}</Td>
                <Td>
                  <div className="max-w-lg truncate">{x.workDescription}</div>
                </Td>
                <Td>
                  <StatusBadge status={x.status ?? "NONE"} />
                </Td>
              </TableRow>
            ))}
            {!items.length && <TableEmpty colSpan={5}>No worksheets for this range.</TableEmpty>}
          </TableBody>
        </Table>
      </TableShell>
    );
  }
  return (
    <TableShell>
      <Table>
        <Head labels={["Employee", "Type", "Dates", "Days", "Status", "Decision"]} />
        <TableBody>
          {items.map((x) => (
            <TableRow key={x.id}>
              <Td>{employeeName(x.employee)}</Td>
              <Td>{x.leaveType?.name}</Td>
              <Td>
                {formatDate(x.startDate)} – {formatDate(x.endDate)}
              </Td>
              <Td className="tabular-nums">{String(x.numberOfDays)}</Td>
              <Td>
                <StatusBadge status={x.status ?? "NONE"} />
              </Td>
              <Td>{x.decisions?.[0]?.decisionReason ?? "—"}</Td>
            </TableRow>
          ))}
          {!items.length && <TableEmpty colSpan={6}>No leave records for this range.</TableEmpty>}
        </TableBody>
      </Table>
    </TableShell>
  );
}

function Head({ labels }: { labels: string[] }) {
  return (
    <TableHead>
      <tr>
        {labels.map((x) => (
          <Th key={x}>{x}</Th>
        ))}
      </tr>
    </TableHead>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-40 space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
