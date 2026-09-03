"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { configurationApi, itemsOf } from "@/features/configuration/configuration-api";
import type { Department } from "@/types/configuration";

export default function DepartmentsPage() {
  return (
    <CompanyAdminGate>
      <DepartmentsPageInner />
    </CompanyAdminGate>
  );
}

function DepartmentsPageInner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const q = useQuery({ queryKey: ["departments"], queryFn: () => configurationApi.departments() });

  const save = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Department name is required");
      return editing ? configurationApi.updateDepartment(editing.id, { name: name.trim() }) : configurationApi.createDepartment({ name: name.trim() });
    },
    onSuccess: () => {
      toast.success(editing ? "Department updated" : "Department created");
      setOpen(false);
      setEditing(null);
      setName("");
      void qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const status = useMutation({
    mutationFn: ({ d, reason }: { d: Department; reason: string }) => configurationApi.departmentStatus(d.id, !d.isActive, reason),
    onSuccess: () => {
      toast.success("Department status updated");
      void qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;

  const departments = itemsOf(q.data ?? []);

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(d: Department) {
    setEditing(d);
    setName(d.name);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        description="Organize employees by department. Assignment on employee profiles is optional."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add department
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? "Edit department" : "New department"}</DialogTitle>
          <DialogDescription>Department names must be unique within your organization.</DialogDescription>
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <Label htmlFor="department-name">Name</Label>
              <Input id="department-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((d) => (
          <Card key={d.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                  <Building className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{d.name}</h3>
                  {!d.isActive ? <StatusBadge status="INACTIVE" /> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const reason = prompt(d.isActive ? "Reason for deactivation:" : "Reason for activation:");
                    if (reason && reason.trim().length >= 3) status.mutate({ d, reason: reason.trim() });
                  }}
                >
                  <Power className="size-4" />
                  {d.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
