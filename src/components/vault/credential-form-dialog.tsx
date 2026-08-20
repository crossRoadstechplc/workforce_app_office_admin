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
import { vaultApi } from "@/features/vault/vault-api";
import type { VaultCredential, VaultCredentialType } from "@/types/vault";

const TYPES: { value: VaultCredentialType; label: string }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "PASSWORD", label: "Password" },
  { value: "WIFI", label: "Wi-Fi" },
  { value: "BANK", label: "Bank" },
  { value: "SOFTWARE", label: "Software" },
  { value: "API_KEY", label: "API key" },
  { value: "OTHER", label: "Other" }
];

type FormState = {
  title: string;
  type: VaultCredentialType;
  officeId: string;
  username: string;
  email: string;
  url: string;
  notes: string;
  secret: string;
};

const blank: FormState = { title: "", type: "PASSWORD", officeId: "", username: "", email: "", url: "", notes: "", secret: "" };

export function CredentialFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: VaultCredential | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(blank);
  const officesQ = useQuery({ queryKey: ["offices"], queryFn: () => configurationApi.offices(), enabled: open });
  const offices = itemsOf(officesQ.data ?? []);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            title: editing.title,
            type: editing.type,
            officeId: editing.officeId ?? "",
            username: editing.username ?? "",
            email: editing.email ?? "",
            url: editing.url ?? "",
            notes: editing.notes ?? "",
            secret: ""
          }
        : blank
    );
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (form.title.trim().length < 2) throw new Error("Title is required");
      if (!editing && !form.secret) throw new Error("Secret is required");
      const payload = {
        title: form.title.trim(),
        type: form.type,
        officeId: form.officeId || null,
        username: form.username.trim() || null,
        email: form.email.trim() || null,
        url: form.url.trim() || null,
        notes: form.notes.trim() || null,
        ...(form.secret ? { secret: form.secret } : {})
      };
      if (editing) return vaultApi.updateCredential(editing.id, payload);
      return vaultApi.createCredential({ ...payload, secret: form.secret });
    },
    onSuccess: () => {
      toast.success(editing ? "Credential updated" : "Credential saved");
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{editing ? "Edit credential" : "Add credential"}</DialogTitle>
        <DialogDescription>Stored encrypted. The list always shows a masked value.</DialogDescription>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="cred-title">Title</Label>
            <Input id="cred-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Office Gmail" />
          </div>
          <div>
            <Label htmlFor="cred-type">Type</Label>
            <Select id="cred-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VaultCredentialType })}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cred-office">Office</Label>
            <Select id="cred-office" value={form.officeId} onChange={(e) => setForm({ ...form, officeId: e.target.value })}>
              <option value="">Company-wide</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cred-email">Email</Label>
            <Input id="cred-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="cred-user">Username</Label>
            <Input id="cred-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cred-url">URL</Label>
            <Input id="cred-url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cred-secret">{editing ? "New secret (leave blank to keep)" : "Password / secret"}</Label>
            <Input id="cred-secret" type="password" autoComplete="new-password" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cred-notes">Notes</Label>
            <Textarea id="cred-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
