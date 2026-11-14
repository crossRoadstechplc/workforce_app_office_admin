"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, Laptop, Monitor, Package, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  assetStatusLabel,
  assetTypeLabel,
  assetTypeOptions,
  companyAssetApi,
  type AssetStatus,
  type AssetType,
  type CompanyAsset
} from "@/features/company-assets/company-asset-api";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";

const statusClass: Record<AssetStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-600/20",
  ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  DECLINED: "bg-red-50 text-red-700 ring-red-600/20",
  RETURNED: "bg-slate-100 text-slate-600 ring-slate-500/20"
};

function TypeIcon({ type }: { type: AssetType }) {
  const className = "size-4";
  if (type === "LAPTOP") return <Laptop className={className} />;
  if (type === "DESKTOP") return <Monitor className={className} />;
  if (type === "CAR") return <Car className={className} />;
  return <Package className={className} />;
}

function StatusPill({ status }: { status: AssetStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", statusClass[status])}>
      {assetStatusLabel(status)}
    </span>
  );
}

export function CompanyAssetManager({ employeeId }: { employeeId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CompanyAsset | null>(null);
  const [returning, setReturning] = useState<CompanyAsset | null>(null);
  const query = useQuery({
    queryKey: ["company-assets", "employee", employeeId],
    queryFn: () => companyAssetApi.list(new URLSearchParams({ employeeId, page: "1", pageSize: "100" }))
  });

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["company-assets"] });
  }

  const remove = useMutation({
    mutationFn: (id: string) => companyAssetApi.remove(id),
    onSuccess: () => {
      toast.success("Item removed");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message)
  });

  if (query.isLoading) return <Skeleton className="h-28" />;
  if (query.isError) return <p className="text-sm text-red-600">{query.error instanceof Error ? query.error.message : "Could not load company assets"}</p>;

  const items = query.data?.items ?? [];
  const pending = items.filter((item) => item.status === "PENDING").length;
  const held = items.filter((item) => item.status === "ACCEPTED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {held} with the employee · {pending} waiting for confirmation
        </p>
        <Button type="button" size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="size-3.5" />
          Add item
        </Button>
      </div>
      {adding ? (
        <AssetForm
          title="Assign an item"
          submitLabel="Assign and ask employee to confirm"
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            await companyAssetApi.create({ employeeId, ...input });
            toast.success("Assigned. The employee needs to accept it.");
            setAdding(false);
            refresh();
          }}
        />
      ) : null}
      {items.length === 0 && !adding ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
          Nothing has been issued to this employee yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                    <TypeIcon type={item.type} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-slate-950">{item.name}</h4>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {assetTypeLabel(item.type)} · {item.identifier}
                    </p>
                    {item.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.notes}</p> : null}
                    <p className="mt-2 text-xs text-slate-400">Assigned {formatDateTime(item.createdAt)}</p>
                    {item.responseNote ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Employee note: <span className="text-slate-800">{item.responseNote}</span>
                      </p>
                    ) : null}
                    {item.returnNote ? (
                      <p className="mt-1 text-sm text-slate-600">
                        Return note: <span className="text-slate-800">{item.returnNote}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
                {item.status !== "RETURNED" ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(item)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    {item.status === "ACCEPTED" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setReturning(item)}>
                        <RotateCcw className="size-3.5" />
                        Mark returned
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm(`Remove ${item.name}? The employee will no longer be asked to confirm it.`)) {
                            remove.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
              {editing?.id === item.id ? (
                <div className="mt-4">
                  <AssetForm
                    title="Edit item"
                    submitLabel={item.status === "ACCEPTED" ? "Save and ask employee to confirm again" : "Save item"}
                    initial={item}
                    hint={
                      item.status === "ACCEPTED" || item.status === "DECLINED"
                        ? "Changing the type, name, or identifier sends it back to the employee for a new confirmation."
                        : undefined
                    }
                    onCancel={() => setEditing(null)}
                    onSubmit={async (input) => {
                      await companyAssetApi.update(item.id, input);
                      toast.success("Item updated");
                      setEditing(null);
                      refresh();
                    }}
                  />
                </div>
              ) : null}
              {returning?.id === item.id ? (
                <ReturnForm
                  onCancel={() => setReturning(null)}
                  onSubmit={async (note) => {
                    await companyAssetApi.markReturned(item.id, note);
                    toast.success("Marked as returned");
                    setReturning(null);
                    refresh();
                  }}
                />
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetForm({
  title,
  submitLabel,
  hint,
  initial,
  onCancel,
  onSubmit
}: {
  title: string;
  submitLabel: string;
  hint?: string;
  initial?: CompanyAsset;
  onCancel: () => void;
  onSubmit: (input: { type: AssetType; name: string; identifier: string; notes?: string | null }) => Promise<void>;
}) {
  const [type, setType] = useState<AssetType>(initial?.type ?? "LAPTOP");
  const [name, setName] = useState(initial?.name ?? "");
  const [identifier, setIdentifier] = useState(initial?.identifier ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!name.trim() || !identifier.trim()) {
          toast.error("Name and identifier are required");
          return;
        }
        setBusy(true);
        try {
          await onSubmit({ type, name: name.trim(), identifier: identifier.trim(), notes: notes.trim() || null });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not save item");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Type</Label>
          <Select value={type} onChange={(event) => setType(event.target.value as AssetType)}>
            {assetTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="What was issued" required />
        </div>
        <div>
          <Label>Serial, tag, or plate</Label>
          <Input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-16" />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ReturnForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        setBusy(true);
        try {
          await onSubmit(note.trim());
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not mark this item returned");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm font-semibold text-slate-900">Record the return</p>
      <p className="mt-1 text-xs text-slate-500">This stays in the employee history. The employee is notified.</p>
      <Textarea className="mt-3 min-h-16" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note about condition or handover" />
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Confirm return"}
        </Button>
      </div>
    </form>
  );
}
