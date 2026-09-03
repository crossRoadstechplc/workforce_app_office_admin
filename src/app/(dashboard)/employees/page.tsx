"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { employeeApi } from "@/features/employees/employee-api";
import { inviteApi, type InviteRecord } from "@/features/invites/invite-api";
import { PageHeader } from "@/components/layout/page-header";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { EmployeeTable } from "@/components/employees/employee-table";
import { OfficeFilter } from "@/components/ops/office-filter";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { useAuth } from "@/features/auth/auth-provider";
import type { Employee } from "@/types/employee";

export default function EmployeesPage() {
  return (
    <TenantOpsGate>
      <EmployeesPageInner />
    </TenantOpsGate>
  );
}

function EmployeesPageInner() {
  const { isOfficeAdmin, user } = useAuth();
  const qc = useQueryClient();
  const showOfficeFilter = !isOfficeAdmin;
  const officeLabel = user?.offices?.map((o) => o.name).join(", ");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const deferred = useDeferredValue(search);

  const query = useQuery({
    queryKey: ["employees", page, deferred, status, officeId],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (deferred) p.set("search", deferred);
      if (status) p.set("status", status);
      if (officeId) p.set("officeId", officeId);
      return employeeApi.list(p);
    }
  });

  const invitesQ = useQuery({
    queryKey: ["employee-invites"],
    queryFn: () => inviteApi.list(new URLSearchParams({ type: "EMPLOYEE", status: "PENDING", page: "1", pageSize: "20" }))
  });

  const resend = useMutation({
    mutationFn: (id: string) => inviteApi.resend(id),
    onSuccess: (r) => {
      toast.success(r.emailSent ? "Invite email resent" : r.emailError ?? "Invite saved, but the email was not sent");
      void qc.invalidateQueries({ queryKey: ["employee-invites"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const data = query.data as { items: Employee[]; meta: { total: number; totalPages: number } } | undefined;
  const pendingInvites = (invitesQ.data?.items ?? []) as InviteRecord[];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isOfficeAdmin ? "Employees in my offices" : "Employees"}
        description={
          isOfficeAdmin
            ? `Register and manage employees in ${officeLabel ?? "your assigned offices"}.`
            : "Register employees, manage access, and review workforce assignments."
        }
        action={<CreateEmployeeDialog />}
      />
      <EmployeeFormDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
        employee={editing}
      />
      {pendingInvites.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium">Pending employee invites</p>
          <ul className="mt-3 space-y-2">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{invite.email}</span>
                  {invite.office?.name ? <span className="text-slate-500"> · {invite.office.name}</span> : null}
                </span>
                <Button size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(invite.id)}>
                  Resend
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <FilterBar className="rounded-none border-0 border-b shadow-none">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search name, code, or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
          </select>
          <OfficeFilter
            visible={showOfficeFilter}
            value={officeId}
            onChange={(id) => {
              setOfficeId(id);
              setPage(1);
            }}
          />
        </FilterBar>
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data?.items.length ? (
          <>
            <EmployeeTable
              data={data.items}
              onEdit={(employee) => {
                setEditing(employee);
                setEditOpen(true);
              }}
            />
            <div className="flex items-center justify-between border-t p-4 text-sm">
              <p className="text-slate-500">{data.meta.total} employees</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="No employees found" description="Adjust your filters or register the first employee." />
        )}
      </Card>
    </div>
  );
}
