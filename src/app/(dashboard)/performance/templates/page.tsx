"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { performanceApi } from "@/features/performance/performance-api";
import type { EvaluationItemSection, EvaluationTemplate, TemplateItem } from "@/types/performance";

const sections: EvaluationItemSection[] = ["METRIC", "RESPONSIBILITY", "SKILL_IMPROVED", "GOAL"];

export default function TemplatesPage() {
  return (
    <CompanyAdminGate>
      <TemplatesInner />
    </CompanyAdminGate>
  );
}

function TemplatesInner() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["evaluation-templates"], queryFn: performanceApi.templates });
  const [editing, setEditing] = useState<EvaluationTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  if (q.isLoading) return <PageSkeleton />;
  const items = q.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation templates"
        description="Form rows are per job family. The seeded Software Engineer template matches the internal review form."
        action={<Button onClick={() => setCreating(true)}>New template</Button>}
      />
      <p className="text-sm">
        <Link href="/performance" className="text-blue-700 hover:underline">Back to queue</Link>
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle>{t.name}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{t.description || t.jobTitleHint || "No description"}</p>
              </div>
              <div className="flex gap-2">
                {t.isDefault ? <StatusBadge status="ACTIVE" /> : null}
                {!t.isActive ? <StatusBadge status="INACTIVE" /> : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{t.items.length} items</p>
              <Button className="mt-3" variant="outline" size="sm" onClick={() => setEditing(t)}>Edit</Button>
            </CardContent>
          </Card>
        ))}
      </div>
      {(editing || creating) && (
        <TemplateEditor
          template={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            void qc.invalidateQueries({ queryKey: ["evaluation-templates"] });
          }}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved
}: {
  template: EvaluationTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [jobTitleHint, setJobTitleHint] = useState(template?.jobTitleHint ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [items, setItems] = useState<TemplateItem[]>(template?.items ?? []);

  const save = useMutation({
    mutationFn: () => {
      const payload = { name, description, jobTitleHint, isDefault, items };
      return template ? performanceApi.updateTemplate(template.id, payload) : performanceApi.createTemplate(payload);
    },
    onSuccess: () => {
      toast.success(template ? "Template updated" : "Template created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function addItem(section: EvaluationItemSection) {
    setItems((prev) => [...prev, { section, itemKey: `${section.toLowerCase()}.${Date.now()}`, label: "", sortOrder: (prev.at(-1)?.sortOrder ?? 0) + 10 }]);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
        <DialogDescription>Metrics and responsibilities are scored 1–10. Skills and goals appear in both improvement and next-period sections.</DialogDescription>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>Job title hint</Label>
              <Input value={jobTitleHint} onChange={(e) => setJobTitleHint(e.target.value)} placeholder="Software Engineer" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Default template when job title does not match
          </label>
          {sections.map((section) => (
            <div key={section}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{section.replaceAll("_", " ")}</h3>
                <Button type="button" size="sm" variant="outline" onClick={() => addItem(section)}>Add row</Button>
              </div>
              <div className="space-y-2">
                {items.filter((i) => i.section === section).map((item) => (
                  <div key={item.itemKey} className="flex gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) => setItems((prev) => prev.map((x) => (x.itemKey === item.itemKey ? { ...x, label: e.target.value } : x)))}
                      placeholder="Item label"
                    />
                    <Button type="button" variant="ghost" onClick={() => setItems((prev) => prev.filter((x) => x.itemKey !== item.itemKey))}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
