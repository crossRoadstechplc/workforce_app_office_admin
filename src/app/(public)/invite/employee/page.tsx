"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordMeetsRules, publicInviteApi } from "@/features/invites/invite-api";

export default function EmployeeInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </main>
      }
    >
      <EmployeeInviteInner />
    </Suspense>
  );
}

function EmployeeInviteInner() {
  const token = useSearchParams().get("token") ?? "";
  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => publicInviteApi.get(token),
    enabled: token.length > 0,
    retry: false
  });
  const [result, setResult] = useState<{ employeeCode: string; email: string; existingAccount?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const defaults = useMemo(() => {
    const payload = invite.data?.payload;
    return {
      employmentStartDate: payload?.employmentStartDate ?? "",
      jobTitle: payload?.jobTitle ?? "",
      departmentId: payload?.departmentId ?? "",
      evaluationTemplateId: payload?.evaluationTemplateId ?? ""
    };
  }, [invite.data]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const requiresPassword = invite.data?.requiresPassword ?? true;
    const password = String(f.get("password") ?? "");
    const confirm = String(f.get("confirmPassword") ?? "");
    if (requiresPassword) {
      if (password !== confirm) {
        toast.error("Passwords do not match");
        return;
      }
      if (!passwordMeetsRules(password)) {
        toast.error("Use at least 10 characters with upper, lower, and a number");
        return;
      }
    }
    setBusy(true);
    try {
      const created = await publicInviteApi.acceptEmployee(token, {
        firstName: String(f.get("firstName")),
        lastName: String(f.get("lastName")),
        middleName: String(f.get("middleName") || "") || undefined,
        phone: String(f.get("phone") || "") || undefined,
        jobTitle: String(f.get("jobTitle") || "") || undefined,
        departmentId: defaults.departmentId || undefined,
        evaluationTemplateId: defaults.evaluationTemplateId || undefined,
        employmentStartDate: String(f.get("employmentStartDate")),
        employeeCode: String(f.get("employeeCode") || "") || undefined,
        officeId: invite.data?.office?.id,
        scheduleId: invite.data?.schedule?.id,
        ...(requiresPassword ? { password } : {})
      });
      setResult(created);
      toast.success(created.existingAccount ? "Employee profile added to your existing account" : "Your employee account is ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete your profile");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p className="text-sm text-slate-500">This invite link is missing a token.</p>
      </main>
    );
  }

  if (invite.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </main>
    );
  }

  if (invite.isError || !invite.data) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p className="max-w-sm text-center text-sm text-slate-500">
          {invite.error instanceof Error ? invite.error.message : "This invite is invalid or has expired."}
        </p>
      </main>
    );
  }

  const data = invite.data;
  const requiresPassword = data.requiresPassword;

  if (result) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8">
          <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-blue-800">
            <UserPlus className="size-5" />
          </div>
          <h1 className="text-2xl font-semibold">You are set up</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in on the employee app with your email or employee code
            {result.existingAccount ? " and your existing password." : " and the password you just chose."}
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium">{result.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Employee code</dt>
              <dd className="font-mono font-medium">{result.employeeCode}</dd>
            </div>
          </dl>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[.9fr_1.1fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <div className="rounded-lg bg-blue-600 p-2">
            <ShieldCheck className="size-5" />
          </div>
          Workforce
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-[.2em] text-blue-300">{data.organization.name}</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Complete your employee profile.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            {requiresPassword
              ? "Enter your details, choose a password, then continue in the employee app."
              : "Enter your employee details. You can keep using your existing account password."}
          </p>
        </div>
      </section>
      <section className="flex items-start justify-center p-6 lg:items-center">
        <form onSubmit={submit} className="w-full max-w-xl">
          <h2 className="text-3xl font-semibold tracking-tight">Your information</h2>
          <p className="mt-2 text-sm text-slate-500">
            Invited as <span className="font-medium text-slate-700">{data.email}</span>
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
            <Field label="Middle name" name="middleName" />
            <Field label="Phone" name="phone" />
            <Field label="Job title" name="jobTitle" defaultValue={defaults.jobTitle ?? ""} />
            <Field label="Start date" name="employmentStartDate" type="date" required defaultValue={defaults.employmentStartDate} />
            <Field label="Employee code" name="employeeCode" placeholder="Leave blank to auto-generate" />
            <div>
              <Label>Office</Label>
              <Input value={data.office?.name ?? "Assigned after you join"} readOnly />
            </div>
            <div>
              <Label>Schedule</Label>
              <Input value={data.schedule?.name ?? "Assigned after you join"} readOnly />
            </div>
            {requiresPassword ? (
              <>
                <Field label="Password" name="password" type="password" required />
                <Field label="Confirm password" name="confirmPassword" type="password" required />
              </>
            ) : null}
          </div>
          {requiresPassword ? (
            <p className="mt-3 text-xs text-slate-500">Password needs at least 10 characters with upper, lower, and a number.</p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">This invite adds an employee profile to your existing Workforce account.</p>
          )}
          <Button className="mt-6 w-full" size="lg" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {requiresPassword ? "Create my account" : "Continue with existing account"}
          </Button>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} autoComplete={type === "password" ? "new-password" : undefined} />
    </div>
  );
}
