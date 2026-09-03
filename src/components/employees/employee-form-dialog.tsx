"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { employeeApi } from "@/features/employees/employee-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SupervisorSelect } from "@/components/employees/supervisor-select";
import type { Employee } from "@/types/employee";

type EmployeeForm = {
  employeeCode: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  departmentId: string;
  evaluationTemplateId: string;
  employmentStartDate: string;
  officeId: string;
  scheduleId: string;
  supervisorId: string;
};

function employeeToForm(e: Employee): EmployeeForm {
  return {
    employeeCode: e.employeeCode,
    email: e.user.email,
    firstName: e.firstName,
    middleName: e.middleName ?? "",
    lastName: e.lastName,
    phone: e.phone ?? "",
    jobTitle: e.jobTitle ?? "",
    departmentId: e.departmentId ?? e.department?.id ?? "",
    evaluationTemplateId: e.evaluationTemplateId ?? e.evaluationTemplate?.id ?? "",
    employmentStartDate: e.employmentStartDate?.slice(0, 10) ?? "",
    officeId: e.officeId ?? "",
    scheduleId: e.scheduleId ?? "",
    supervisorId: e.supervisorId ?? ""
  };
}

type EmployeeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSaved?: () => void;
};

export function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }: EmployeeFormDialogProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmployeeForm>(() => (employee ? employeeToForm(employee) : blankForm()));
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices, enabled: open });
  const schedules = useQuery({ queryKey: ["schedules", "select"], queryFn: employeeApi.schedules, enabled: open });
  const departments = useQuery({ queryKey: ["departments", "select"], queryFn: employeeApi.departments, enabled: open });
  const evaluationTemplates = useQuery({ queryKey: ["evaluation-templates", "select"], queryFn: employeeApi.evaluationTemplates, enabled: open });

  useEffect(() => {
    if (open && employee) setForm(employeeToForm(employee));
  }, [open, employee]);

  const save = useMutation({
    mutationFn: () => {
      if (!employee) throw new Error("No employee selected");
      return employeeApi.update(employee.id, {
        email: form.email,
        employeeCode: form.employeeCode,
        firstName: form.firstName,
        middleName: form.middleName || null,
        lastName: form.lastName,
        phone: form.phone || null,
        jobTitle: form.jobTitle || null,
        departmentId: form.departmentId || null,
        evaluationTemplateId: form.evaluationTemplateId || null,
        employmentStartDate: form.employmentStartDate,
        officeId: form.officeId || null,
        scheduleId: form.scheduleId || null,
        supervisorId: form.supervisorId || null
      });
    },
    onSuccess: () => {
      toast.success("Employee updated");
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["employees"] });
      void qc.invalidateQueries({ queryKey: ["employee", employee?.id] });
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (!employee) return null;

  function setField<K extends keyof EmployeeForm>(key: K, value: EmployeeForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogTitle>Edit employee</DialogTitle>
        <DialogDescription>Update profile details, work assignment, and supervisor.</DialogDescription>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Employee code" required>
            <Input value={form.employeeCode} onChange={(e) => setField("employeeCode", e.target.value)} required />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required />
          </Field>
          <Field label="First name" required>
            <Input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
          </Field>
          <Field label="Last name" required>
            <Input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required />
          </Field>
          <Field label="Middle name">
            <Input value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </Field>
          <Field label="Job title">
            <Input value={form.jobTitle} onChange={(e) => setField("jobTitle", e.target.value)} />
          </Field>
          <EmployeeAssignmentSelects
            offices={offices.data}
            schedules={schedules.data}
            departments={departments.data}
            evaluationTemplates={evaluationTemplates.data}
            officeId={form.officeId}
            scheduleId={form.scheduleId}
            departmentId={form.departmentId}
            evaluationTemplateId={form.evaluationTemplateId}
            onOfficeChange={(id) => setField("officeId", id)}
            onScheduleChange={(id) => setField("scheduleId", id)}
            onDepartmentChange={(id) => setField("departmentId", id)}
            onEvaluationTemplateChange={(id) => setField("evaluationTemplateId", id)}
          />
          <Field label="Start date" required>
            <Input type="date" value={form.employmentStartDate} onChange={(e) => setField("employmentStartDate", e.target.value)} required />
          </Field>
          <div className="sm:col-span-2">
            <SupervisorSelect value={form.supervisorId} excludeId={employee.id} onChange={(id) => setField("supervisorId", id)} />
          </div>
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function blankForm(): EmployeeForm {
  return {
    employeeCode: "",
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    jobTitle: "",
    departmentId: "",
    evaluationTemplateId: "",
    employmentStartDate: "",
    officeId: "",
    scheduleId: "",
    supervisorId: ""
  };
}

export function EmployeeAssignmentSelects({
  offices,
  schedules,
  departments,
  evaluationTemplates,
  officeId,
  scheduleId,
  departmentId,
  evaluationTemplateId,
  onOfficeChange,
  onScheduleChange,
  onDepartmentChange,
  onEvaluationTemplateChange
}: {
  offices?: { id: string; name: string }[];
  schedules?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  evaluationTemplates?: { id: string; name: string }[];
  officeId?: string;
  scheduleId?: string;
  departmentId?: string;
  evaluationTemplateId?: string;
  onOfficeChange?: (id: string) => void;
  onScheduleChange?: (id: string) => void;
  onDepartmentChange?: (id: string) => void;
  onEvaluationTemplateChange?: (id: string) => void;
}) {
  const officeProps = onOfficeChange
    ? { value: officeId ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onOfficeChange(e.target.value) }
    : { defaultValue: officeId ?? "", name: "officeId" as const };
  const scheduleProps = onScheduleChange
    ? { value: scheduleId ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onScheduleChange(e.target.value) }
    : { defaultValue: scheduleId ?? "", name: "scheduleId" as const };
  const departmentProps = onDepartmentChange
    ? { value: departmentId ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onDepartmentChange(e.target.value) }
    : { defaultValue: departmentId ?? "", name: "departmentId" as const };
  const templateProps = onEvaluationTemplateChange
    ? { value: evaluationTemplateId ?? "", onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onEvaluationTemplateChange(e.target.value) }
    : { defaultValue: evaluationTemplateId ?? "", name: "evaluationTemplateId" as const };

  return (
    <>
      <div>
        <Label htmlFor="officeId">Office</Label>
        <select id="officeId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm" {...officeProps}>
          <option value="">Unassigned</option>
          {offices?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="scheduleId">Schedule</Label>
        <select id="scheduleId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm" {...scheduleProps}>
          <option value="">Unassigned</option>
          {schedules?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="departmentId">Department</Label>
        <select id="departmentId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm" {...departmentProps}>
          <option value="">Unassigned</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="evaluationTemplateId">Evaluation template</Label>
        <select id="evaluationTemplateId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm" {...templateProps}>
          <option value="">Unassigned</option>
          {evaluationTemplates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

/** @deprecated Use EmployeeAssignmentSelects */
export function OfficeScheduleSelects(props: {
  offices?: { id: string; name: string }[];
  schedules?: { id: string; name: string }[];
  officeId?: string;
  scheduleId?: string;
  onOfficeChange?: (id: string) => void;
  onScheduleChange?: (id: string) => void;
}) {
  return <EmployeeAssignmentSelects {...props} />;
}

export function EmployeeFormField({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      {children}
    </div>
  );
}
