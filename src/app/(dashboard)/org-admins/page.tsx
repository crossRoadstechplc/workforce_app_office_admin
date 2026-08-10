"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Power, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { PlatformGate } from "@/components/auth/role-gates";
import { platformApi, type PlatformOrgAdmin, type PlatformOrganization } from "@/features/platform/platform-api";

export default function OrgAdminsPage() {
  return (
    <PlatformGate>
      <OrgAdminsInner />
    </PlatformGate>
  );
}

function OrgAdminsInner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const orgsQ = useQuery({ queryKey: ["platform", "organizations"], queryFn: () => platformApi.organizations() });
  const adminsQ = useQuery({ queryKey: ["platform", "org-admins"], queryFn: () => platformApi.orgAdmins() });

  const orgs = useMemo(() => platformApi.itemsOf<PlatformOrganization>(orgsQ.data ?? []), [orgsQ.data]);
  const admins = useMemo(() => platformApi.itemsOf<PlatformOrgAdmin>(adminsQ.data ?? []), [adminsQ.data]);

  const create = useMutation({
    mutationFn: () => platformApi.createOrgAdmin({ organizationId, email }),
    onSuccess: (res) => {
      toast.success("Org admin created");
      setTempPassword(res.temporaryPassword);
      setEmail("");
      void qc.invalidateQueries({ queryKey: ["platform", "org-admins"] });
      void qc.invalidateQueries({ queryKey: ["platform", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const status = useMutation({
    mutationFn: ({ userId, next, reason }: { userId: string; next: "ACTIVE" | "INACTIVE"; reason: string }) =>
      platformApi.orgAdminStatus(userId, next, reason),
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["platform", "org-admins"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const reset = useMutation({
    mutationFn: (userId: string) => platformApi.resetOrgAdminPassword(userId, "Admin portal password reset"),
    onSuccess: (res) => {
      setTempPassword(res.temporaryPassword);
      toast.success("Temporary password issued");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (orgsQ.isLoading || adminsQ.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company administrators"
        description="Provision company-wide admins. Each admin manages all offices in the organization and can assign office-level admins."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setTempPassword(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setOrganizationId(orgs[0]?.id ?? "");
                  setEmail("");
                  setTempPassword(null);
                }}
              >
                <Plus className="size-4" />
                Add org admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Create organization admin</DialogTitle>
              <DialogDescription>They will sign in to the tenant console for the selected organization.</DialogDescription>
              {tempPassword ? (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                  <p className="font-semibold text-amber-900">Temporary password (copy now)</p>
                  <p className="mt-2 font-mono text-amber-950">{tempPassword}</p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4">
                  <div className="space-y-1.5">
                    <Label>Organization</Label>
                    <select
                      className="h-10 w-full rounded-md border px-3 text-sm"
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                    >
                      <option value="">Select organization</option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                {!tempPassword && (
                  <Button disabled={create.isPending || !organizationId || !email} onClick={() => create.mutate()}>
                    {create.isPending ? "Creating..." : "Create"}
                  </Button>
                )}
                {tempPassword && (
                  <Button
                    onClick={() => {
                      setOpen(false);
                      setTempPassword(null);
                    }}
                  >
                    Done
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {tempPassword && !open && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">Latest temporary password</p>
          <p className="mt-1 font-mono">{tempPassword}</p>
        </div>
      )}

      <TableShell>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const org = a.memberships?.[0]?.organization;
              return (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{a.email}</td>
                  <td className="px-4 py-3">{org ? `${org.name} (${org.slug})` : "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const reason = window.prompt(`Reason to ${a.status === "ACTIVE" ? "deactivate" : "activate"}?`);
                          if (reason) status.mutate({ userId: a.id, next: a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", reason });
                        }}
                      >
                        <Power className="size-4" />
                        {a.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => reset.mutate(a.id)}>
                        <KeyRound className="size-4" />
                        Reset password
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
