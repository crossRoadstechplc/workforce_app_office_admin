"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { configurationApi, itemsOf } from "@/features/configuration/configuration-api";
import { employeeApi } from "@/features/employees/employee-api";
import { vaultApi } from "@/features/vault/vault-api";
import { hasVaultToken } from "@/features/vault/vault-token-store";
import type { Employee } from "@/types/employee";
import type {
  BillingCycle,
  OfficeSubscription,
  SubscriptionAssigneeType,
  SubscriptionStatus
} from "@/types/vault";

function unwrapEmployees(raw: unknown): Employee[] {
  const r = raw as { data?: { items?: Employee[] }; items?: Employee[] } | undefined;
  return r?.data?.items ?? r?.items ?? [];
}

function monthStart(yearMonth: string) {
  return `${yearMonth}-01`;
}

function monthEnd(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const last = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return `${yearMonth}-${String(last).padStart(2, "0")}`;
}

function toYearMonth(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 7);
}

type FormState = {
  name: string;
  vendor: string;
  category: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  seats: string;
  unitAmount: string;
  currency: string;
  startMonth: string;
  endMonth: string;
  notes: string;
  officeId: string;
  loginCredentialId: string;
  assigneeType: SubscriptionAssigneeType;
  employeeId: string;
  departmentId: string;
};

const blank: FormState = {
  name: "",
  vendor: "",
  category: "",
  status: "ACTIVE",
  billingCycle: "MONTHLY",
  seats: "1",
  unitAmount: "",
  currency: "ETB",
  startMonth: "",
  endMonth: "",
  notes: "",
  officeId: "",
  loginCredentialId: "",
  assigneeType: "COMPANY",
  employeeId: "",
  departmentId: ""
};

