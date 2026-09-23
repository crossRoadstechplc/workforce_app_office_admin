"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { OfficeFilter } from "@/components/ops/office-filter";
import { OpsRequestTabs } from "@/components/ops/ops-request-tabs";
import { OpsSummaryStrip } from "@/components/ops/ops-summary-strip";
import { useAuth } from "@/features/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CorrectionStatusBadge, StatusBadge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { Textarea } from "@/components/ui/textarea";
import { operationsApi } from "@/features/operations/operations-api";
import { employeeName, formatDate, formatDateTime, formatLateMinutes, formatLeaveDays, minutesToHours } from "@/lib/utils/format";
import type { LeaveRequest } from "@/types/operations";
import { AnnualLeaveSummary } from "@/components/leave/annual-leave-summary";

type TabId = "leave" | "correction";

export default function LeavePage() {
  return (
    <TenantOpsGate>
      <Suspense fallback={<PageSkeleton />}>
        <LeavePageInner />
      </Suspense>
    </TenantOpsGate>
  );
}

function LeavePageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const showOfficeFilter = !isOfficeAdmin;
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: TabId = tabParam === "correction" ? "correction" : "leave";

  const setTab = useCallback(
    (tab: TabId) => {
      const p = new URLSearchParams(searchParams.toString());
      if (tab === "leave") p.delete("tab");
      else p.set("tab", tab);
      router.replace(`/leave${p.toString() ? `?${p}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  const [officeId, setOfficeId] = useState("");
  const [leaveStatus, setLeaveStatus] = useState("");
  const [correctionStatus, setCorrectionStatus] = useState("PENDING");
  const [correctionDate, setCorrectionDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    if (activeTab === "correction") {
      if (status) setCorrectionStatus(status);
      if (date) setCorrectionDate(date);
      const openId = searchParams.get("requestId");
      if (openId) setSelectedCorrectionId(openId);
    } else {
      if (status) setLeaveStatus(status);
      const openId = searchParams.get("requestId");
      if (openId) setSelectedLeaveId(openId);
    }
  }, [searchParams, activeTab]);

  const leaveParams = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (officeId) p.set("officeId", officeId);
    if (leaveStatus) p.set("status", leaveStatus);
    return p;
  }, [officeId, leaveStatus, page]);

  const correctionListParams = useMemo(() => {
    const p = new URLSearchParams();
    if (officeId) p.set("officeId", officeId);
    if (correctionStatus) p.set("status", correctionStatus);
    if (correctionDate) p.set("date", correctionDate);
    return p;
  }, [officeId, correctionStatus, correctionDate]);

  const correctionCountsParams = useMemo(() => {
    const p = new URLSearchParams();
    if (officeId) p.set("officeId", officeId);
    if (correctionDate) p.set("date", correctionDate);
    return p;
  }, [officeId, correctionDate]);

  const leaveCountsParams = useMemo(() => {
    const p = new URLSearchParams({ page: "1", pageSize: "1" });
    if (officeId) p.set("officeId", officeId);
    return p;
  }, [officeId]);

  const leaveCountsQuery = useQuery({
    queryKey: ["leave-requests", "counts", leaveCountsParams.toString()],
    queryFn: () => operationsApi.leaves(leaveCountsParams)
  });

  const leaveQuery = useQuery({
    queryKey: ["leave-requests", leaveParams.toString()],
    queryFn: () => operationsApi.leaves(leaveParams),
    enabled: activeTab === "leave"
  });

  const correctionQuery = useQuery({
    queryKey: ["correction-requests", correctionListParams.toString()],
    queryFn: () => operationsApi.correctnessRequests(correctionListParams)
  });

  const correctionCountsQuery = useQuery({
    queryKey: ["correction-requests", "counts", correctionCountsParams.toString()],
    queryFn: () => operationsApi.correctnessRequests(correctionCountsParams)
  });

  const leaveDetail = useQuery({
    queryKey: ["leave", selectedLeaveId],
    queryFn: () => operationsApi.leave(selectedLeaveId!),
    enabled: !!selectedLeaveId
  });

  const approveLeave = useMutation({
    mutationFn: () => operationsApi.approveLeave(selectedLeaveId!, reason || undefined),
    onSuccess: () => leaveDone("Leave approved"),
    onError: (e: Error) => toast.error(e.message)
  });
  const rejectLeave = useMutation({
    mutationFn: () => operationsApi.rejectLeave(selectedLeaveId!, reason),
    onSuccess: () => leaveDone("Leave rejected"),
    onError: (e: Error) => toast.error(e.message)
  });

  const correctionDecision = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      action === "approve"
        ? operationsApi.approveCorrectnessRequest(id, adminNote || undefined)
        : operationsApi.rejectCorrectnessRequest(id, adminNote || undefined),
    onSuccess: () => {
      toast.success("Correction updated");
      setAdminNote("");
      setSelectedCorrectionId(null);
      void qc.invalidateQueries({ queryKey: ["correction-requests"] });
      void qc.invalidateQueries({ queryKey: ["leave-requests"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["attendance-day-roster"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function leaveDone(message: string) {
    toast.success(message);
    setReason("");
    setSelectedLeaveId(null);
    void qc.invalidateQueries({ queryKey: ["leave-requests"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const leaveCounts = leaveCountsQuery.data?.counts;
  const correctionRows = correctionCountsQuery.data ?? [];
  const correctionCounts = useMemo(() => {
    const counts = { total: correctionRows.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    for (const row of correctionRows) {
      if (row.status === "PENDING") counts.pending += 1;
      if (row.status === "APPROVED") counts.approved += 1;
      if (row.status === "REJECTED") counts.rejected += 1;
      if (row.status === "CANCELLED") counts.cancelled += 1;
    }
    return counts;
  }, [correctionRows]);

  const pendingLeaveBadge = leaveCounts?.pending ?? 0;
  const pendingCorrectionBadge = correctionCounts.pending;

  if (activeTab === "leave" && leaveQuery.isLoading) return <PageSkeleton />;
  if (activeTab === "correction" && correctionQuery.isLoading) return <PageSkeleton />;

  const leaveItems = (leaveQuery.data?.items ?? []).filter((row) => matchesSearch(row.employee, search));
  const correctionItems = (correctionQuery.data ?? []).filter((row) => matchesSearch(row.employee, search));
  const leaveDetailData = leaveDetail.data as LeaveRequest | undefined;
  const selectedCorrection = correctionItems.find((r) => r.id === selectedCorrectionId) ?? correctionRows.find((r) => r.id === selectedCorrectionId);
  const meta = leaveQuery.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Office leave & corrections" : "Leave & corrections"}
        description={
          activeTab === "leave"
            ? isOfficeAdmin
              ? `Review leave requests for ${officeLabel ?? "your assigned offices"}.`
              : "Review employee leave requests and approve or reject pending items."
            : "Review attendance correction requests when employees were at work but check-in or check-out is missing."
        }
      />

      <OpsRequestTabs
        active={activeTab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: "leave", label: "Leave", badge: pendingLeaveBadge },
          { id: "correction", label: "Corrections", badge: pendingCorrectionBadge }
        ]}
      />

      {activeTab === "leave" && leaveCounts && (
        <OpsSummaryStrip
          metrics={[
            { label: "Requests", value: leaveCounts.total },
            { label: "Pending", value: leaveCounts.pending, tone: "warning" },
            { label: "Approved", value: leaveCounts.approved, tone: "success" },
            { label: "Rejected", value: leaveCounts.rejected, tone: "danger" }
          ]}
        />
      )}

      {activeTab === "correction" && (
        <OpsSummaryStrip
          metrics={[
            { label: "Requests", value: correctionCounts.total },
            { label: "Pending", value: correctionCounts.pending, tone: "warning" },
            { label: "Approved", value: correctionCounts.approved, tone: "success" },
            { label: "Rejected", value: correctionCounts.rejected, tone: "danger" }
          ]}
        />
      )}

      <FilterBar>
        <OfficeFilter
          visible={showOfficeFilter}
          value={officeId}
          onChange={(v) => {
            setOfficeId(v);
            setPage(1);
          }}
        />
        {activeTab === "leave" ? (
          <div className="min-w-0 space-y-1.5">
            <Label>Status</Label>
            <Select value={leaveStatus} onChange={(e) => { setLeaveStatus(e.target.value); setPage(1); }}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
        ) : (
          <>
            <div className="min-w-0 space-y-1.5">
              <Label>Status</Label>
              <Select value={correctionStatus} onChange={(e) => setCorrectionStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label>Work date</Label>
              <Input type="date" value={correctionDate} onChange={(e) => setCorrectionDate(e.target.value)} />
            </div>
          </>
        )}
        <div className="relative min-w-0 flex-1 xl:min-w-56">
          <Label>Search</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name or code" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </FilterBar>

      {activeTab === "leave" ? (
        <>
          <TableShell>
            <Table>
              <TableHead>
                <tr>
                  {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Type", "Dates", "Days", "Remaining", "Reason", "Status", ""].map((h) => (
                    <Th key={h || "actions"}>{h}</Th>
                  ))}
                </tr>
              </TableHead>
              <TableBody>
                {leaveItems.map((row) => (
                  <TableRow key={row.id}>
                    <Td>
                      <b>{employeeName(row.employee)}</b>
                      <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
                    </Td>
                    {showOfficeFilter && <Td>{row.employee.office?.name ?? "—"}</Td>}
                    <Td>{row.leaveType.name}</Td>
                    <Td>
                      {formatDate(row.startDate)} – {formatDate(row.endDate)}
                    </Td>
                    <Td className="tabular-nums">{formatLeaveDays(row.numberOfDays)}</Td>
                    <Td className="tabular-nums">{row.annualLeave ? formatLeaveDays(row.annualLeave.available) : "—"}</Td>
                    <Td className="max-w-xs truncate text-slate-600">{row.reason}</Td>
                    <Td>
                      <StatusBadge status={row.status} />
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLeaveId(row.id)}>
                        {row.status === "PENDING" ? "Review" : "Details"}
                      </Button>
                    </Td>
                  </TableRow>
                ))}
                {!leaveItems.length && (
                  <TableEmpty colSpan={showOfficeFilter ? 9 : 8}>No leave requests match this filter.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </TableShell>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button size="sm" variant="ghost" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <TableShell>
          <Table>
            <TableHead>
              <tr>
                {["Employee", ...(showOfficeFilter ? ["Office"] : []), "Work date", "Note", "Attendance", "Status", ""].map((h) => (
                  <Th key={h || "actions"}>{h}</Th>
                ))}
              </tr>
            </TableHead>
            <TableBody>
              {correctionItems.map((row) => (
                <TableRow key={row.id}>
                  <Td>
                    <b>{employeeName(row.employee)}</b>
                    <div className="text-xs text-slate-500">{row.employee.employeeCode}</div>
                  </Td>
                  {showOfficeFilter && <Td>{row.employee.office?.name ?? "—"}</Td>}
                  <Td>{formatDate(row.workDate)}</Td>
                  <Td className="max-w-xs truncate text-slate-600">{row.employeeNote ?? "—"}</Td>
                  <Td className="text-sm text-slate-600">
                    {row.timesheet?.actualCheckIn
                      ? `${formatDateTime(row.timesheet.actualCheckIn)} · ${minutesToHours(row.timesheet.workedMinutes)}`
                      : "No timesheet"}
                  </Td>
                  <Td>
                    <CorrectionStatusBadge status={row.status} />
                  </Td>
                  <Td>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCorrectionId(row.id)}>
                      {row.status === "PENDING" ? "Review" : "Details"}
                    </Button>
                  </Td>
                </TableRow>
              ))}
              {!correctionItems.length && (
                <TableEmpty colSpan={showOfficeFilter ? 7 : 6}>No correction requests match this filter.</TableEmpty>
              )}
            </TableBody>
          </Table>
        </TableShell>
      )}

      <Dialog open={!!selectedLeaveId} onOpenChange={(v) => !v && setSelectedLeaveId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Leave request</DialogTitle>
          <DialogDescription>
            {leaveDetailData ? `${employeeName(leaveDetailData.employee)} · ${leaveDetailData.leaveType.name}` : "Loading..."}
          </DialogDescription>
          {leaveDetailData && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Info l="Dates" v={`${formatDate(leaveDetailData.startDate)} – ${formatDate(leaveDetailData.endDate)}`} />
                <Info l="Days" v={formatLeaveDays(leaveDetailData.numberOfDays)} />
                <Info l="Status" v={leaveDetailData.status} />
              </div>
              {leaveDetailData.annualLeave ? (
                <AnnualLeaveSummary balance={leaveDetailData.annualLeave} allocations={leaveDetailData.allocations} />
              ) : null}
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">Employee reason</div>
                <p className="mt-2 text-sm leading-6">{leaveDetailData.reason}</p>
              </div>
              {leaveDetailData.decisions?.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Decision history</h3>
                  {leaveDetailData.decisions.map((x) => (
                    <div key={x.id} className="mb-2 rounded-lg border p-3 text-sm">
                      <b>{x.decision}</b> · {formatDateTime(x.decidedAt)}
                      <div className="mt-1 text-slate-500">{x.decisionReason || "No decision reason"}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {leaveDetailData.status === "PENDING" && (
                <>
                  <div>
                    <Label>Decision reason</Label>
                    <Textarea
                      className="mt-1.5"
                      placeholder="Required for rejection; optional for approval"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="danger" disabled={rejectLeave.isPending || reason.trim().length < 5} onClick={() => rejectLeave.mutate()}>
                      <XCircle className="size-4" />
                      Reject
                    </Button>
                    <Button disabled={approveLeave.isPending} onClick={() => approveLeave.mutate()}>
                      <CheckCircle2 className="size-4" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCorrectionId} onOpenChange={(v) => !v && setSelectedCorrectionId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Attendance correction</DialogTitle>
          <DialogDescription>
            {selectedCorrection
              ? `${employeeName(selectedCorrection.employee)} · ${formatDate(selectedCorrection.workDate)}`
              : "Loading..."}
          </DialogDescription>
          {selectedCorrection && (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info l="Status" v={selectedCorrection.status} />
                <Info l="Requested" v={formatDateTime(selectedCorrection.createdAt)} />
              </div>
              {selectedCorrection.employeeNote ? (
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">Employee note</div>
                  <p className="mt-2 text-sm leading-6">{selectedCorrection.employeeNote}</p>
                </div>
              ) : null}
              {selectedCorrection.timesheet ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Info
                    l="Check in"
                    v={selectedCorrection.timesheet.actualCheckIn ? formatDateTime(selectedCorrection.timesheet.actualCheckIn) : "—"}
                  />
                  <Info
                    l="Check out"
                    v={selectedCorrection.timesheet.actualCheckOut ? formatDateTime(selectedCorrection.timesheet.actualCheckOut) : "—"}
                  />
                  <Info l="Late" v={formatLateMinutes(selectedCorrection.timesheet.lateMinutes)} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No timesheet existed for this day. Approving will create one from the schedule.</p>
              )}
              {selectedCorrection.status === "PENDING" && (
                <>
                  <div>
                    <Label>Admin note (optional)</Label>
                    <Textarea className="mt-1.5" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      disabled={correctionDecision.isPending}
                      onClick={() => correctionDecision.mutate({ id: selectedCorrection.id, action: "reject" })}
                    >
                      Reject
                    </Button>
                    <Button
                      disabled={correctionDecision.isPending}
                      onClick={() => correctionDecision.mutate({ id: selectedCorrection.id, action: "approve" })}
                    >
                      Approve correction
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function matchesSearch(employee: { firstName?: string; lastName?: string; employeeCode?: string }, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return `${employee.firstName ?? ""} ${employee.lastName ?? ""} ${employee.employeeCode ?? ""}`.toLowerCase().includes(q);
}

function Info({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-slate-500">{l}</div>
      <div className="mt-1 font-semibold">{v}</div>
    </div>
  );
}
