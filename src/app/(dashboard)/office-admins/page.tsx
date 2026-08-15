"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyValue } from "@/components/ui/copy-value";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { InviteDeliveryFields, type InviteDeliveryMethod } from "@/components/invites/invite-delivery-fields";
import { configurationApi, itemsOf } from "@/features/configuration/configuration-api";
import { inviteApi } from "@/features/invites/invite-api";
import { officeAdminApi } from "@/features/office-admins/office-admin-api";

export default function OfficeAdminsPage() {
  return (
    <CompanyAdminGate>
      <OfficeAdminsInner />
    </CompanyAdminGate>
  );
}

function OfficeAdminsInner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [officeIds, setOfficeIds] = useState<string[]>([]);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<InviteDeliveryMethod>("SHOW_PASSWORD");
  const [inviteResult, setInviteResult] = useState<{ emailSent: boolean; inviteId?: string; emailError?: string } | null>(null);

  const officesQ = useQuery({ queryKey: ["offices", "all"], queryFn: () => configurationApi.offices() });
  const adminsQ = useQuery({ queryKey: ["office-admins"], queryFn: () => officeAdminApi.list() });

  const offices = useMemo(() => itemsOf(officesQ.data ?? []), [officesQ.data]);
  const admins = adminsQ.data?.items ?? [];

  const create = useMutation({
    mutationFn: () => officeAdminApi.create({ email, officeIds, deliveryMethod: delivery }),
    onSuccess: (res) => {
      if (res.temporaryPassword) {
        toast.success("Office admin created");
        setTempPassword(res.temporaryPassword);
      } else {
        setInviteResult({ emailSent: !!res.emailSent, inviteId: res.inviteId, emailError: res.emailError });
        toast.success(res.emailSent ? "Invite email sent" : "Admin created, but the email was not sent");
      }
      void qc.invalidateQueries({ queryKey: ["office-admins"] });
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
      officeAdminApi.status(userId, next, reason),
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["office-admins"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const reset = useMutation({
    mutationFn: (userId: string) => officeAdminApi.resetPassword(userId, "Office admin password reset"),
    onSuccess: (res) => {
      setTempPassword(res.temporaryPassword);
      toast.success("Temporary password issued");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (officesQ.isLoading || adminsQ.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Office administrators"
        description="Assign admins to one or more offices. They manage employees and operations for those locations only — not company-wide office setup."
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
                  setEmail("");
                  setOfficeIds(offices[0] ? [offices[0].id] : []);
                  setTempPassword(null);
                  setInviteResult(null);
                  setDelivery("SHOW_PASSWORD");
                }}
              >
                <Plus className="size-4" />
                Add office admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogTitle>Create office administrator</DialogTitle>
              <DialogDescription>
                They will only see data for the selected office(s). They cannot create offices or schedules.
              </DialogDescription>
              {tempPassword ? (
                <CopyValue label="Temporary password" value={tempPassword} tone="amber" />
              ) : inviteResult ? (
                <div className="mt-5 space-y-3 text-sm">
                  <p className="text-slate-600">
                    {inviteResult.emailSent
                      ? "An invite email was sent. They will set a password from the link, then sign in."
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
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assigned offices</Label>
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                      {offices.map((o) => (
                        <label key={o.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={officeIds.includes(o.id)}
                            onChange={(e) => {
                              setOfficeIds((prev) =>
                                e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id)
                              );
                            }}
                          />
                          {o.name}
                        </label>
                      ))}
                    </div>
                  </div>
                  <InviteDeliveryFields value={delivery} onChange={setDelivery} />
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                {!tempPassword && !inviteResult && (
                  <Button disabled={create.isPending || !email || officeIds.length === 0} onClick={() => create.mutate()}>
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
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Offices</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.email}</td>
                <td className="px-4 py-3">{a.adminOffices.map((x) => x.office.name).join(", ") || "—"}</td>
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
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
