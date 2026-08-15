"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { employeeApi } from "@/features/employees/employee-api";
import { inviteApi } from "@/features/invites/invite-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyValue } from "@/components/ui/copy-value";

type CreateResult = { temporaryPassword: string; employeeCode: string };
type InviteResult = { emailSent: boolean; inviteId?: string; emailError?: string; email: string };

export function CreateEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "invite">("create");
  const [result, setResult] = useState<CreateResult | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);
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
  const inviteMut = useMutation({
    mutationFn: inviteApi.createEmployee,
    onSuccess: (r, variables) => {
      setInviteResult({ emailSent: r.emailSent, inviteId: r.inviteId, emailError: r.emailError, email: variables.email });
      qc.invalidateQueries({ queryKey: ["employee-invites"] });
      toast.success(r.emailSent ? "Invite email sent" : "Invite saved, but the email was not sent");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send invite")
  });
  const resend = useMutation({
    mutationFn: (id: string) => inviteApi.resend(id),
    onSuccess: (r) => {
      setInviteResult((prev) => (prev ? { ...prev, emailSent: r.emailSent, inviteId: r.inviteId, emailError: r.emailError } : prev));
      toast.success(r.emailSent ? "Invite email resent" : "Invite saved, but the email was not sent");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not resend invite")
  });

  function submitCreate(e: React.FormEvent<HTMLFormElement>) {
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

  function submitInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    inviteMut.mutate({
      email: String(f.get("email")),
      officeId: String(f.get("officeId") || "") || undefined,
      scheduleId: String(f.get("scheduleId") || "") || undefined,
      employmentStartDate: String(f.get("employmentStartDate") || "") || undefined,
      jobTitle: String(f.get("jobTitle") || "") || undefined,
      department: String(f.get("department") || "") || undefined
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setResult(null);
          setInviteResult(null);
          setMode("create");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Add employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{result ? "Employee created" : inviteResult ? "Employee invite" : "Register employee"}</DialogTitle>
        <DialogDescription>
          {result
            ? "Share the employee code and temporary password through a secure channel. The password is shown only once."
            : inviteResult
              ? inviteResult.emailSent
                ? `${inviteResult.email} will complete their own profile from the email link.`
                : inviteResult.emailError ?? "The invite was saved, but the email could not be sent."
              : "Create the account now, or send a form link so the employee enters their own details."}
        </DialogDescription>
        {result ? (
          <div className="mt-6 space-y-4">
            <CopyValue label="Employee code" value={result.employeeCode} />
            <CopyValue label="Temporary password" value={result.temporaryPassword} tone="amber" />
            <p className="text-xs text-slate-500">
              Login with the employee code. The temporary password is the code plus <span className="font-mono">@Temp1</span>.
            </p>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : inviteResult ? (
          <div className="mt-6 space-y-4">
            {!inviteResult.emailSent && inviteResult.inviteId ? (
              <Button variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(inviteResult.inviteId!)}>
                {resend.isPending ? "Resending..." : "Resend invite"}
              </Button>
            ) : null}
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 rounded-lg border p-1 text-sm">
              <button
                type="button"
                className={`rounded-md px-3 py-2 ${mode === "create" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                onClick={() => setMode("create")}
              >
                Create now
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-2 ${mode === "invite" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                onClick={() => setMode("invite")}
              >
                Invite by email
              </button>
            </div>
            {mode === "create" ? (
              <form onSubmit={submitCreate} className="mt-6 grid gap-4 sm:grid-cols-2">
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
                <OfficeScheduleSelects offices={offices.data} schedules={schedules.data} />
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Creating…" : "Create employee"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={submitInvite} className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Email" name="email" type="email" required />
                <Field label="Start date" name="employmentStartDate" type="date" />
                <Field label="Job title" name="jobTitle" />
                <Field label="Department" name="department" />
                <OfficeScheduleSelects offices={offices.data} schedules={schedules.data} />
                <p className="text-xs text-slate-500 sm:col-span-2">
                  The employee opens a form from the email, fills the rest of their details, and chooses a password.
                </p>
                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteMut.isPending}>
                    {inviteMut.isPending ? "Sending…" : "Send invite"}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function OfficeScheduleSelects({
  offices,
  schedules
}: {
  offices?: { id: string; name: string }[];
  schedules?: { id: string; name: string }[];
}) {
  return (
    <>
      <div>
        <Label htmlFor="officeId">Office</Label>
        <select id="officeId" name="officeId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm">
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
        <select id="scheduleId" name="scheduleId" className="h-10 w-full rounded-lg border bg-white px-3 text-sm">
          <option value="">Unassigned</option>
          {schedules?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </>
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
