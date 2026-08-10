"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { employeeApi } from "@/features/employees/employee-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateResult = { temporaryPassword: string; employeeCode: string };

export function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);
  const qc = useQueryClient();
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices, enabled: open });
  const schedules = useQuery({ queryKey: ["schedules", "select"], queryFn: employeeApi.schedules, enabled: open });
  const mutation = useMutation({
    mutationFn: employeeApi.create,
    onSuccess: (r) => {
      setResult({ temporaryPassword: r.temporaryPassword, employeeCode: r.employee.employeeCode });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create employee")
  });

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const employeeCode = String(f.get("employeeCode") || "").trim();
    mutation.mutate({
      email: String(f.get("email")),
      ...(employeeCode ? { employeeCode } : {}),
      firstName: String(f.get("firstName")),
      middleName: String(f.get("middleName") || "") || undefined,
      lastName: String(f.get("lastName")),
      phone: String(f.get("phone") || "") || undefined,
      jobTitle: String(f.get("jobTitle") || "") || undefined,
      department: String(f.get("department") || "") || undefined,
      employmentStartDate: String(f.get("employmentStartDate")),
      officeId: String(f.get("officeId") || "") || undefined,
      scheduleId: String(f.get("scheduleId") || "") || undefined
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{result ? "Employee created" : "Register employee"}</DialogTitle>
        <DialogDescription>
          {result
            ? "Share the employee code and temporary password through a secure channel. The password is shown only once."
            : "Create the account and assign the employee's current office and schedule."}
        </DialogDescription>
        {result ? (
          <div className="mt-6 space-y-4">
            <div>
              <Label>Employee code</Label>
              <div className="rounded-xl border bg-muted/40 p-4 font-mono text-base font-semibold">{result.employeeCode}</div>
            </div>
            <div>
              <Label>Temporary password</Label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-mono text-base font-semibold text-amber-950">
                {result.temporaryPassword}
              </div>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field
              label="Employee code"
              name="employeeCode"
              placeholder="Leave blank to auto-generate"
              hint="Optional. If you enter a code, it will be saved as-is."
            />
            <Field label="Email" name="email" type="email" required />
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
            <Field label="Middle name" name="middleName" />
            <Field label="Phone" name="phone" />
            <Field label="Job title" name="jobTitle" />
            <Field label="Department" name="department" />
            <Field label="Start date" name="employmentStartDate" type="date" required />
            <div>
              <Label htmlFor="officeId">Office</Label>
              <select id="officeId" name="officeId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm">
                <option value="">Unassigned</option>
                {offices.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="scheduleId">Schedule</Label>
              <select id="scheduleId" name="scheduleId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm">
                <option value="">Unassigned</option>
                {schedules.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating…" : "Create employee"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  hint
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} />
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
