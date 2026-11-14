"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { assetTypeOptions, emptyAssetDraft, type AssetDraft } from "@/features/company-assets/company-asset-api";

export function AssetDraftEditor({
  value,
  onChange
}: {
  value: AssetDraft[];
  onChange: (next: AssetDraft[]) => void;
}) {
  function update(index: number, patch: Partial<AssetDraft>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Company assets</h3>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
            Laptop, desktop, car, or anything else issued by the company. The employee confirms each item in the app before it counts as accepted.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, emptyAssetDraft()])}>
          <Plus className="size-3.5" />
          Add item
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
          No items yet. You can add them now, or later from the employee page.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {value.map((row, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Item {index + 1}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.filter((_, i) => i !== index))}>
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`asset-type-${index}`}>Type</Label>
                  <Select id={`asset-type-${index}`} value={row.type} onChange={(event) => update(index, { type: event.target.value as AssetDraft["type"] })}>
                    {assetTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`asset-name-${index}`}>Name</Label>
                  <Input
                    id={`asset-name-${index}`}
                    value={row.name}
                    placeholder="MacBook Pro, office desktop, Corolla…"
                    onChange={(event) => update(index, { name: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`asset-id-${index}`}>Serial, tag, or plate</Label>
                  <Input
                    id={`asset-id-${index}`}
                    value={row.identifier}
                    placeholder="Serial number or plate"
                    onChange={(event) => update(index, { identifier: event.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`asset-notes-${index}`}>Notes</Label>
                  <Textarea
                    id={`asset-notes-${index}`}
                    value={row.notes}
                    className="min-h-16"
                    placeholder="Condition, accessories, or where it is kept"
                    onChange={(event) => update(index, { notes: event.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
