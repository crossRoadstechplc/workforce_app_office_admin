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
import { CopyValue } from "@/components/ui/copy-value";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableEmpty, TableHead, TableRow, TableShell, Td, Th } from "@/components/ui/table-shell";
import { PlatformGate } from "@/components/auth/role-gates";
import { InviteDeliveryFields, type InviteDeliveryMethod } from "@/components/invites/invite-delivery-fields";
import { platformApi, type PlatformOrgAdmin, type PlatformOrganization } from "@/features/platform/platform-api";
import { inviteApi } from "@/features/invites/invite-api";

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
  const [delivery, setDelivery] = useState<InviteDeliveryMethod>("SHOW_PASSWORD");
  const [inviteResult, setInviteResult] = useState<{
    emailSent: boolean;
    inviteId?: string;
    emailError?: string;
    existingAccount?: boolean;
    requiresPassword?: boolean;
  } | null>(null);

  const orgsQ = useQuery({ queryKey: ["platform", "organizations"], queryFn: () => platformApi.organizations() });
  const adminsQ = useQuery({ queryKey: ["platform", "org-admins"], queryFn: () => platformApi.orgAdmins() });

  const orgs = useMemo(() => platformApi.itemsOf<PlatformOrganization>(orgsQ.data ?? []), [orgsQ.data]);
  const admins = useMemo(() => platformApi.itemsOf<PlatformOrgAdmin>(adminsQ.data ?? []), [adminsQ.data]);

  const create = useMutation({
    mutationFn: () => platformApi.createOrgAdmin({ organizationId, email, deliveryMethod: delivery }),
    onSuccess: (res) => {
      if (res.temporaryPassword) {
        toast.success("Org admin created");
        setTempPassword(res.temporaryPassword);
      } else if (res.existingAccount && !res.inviteId) {
        toast.success("Company admin access added to their existing account. They can switch roles at login.");
        setOpen(false);
      } else {
        setInviteResult({
          emailSent: !!res.emailSent,
          inviteId: res.inviteId,
          emailError: res.emailError,
          existingAccount: res.existingAccount,
          requiresPassword: res.requiresPassword
        });
        toast.success(
          res.emailSent
            ? res.requiresPassword === false
              ? "Invite email sent — they confirm access with their existing password"
              : "Invite email sent"
            : "Admin created, but the email was not sent"
        );
      }
      setEmail("");
      void qc.invalidateQueries({ queryKey: ["platform", "org-admins"] });
      void qc.invalidateQueries({ queryKey: ["platform", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const resend = useMutation({
    mutationFn: (id: string) => inviteApi.resend(id),
    onSuccess: (res) => {
      setInviteResult({ emailSent: res.emailSent, inviteId: res.inviteId, emailError: res.emailError });
      toast.success(res.emailSent ? "Invite email resent" : "Invite saved, but the email was not sent");
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
              if (!v) {
                setTempPassword(null);
                setInviteResult(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setOrganizationId(orgs[0]?.id ?? "");
                  setEmail("");
                  setTempPassword(null);
                  setInviteResult(null);
                  setDelivery("SHOW_PASSWORD");
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
                <CopyValue label="Temporary password" value={tempPassword} tone="amber" />
              ) : inviteResult ? (
                <div className="mt-5 space-y-3 text-sm">
                  <p className="text-slate-600">
                    {inviteResult.emailSent
                      ? inviteResult.requiresPassword === false || inviteResult.existingAccount
                        ? "An invite email was sent. They confirm access with their existing password, then choose Company Admin at login."
                        : "An invite email was sent. They will set a password from the link, then sign in."
                      : inviteResult.emailError ?? "The account was created, but the email could not be sent. Configure SMTP and resend."}
                  </p>
                  {!inviteResult.emailSent && inviteResult.inviteId && (
                    <Button variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(inviteResult.inviteId!)}>
                      {resend.isPending ? "Resending..." : "Resend invite"}
                    </Button>
                  )}
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
                  <InviteDeliveryFields value={delivery} onChange={setDelivery} />
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                {!tempPassword && !inviteResult && (
                  <Button disabled={create.isPending || !organizationId || !email} onClick={() => create.mutate()}>
                    {create.isPending ? "Creating..." : delivery === "SEND_EMAIL" ? "Send invite" : "Create"}
                  </Button>
                )}
                {(tempPassword || inviteResult) && (
                  <Button
                    onClick={() => {
                      setOpen(false);
                      setTempPassword(null);
                      setInviteResult(null);
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

      {tempPassword && !open && <CopyValue label="Latest temporary password" value={tempPassword} tone="amber" />}

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <Th>Email</Th>
              <Th>Organization</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </TableHead>
          <TableBody>
            {admins.map((a) => {
              const org = a.memberships?.[0]?.organization;
              return (
                <TableRow key={a.id}>
                  <Td className="font-medium">{a.email}</Td>
                  <Td>{org ? `${org.name} (${org.slug})` : "—"}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td>
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
                  </Td>
                </TableRow>
              );
            })}
            {!admins.length && <TableEmpty colSpan={4}>No company administrators yet.</TableEmpty>}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  );
}
