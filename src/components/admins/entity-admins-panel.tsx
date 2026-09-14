"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyValue } from "@/components/ui/copy-value";
import { InviteDeliveryFields, type InviteDeliveryMethod } from "@/components/invites/invite-delivery-fields";
import { inviteApi } from "@/features/invites/invite-api";

export type EntityAdmin = { id: string; email: string; status?: string };

export type AddAdminResult = {
  temporaryPassword?: string;
  emailSent?: boolean;
  inviteId?: string;
  emailError?: string;
  existingAccount?: boolean;
  requiresPassword?: boolean;
};

export function EntityAdminsPanel({
  title,
  addTitle,
  addDescription,
  admins,
  onAdd,
  onRemove,
  addLabel = "Add admin",
  preventLastRemoval = false
}: {
  title: string;
  addTitle: string;
  addDescription: string;
  admins: EntityAdmin[];
  onAdd: (input: { email: string; deliveryMethod: InviteDeliveryMethod }) => Promise<AddAdminResult>;
  onRemove: (userId: string) => Promise<void>;
  addLabel?: string;
  preventLastRemoval?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [delivery, setDelivery] = useState<InviteDeliveryMethod>("SHOW_PASSWORD");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    emailSent: boolean;
    inviteId?: string;
    emailError?: string;
    existingAccount?: boolean;
    requiresPassword?: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  function resetDialog() {
    setEmail("");
    setDelivery("SHOW_PASSWORD");
    setTempPassword(null);
    setInviteResult(null);
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await onAdd({ email, deliveryMethod: delivery });
      if (res.temporaryPassword) {
        setTempPassword(res.temporaryPassword);
        toast.success("Admin created");
      } else if (res.existingAccount && !res.inviteId) {
        toast.success("Access added to their existing account. They can switch roles at login.");
        setOpen(false);
        resetDialog();
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add admin");
    } finally {
      setSaving(false);
    }
  }

  async function resend(inviteId: string) {
    setResending(true);
    try {
      const res = await inviteApi.resend(inviteId);
      setInviteResult({ emailSent: res.emailSent, inviteId: res.inviteId, emailError: res.emailError });
      toast.success(res.emailSent ? "Invite email resent" : "Invite saved, but the email was not sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not resend invite");
    } finally {
      setResending(false);
    }
  }

  async function remove(admin: EntityAdmin) {
    if (preventLastRemoval && admins.length <= 1) {
      toast.error("Cannot remove the last company administrator");
      return;
    }
    if (!window.confirm(`Remove ${admin.email} as an admin here? Their other roles stay unchanged.`)) return;
    setRemovingId(admin.id);
    try {
      await onRemove(admin.id);
      toast.success("Admin removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove admin");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mt-5 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" />
              {addLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogTitle>{addTitle}</DialogTitle>
            <DialogDescription>{addDescription}</DialogDescription>
            {tempPassword ? (
              <CopyValue label="Temporary password" value={tempPassword} tone="amber" />
            ) : inviteResult ? (
              <div className="mt-5 space-y-3 text-sm">
                <p className="text-slate-600">
                  {inviteResult.emailSent
                    ? inviteResult.requiresPassword === false || inviteResult.existingAccount
                      ? "An invite email was sent. They confirm access with their existing password, then choose this role at login."
                      : "An invite email was sent. They will set a password from the link, then sign in."
                    : inviteResult.emailError ?? "The account was created, but the email could not be sent. Configure SMTP and resend."}
                </p>
                {!inviteResult.emailSent && inviteResult.inviteId && (
                  <Button variant="outline" disabled={resending} onClick={() => void resend(inviteResult.inviteId!)}>
                    {resending ? "Resending..." : "Resend invite"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <InviteDeliveryFields value={delivery} onChange={setDelivery} />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              {!tempPassword && !inviteResult && (
                <Button disabled={saving || !email} onClick={() => void submit()}>
                  {saving ? "Saving..." : delivery === "SEND_EMAIL" ? "Send invite" : "Create"}
                </Button>
              )}
              {(tempPassword || inviteResult) && (
                <Button
                  onClick={() => {
                    setOpen(false);
                    resetDialog();
                  }}
                >
                  Done
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {admins.length ? (
        <ul className="mt-3 space-y-2">
          {admins.map((admin) => (
            <li key={admin.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-medium text-slate-900">{admin.email}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={removingId === admin.id || (preventLastRemoval && admins.length <= 1)}
                onClick={() => void remove(admin)}
                aria-label={`Remove ${admin.email}`}
              >
                <X className="size-4" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">No admins assigned yet.</p>
      )}
    </div>
  );
}
