"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { employeeApi } from "@/features/employees/employee-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMERGENCY_CONTACT_RELATIONS,
  formatEmergencyRelation,
  type EmergencyContact,
  type EmergencyContactRelation
} from "@/types/employee";

type Draft = {
  name: string;
  phone: string;
  relation: EmergencyContactRelation | "";
  relationOther: string;
};

const emptyDraft = (): Draft => ({ name: "", phone: "", relation: "", relationOther: "" });

export function EmergencyContactsPanel({
  employeeId,
  contacts
}: {
  employeeId: string;
  contacts: EmergencyContact[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(contact: EmergencyContact) {
    setEditing(contact);
    setDraft({
      name: contact.name,
      phone: contact.phone,
      relation: contact.relation,
      relationOther: contact.relationOther ?? ""
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim() || !draft.phone.trim() || !draft.relation) {
        throw new Error("Name, phone, and relationship are required");
      }
      if (draft.relation === "OTHER" && !draft.relationOther.trim()) {
        throw new Error("Specify the relationship when Other is selected");
      }
      const payload = {
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        relation: draft.relation,
        relationOther: draft.relation === "OTHER" ? draft.relationOther.trim() : null
      };
      if (editing) return employeeApi.updateEmergencyContact(employeeId, editing.id, payload);
      return employeeApi.createEmergencyContact(employeeId, payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Emergency contact updated" : "Emergency contact added");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const remove = useMutation({
    mutationFn: (contactId: string) => employeeApi.deleteEmergencyContact(employeeId, contactId),
    onSuccess: () => {
      toast.success("Emergency contact removed");
      void qc.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emergency contacts</p>
        <Button type="button" size="sm" variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500">No emergency contacts yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border bg-slate-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{contact.name}</p>
                  <p className="text-sm text-slate-600">{contact.phone}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatEmergencyRelation(contact.relation, contact.relationOther)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 px-0"
                    onClick={() => openEdit(contact)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 px-0"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Remove ${contact.name}?`)) remove.mutate(contact.id);
                    }}
                  >
                    <Trash2 className="size-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? "Edit emergency contact" : "Add emergency contact"}</DialogTitle>
          <DialogDescription>Name, phone, and relationship for this contact.</DialogDescription>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} required />
            </div>
            <div>
              <Label>Relationship</Label>
              <select
                className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
                value={draft.relation}
                onChange={(e) => setDraft((d) => ({ ...d, relation: e.target.value as EmergencyContactRelation | "" }))}
                required
              >
                <option value="">Select relationship</option>
                {EMERGENCY_CONTACT_RELATIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            {draft.relation === "OTHER" ? (
              <div>
                <Label>Specify relationship</Label>
                <Input
                  value={draft.relationOther}
                  onChange={(e) => setDraft((d) => ({ ...d, relationOther: e.target.value }))}
                  placeholder="e.g. Cousin, Neighbor"
                  required
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
