"use client";
import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Pencil, UserX } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { employeeApi } from "@/features/employees/employee-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CopyValue } from "@/components/ui/copy-value";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { SupervisorSelect } from "@/components/employees/supervisor-select";
import { employeeName } from "@/lib/utils/format";

export default function EmployeeDetailPage({ params }: { params: Promise<{ employeeId: string }> }) {
  return (
    <TenantOpsGate>
      <EmployeeDetailInner params={params} />
    </TenantOpsGate>
  );
}

function EmployeeDetailInner({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = use(params);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["employee", employeeId], queryFn: () => employeeApi.get(employeeId) });
  const [action, setAction] = useState<"status" | "password" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const statusMut = useMutation({
    mutationFn: (reason: string) => employeeApi.changeStatus(employeeId, { employeeStatus: q.data?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", reason }),
    onSuccess: () => {
      toast.success("Employee status updated");
      setAction(null);
      qc.invalidateQueries({ queryKey: ["employee", employeeId] });
      qc.invalidateQueries({ queryKey: ["employees"] });
    }
  });
  const resetMut = useMutation({
    mutationFn: (reason: string) => employeeApi.resetPassword(employeeId, reason),
    onSuccess: (r) => {
      setResult(r.temporaryPassword);
      toast.success("Temporary password created");
    }
  });
  const supervisorMut = useMutation({
    mutationFn: (supervisorId: string) => employeeApi.update(employeeId, { supervisorId: supervisorId || null }),
    onSuccess: () => {
      toast.success("Supervisor updated");
      qc.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <Skeleton className="h-[500px]" />;
  if (!q.data) return <p>Employee not found.</p>;
  const e = q.data;
  const supervisorName = e.supervisor ? employeeName(e.supervisor) : "—";

  return (
    <>
      <div className="mb-6">
        <Link href="/employees" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-950">
          <ArrowLeft className="size-4" />
          Employees
        </Link>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
            {e.firstName[0]}
            {e.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                {e.firstName} {e.lastName}
              </h1>
              <StatusBadge status={e.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {e.employeeCode} · {e.jobTitle ?? "No job title"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/performance?employeeId=${e.id}`}>Evaluations</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setAction("password");
            }}
          >
            <KeyRound className="size-4" />
            Reset password
          </Button>
          <Button variant={e.status === "ACTIVE" ? "danger" : "default"} onClick={() => setAction("status")}>
            <UserX className="size-4" />
            {e.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Email" value={e.user.email} />
            <Info label="Phone" value={e.phone} />
            <Info label="Department" value={e.department?.name} />
            <Info label="Evaluation template" value={e.evaluationTemplate?.name} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Work assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Office" value={e.office?.name} />
            <Info label="Schedule" value={e.schedule?.name} />
            <Info label="Start date" value={e.employmentStartDate?.slice(0, 10)} />
            <Info label="Direct supervisor" value={supervisorName} />
            {e.supervisor && e.supervisorHasPortalAccess === false ? (
              <p className="text-xs text-amber-700">This supervisor has no portal login, so they cannot score evaluations until they are an office or company admin.</p>
            ) : null}
            <SupervisorSelect
              value={e.supervisorId ?? ""}
              excludeId={e.id}
              onChange={(id) => supervisorMut.mutate(id)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="User status" value={e.user.status} />
            <Info label="Password change" value={e.user.mustChangePassword ? "Required" : "Complete"} />
            <Info label="Last login" value={e.user.lastLoginAt ? new Date(e.user.lastLoginAt).toLocaleString() : "Never"} />
          </CardContent>
        </Card>
      </div>
      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={e} />
      <Dialog open={!!action} onOpenChange={(v) => !v && setAction(null)}>
        <DialogContent>
          <DialogTitle>
            {action === "status" ? (e.status === "ACTIVE" ? "Deactivate employee" : "Activate employee") : "Reset temporary password"}
          </DialogTitle>
          <DialogDescription>
            {action === "password"
              ? "All active sessions will be revoked and the employee must change the new temporary password on next login."
              : "This action changes the employee's account access. A reason is required for the audit trail."}
          </DialogDescription>
          {result ? (
            <div className="mt-5 space-y-4">
              <CopyValue label="Employee code" value={e.employeeCode} />
              <CopyValue label="Temporary password" value={result} tone="amber" />
              <p className="text-xs text-slate-500">The temporary password is the employee code plus @Temp1.</p>
              <Button className="w-full" onClick={() => setAction(null)}>
                Done
              </Button>
            </div>
          ) : (
            <ReasonForm busy={statusMut.isPending || resetMut.isPending} onSubmit={(reason) => (action === "status" ? statusMut.mutate(reason) : resetMut.mutate(reason))} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

function ReasonForm({ busy, onSubmit }: { busy: boolean; onSubmit: (v: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="mt-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason);
      }}
    >
      <Label htmlFor="reason">Reason</Label>
      <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} required />
      <Button className="mt-4 w-full" disabled={busy}>
        {busy ? "Saving…" : "Confirm"}
      </Button>
    </form>
  );
}