export function SubscriptionFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: OfficeSubscription | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(blank);
  const officesQ = useQuery({ queryKey: ["offices"], queryFn: () => configurationApi.offices(), enabled: open });
  const departmentsQ = useQuery({
    queryKey: ["departments"],
    queryFn: () => configurationApi.departments(),
    enabled: open
  });
  const employeesQ = useQuery({
    queryKey: ["employees", "vault-sub"],
    queryFn: () => employeeApi.list(new URLSearchParams({ page: "1", pageSize: "100", status: "ACTIVE" })),
    enabled: open
  });
  const credsQ = useQuery({
    queryKey: ["vault-credentials"],
    queryFn: () => vaultApi.credentials(),
    enabled: open && hasVaultToken("credentials")
  });
  const offices = itemsOf(officesQ.data ?? []);
  const departments = itemsOf(departmentsQ.data ?? []);
  const employees = unwrapEmployees(employeesQ.data);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            name: editing.name,
            vendor: editing.vendor ?? "",
            category: editing.category ?? "",
            status: editing.status,
            billingCycle: editing.billingCycle,
            seats: String(editing.seats),
            unitAmount: editing.unitAmount,
            currency: editing.currency,
            startMonth: toYearMonth(editing.startDate),
            endMonth: toYearMonth(editing.endDate),
            notes: editing.notes ?? "",
            officeId: editing.officeId ?? "",
            loginCredentialId: editing.loginCredentialId ?? "",
            assigneeType: editing.assigneeType ?? "COMPANY",
            employeeId: editing.employeeId ?? "",
            departmentId: editing.departmentId ?? ""
          }
        : blank
    );
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.name.trim().length < 2) throw new Error("Name is required");
      if (!form.startMonth) throw new Error("Start month is required");
      if (form.assigneeType === "PERSON" && !form.employeeId) throw new Error("Select a person");
      if (form.assigneeType === "TEAM" && !form.departmentId) throw new Error("Select a team");
      const seats = Number(form.seats);
      const unitAmount = Number(form.unitAmount);
      if (!Number.isFinite(seats) || seats < 1) throw new Error("Seats must be at least 1");
      if (!Number.isFinite(unitAmount) || unitAmount < 0) throw new Error("Unit amount is required");
      if (form.endMonth && form.endMonth < form.startMonth) throw new Error("End month must be after start month");
      const payload = {
        name: form.name.trim(),
        vendor: form.vendor.trim() || null,
        category: form.category.trim() || null,
        status: form.status,
        billingCycle: form.billingCycle,
        seats,
        unitAmount,
        currency: form.currency.trim() || "ETB",
        startDate: monthStart(form.startMonth),
        endDate: form.endMonth ? monthEnd(form.endMonth) : null,
        notes: form.notes.trim() || null,
        officeId: form.officeId || null,
        loginCredentialId: form.loginCredentialId || null,
        assigneeType: form.assigneeType,
        employeeId: form.assigneeType === "PERSON" ? form.employeeId : null,
        departmentId: form.assigneeType === "TEAM" ? form.departmentId : null,
        ...(editing && (seats !== editing.seats || unitAmount !== Number(editing.unitAmount))
          ? { fromYearMonth: new Date().toISOString().slice(0, 7) }
          : {})
      };
      if (editing) return vaultApi.updateSubscription(editing.id, payload);
      return vaultApi.createSubscription(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Subscription updated" : "Subscription created");
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{editing ? "Edit subscription" : "Add subscription"}</DialogTitle>
        <DialogDescription>
          Same product can be added more than once for different people or teams. New months start as Waiting.
        </DialogDescription>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="sub-name">Name</Label>
            <Input id="sub-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cursor Pro" />
          </div>
          <div>
            <Label htmlFor="sub-vendor">Vendor</Label>
            <Input id="sub-vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="sub-cat">Category</Label>
            <Input id="sub-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="software" />
          </div>
          <div>
            <Label htmlFor="sub-for">For</Label>
            <Select
              id="sub-for"
              value={form.assigneeType}
              onChange={(e) =>
                setForm({
                  ...form,
                  assigneeType: e.target.value as SubscriptionAssigneeType,
                  employeeId: "",
                  departmentId: ""
                })
              }
            >
              <option value="COMPANY">Company</option>
              <option value="PERSON">Person</option>
              <option value="TEAM">Team</option>
            </Select>
          </div>
          {form.assigneeType === "PERSON" ? (
            <div>
              <Label htmlFor="sub-person">Person</Label>
              <Select id="sub-person" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">
                  {employeesQ.isLoading ? "Loading…" : employeesQ.isError ? "Could not load people" : "Select person"}
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {form.assigneeType === "TEAM" ? (
            <div>
              <Label htmlFor="sub-team">Team</Label>
              <Select id="sub-team" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">Select team</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {form.assigneeType === "COMPANY" ? <div className="hidden sm:block" /> : null}
          <div>
            <Label htmlFor="sub-seats">How many (seats)</Label>
            <Input id="sub-seats" type="number" min={1} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="sub-amount">Unit amount / seat</Label>
            <Input id="sub-amount" type="number" min={0} step="0.01" value={form.unitAmount} onChange={(e) => setForm({ ...form, unitAmount: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="sub-start">Start month</Label>
            <Input id="sub-start" type="month" value={form.startMonth} onChange={(e) => setForm({ ...form, startMonth: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="sub-end">End month (optional)</Label>
            <Input id="sub-end" type="month" value={form.endMonth} onChange={(e) => setForm({ ...form, endMonth: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="sub-cycle">Billing cycle</Label>
            <Select id="sub-cycle" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value as BillingCycle })}>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="sub-cur">Currency</Label>
            <Input id="sub-cur" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
          </div>
          <div>
            <Label htmlFor="sub-status">Status</Label>
            <Select id="sub-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SubscriptionStatus })}>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="sub-office">Office</Label>
            <Select id="sub-office" value={form.officeId} onChange={(e) => setForm({ ...form, officeId: e.target.value })}>
              <option value="">Any office</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sub-login">Linked login</Label>
            <Select id="sub-login" value={form.loginCredentialId} onChange={(e) => setForm({ ...form, loginCredentialId: e.target.value })}>
              <option value="">{hasVaultToken("credentials") ? "None" : "Unlock credentials to link"}</option>
              {(credsQ.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sub-notes">Notes</Label>
            <Textarea id="sub-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
