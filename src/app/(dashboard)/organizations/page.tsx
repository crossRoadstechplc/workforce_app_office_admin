"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyValue } from "@/components/ui/copy-value";
import { PlatformGate } from "@/components/auth/role-gates";
import { platformApi, type CreatedOrganization, type PlatformOrganization } from "@/features/platform/platform-api";

const blank = { name: "", slug: "", adminEmail: "", sendInvite: true };

export default function OrganizationsPage() {
  return (
    <PlatformGate>
      <OrganizationsInner />
    </PlatformGate>
  );
}

function OrganizationsInner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformOrganization | null>(null);
  const [form, setForm] = useState(blank);
  const [createdAdminPassword, setCreatedAdminPassword] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["platform", "organizations"], queryFn: () => platformApi.organizations() });
  const save = useMutation({
    mutationFn: async () => {
      const slug = form.slug.trim().toLowerCase();
      return editing
        ? platformApi.updateOrganization(editing.id, { name: form.name, slug })
        : platformApi.createOrganization({
            name: form.name,
            slug,
            ...(form.adminEmail.trim()
              ? { adminEmail: form.adminEmail.trim(), sendInvite: form.sendInvite }
              : {})
          });
    },
    onSuccess: (res) => {
      toast.success(editing ? "Organization updated" : "Organization created");
      const admin = "admin" in res ? (res as CreatedOrganization).admin : undefined;
      if (admin?.temporaryPassword) {
        setCreatedAdminPassword(admin.temporaryPassword);
        toast.success("Company admin created. Copy the temporary password.");
      } else if (admin?.emailSent) {
        toast.success("Company admin invite email sent");
      } else if (admin && admin.emailSent === false) {
        toast.error(admin.emailError ?? "Company admin was created, but the email was not sent");
      }
      if (!admin?.temporaryPassword) {
        setOpen(false);
        setEditing(null);
        setForm(blank);
      }
      void qc.invalidateQueries({ queryKey: ["platform", "organizations"] });
      void qc.invalidateQueries({ queryKey: ["platform", "org-admins"] });
      void qc.invalidateQueries({ queryKey: ["platform", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });
  const status = useMutation({
    mutationFn: ({ o, reason }: { o: PlatformOrganization; reason: string }) =>
      platformApi.organizationStatus(o.id, !o.isActive, reason),
    onSuccess: () => {
      toast.success("Organization status updated");
      void qc.invalidateQueries({ queryKey: ["platform", "organizations"] });
      void qc.invalidateQueries({ queryKey: ["platform", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  const orgs = platformApi.itemsOf<PlatformOrganization>(q.data ?? []);

  function edit(o: PlatformOrganization) {
    setEditing(o);
    setForm({ name: o.name, slug: o.slug, adminEmail: "", sendInvite: true });
    setCreatedAdminPassword(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Each organization is a SaaS customer with its own offices, admins, and employees."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                  setCreatedAdminPassword(null);
                }}
              >
                <Plus className="size-4" />
                Add organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>{editing ? "Edit organization" : "Create organization"}</DialogTitle>
              <DialogDescription>Slug is used for employee-code login disambiguation across tenants.</DialogDescription>
              <div className="mt-5 grid gap-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    placeholder="company-1"
                  />
                </div>
                {!editing && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Company admin email (optional)</Label>
                      <Input
                        type="email"
                        value={form.adminEmail}
                        onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                        placeholder="admin@company.com"
                      />
                    </div>
                    {form.adminEmail.trim() ? (
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={form.sendInvite}
                          onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })}
                        />
                        <span>
                          <span className="font-medium">Send invite email</span>
                          <span className="block text-xs text-slate-500">
                            Uncheck to create the admin now and copy a temporary password instead.
                          </span>
                        </span>
                      </label>
                    ) : null}
                  </>
                )}
                {createdAdminPassword ? <CopyValue label="Temporary password" value={createdAdminPassword} tone="amber" /> : null}
              </div>
              <div className="mt-6 flex justify-end">
                {createdAdminPassword ? (
                  <Button
                    onClick={() => {
                      setOpen(false);
                      setCreatedAdminPassword(null);
                      setForm(blank);
                    }}
                  >
                    Done
                  </Button>
                ) : (
                  <Button disabled={save.isPending} onClick={() => save.mutate()}>
                    {save.isPending ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {orgs.map((o) => (
          <Card key={o.id} className="p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Building className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{o.name}</h2>
                    <StatusBadge status={o.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">slug: {o.slug}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => edit(o)}>
                Edit
              </Button>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-slate-500">Offices</dt>
                <dd className="mt-1 font-medium">{o._count?.offices ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Employees</dt>
                <dd className="mt-1 font-medium">{o._count?.employees ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Members</dt>
                <dd className="mt-1 font-medium">{o._count?.memberships ?? 0}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t pt-4">
              <Button
                size="sm"
                variant={o.isActive ? "danger" : "secondary"}
                onClick={() => {
                  const reason = window.prompt(`Reason to ${o.isActive ? "deactivate" : "activate"} this organization?`);
                  if (reason) status.mutate({ o, reason });
                }}
              >
                <Power className="size-4" />
                {o.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
        {!orgs.length && (
          <Card className="lg:col-span-2">
            <EmptyState title="No organizations yet" description="Add the first tenant to start onboarding a customer." />
          </Card>
        )}
      </div>
    </div>
  );
}
