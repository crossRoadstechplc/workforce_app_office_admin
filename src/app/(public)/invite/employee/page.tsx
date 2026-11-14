"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmployeeSetupComplete } from "@/components/invites/employee-setup-complete";
import { BirthMonthDayField } from "@/components/employees/birth-month-day-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { passwordMeetsRules, publicInviteApi, EASY_PASSWORD_HINT } from "@/features/invites/invite-api";
import {
  EMERGENCY_CONTACT_RELATIONS,
  type EmergencyContactRelation
} from "@/types/employee";
import { assetTypeLabel } from "@/features/company-assets/company-asset-api";

const MAX_EMERGENCY_CONTACTS = 5;

type EmergencyDraft = {
  name: string;
  phone: string;
  relation: EmergencyContactRelation | "";
  relationOther: string;
};

const emptyEmergency = (): EmergencyDraft => ({
  name: "",
  phone: "",
  relation: "",
  relationOther: ""
});

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
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyDraft[]>([emptyEmergency()]);

  const defaults = useMemo(() => {
    const payload = invite.data?.payload;
    return {
      employmentStartDate: payload?.employmentStartDate ?? "",
      birthDate: payload?.birthDate ?? "",
      jobTitle: payload?.jobTitle ?? "",
      departmentId: payload?.departmentId ?? "",
      evaluationTemplateId: payload?.evaluationTemplateId ?? ""
    };
  }, [invite.data]);

  function updateEmergency(index: number, patch: Partial<EmergencyDraft>) {
    setEmergencyContacts((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function collectEmergencyContacts() {
    const filled = emergencyContacts.filter((row) => row.name.trim() || row.phone.trim());
    for (const row of filled) {
      if (!row.name.trim() || !row.phone.trim()) {
        throw new Error("Each emergency contact needs a name and phone number");
      }
      if (row.relation === "OTHER" && !row.relationOther.trim()) {
        throw new Error("Specify the relationship when Other is selected");
      }
    }
    return filled.map((row) => ({
      name: row.name.trim(),
      phone: row.phone.trim(),
      ...(row.relation ? { relation: row.relation } : {}),
      relationOther: row.relation === "OTHER" ? row.relationOther.trim() : null
    }));
  }

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
        toast.error(EASY_PASSWORD_HINT);
        return;
      }
    }

    let contacts: ReturnType<typeof collectEmergencyContacts>;
    try {
      contacts = collectEmergencyContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check emergency contacts");
      return;
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
        birthDate: String(f.get("birthDate") || "") || undefined,
        employeeCode: String(f.get("employeeCode") || "") || undefined,
        officeId: invite.data?.office?.id,
        scheduleId: invite.data?.schedule?.id,
        ...(contacts.length ? { emergencyContacts: contacts } : {}),
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
      <EmployeeSetupComplete
        email={result.email}
        employeeCode={result.employeeCode}
        existingAccount={result.existingAccount}
      />
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
              ? "Enter your details, birthday, emergency contact, and password, then continue in the employee app."
              : "Enter your employee details, birthday, and emergency contact. You can keep using your existing account password."}
          </p>
        </div>
      </section>
      <section className="flex items-start justify-center p-6 lg:items-center">
        <form onSubmit={submit} className="w-full max-w-xl py-6">
          <h2 className="text-3xl font-semibold tracking-tight">Your information</h2>
          <p className="mt-2 text-sm text-slate-500">
            Invited as <span className="font-medium text-slate-700">{data.email}</span>
          </p>
          {data.payload?.assets?.length ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Company items waiting for you</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                After you finish this form, open Company assets in the employee app and accept or decline each item.
              </p>
              <ul className="mt-3 space-y-2">
                {data.payload.assets.map((asset) => (
                  <li key={`${asset.type}-${asset.identifier}`} className="rounded-lg bg-white px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">{asset.name}</span>
                    <span className="text-slate-500">
                      {" "}
                      · {assetTypeLabel(asset.type)} · {asset.identifier}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
            <Field label="Middle name" name="middleName" />
            <Field label="Phone" name="phone" />
            <Field label="Job title" name="jobTitle" defaultValue={defaults.jobTitle ?? ""} />
            <Field label="Start date" name="employmentStartDate" type="date" required defaultValue={defaults.employmentStartDate} />
            <BirthMonthDayField name="birthDate" defaultValue={defaults.birthDate} />
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

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Emergency contacts</h3>
                <p className="text-xs text-slate-500">Optional. Add up to {MAX_EMERGENCY_CONTACTS} contacts.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={emergencyContacts.length >= MAX_EMERGENCY_CONTACTS}
                onClick={() => setEmergencyContacts((rows) => [...rows, emptyEmergency()])}
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>
            {emergencyContacts.map((row, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contact {index + 1}</p>
                  {emergencyContacts.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 px-0"
                      onClick={() => setEmergencyContacts((rows) => rows.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4 text-rose-600" />
                    </Button>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={row.name} onChange={(e) => updateEmergency(index, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={row.phone} onChange={(e) => updateEmergency(index, { phone: e.target.value })} />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <select
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      value={row.relation}
                      onChange={(e) =>
                        updateEmergency(index, { relation: e.target.value as EmergencyContactRelation | "" })
                      }
                    >
                      <option value="">Select relationship</option>
                      {EMERGENCY_CONTACT_RELATIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {row.relation === "OTHER" ? (
                    <div>
                      <Label>Specify relationship</Label>
                      <Input
                        value={row.relationOther}
                        onChange={(e) => updateEmergency(index, { relationOther: e.target.value })}
                        placeholder="e.g. Cousin, Neighbor"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {requiresPassword ? (
            <p className="mt-3 text-xs text-slate-500">{EASY_PASSWORD_HINT}</p>
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
      {type === "password" ? (
        <PasswordInput
          id={name}
          name={name}
          required={required}
          placeholder={placeholder ?? "At least 6 characters"}
          defaultValue={defaultValue}
          autoComplete="new-password"
          minLength={6}
        />
      ) : (
        <Input id={name} name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} />
      )}
    </div>
  );
}
