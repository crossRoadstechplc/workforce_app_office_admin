"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { performanceApi } from "@/features/performance/performance-api";
import type { EvaluationTemplate, TemplateItem } from "@/types/performance";

const STANDARD_ITEMS: TemplateItem[] = [
  { section: "METRIC", itemKey: "competency.quality_of_work", label: "Quality of Work", prompt: "How consistently does the employee produce accurate, thorough, and high-quality work?", scoringSource: "HUMAN", sortOrder: 10 },
  { section: "METRIC", itemKey: "competency.productivity", label: "Productivity", prompt: "How effectively does the employee complete assigned work within expected timelines?", scoringSource: "HUMAN", sortOrder: 20 },
  { section: "METRIC", itemKey: "competency.job_knowledge", label: "Job Knowledge", prompt: "How well does the employee understand and apply the knowledge and skills required for the role?", scoringSource: "HUMAN", sortOrder: 30 },
  { section: "METRIC", itemKey: "competency.reliability_attendance", label: "Reliability and Attendance", prompt: "How dependable is the employee in terms of attendance, punctuality, and completing commitments?", scoringSource: "SYSTEM_ATTENDANCE", sortOrder: 40 },
  { section: "METRIC", itemKey: "competency.communication", label: "Communication", prompt: "How clearly and professionally does the employee communicate with colleagues, supervisors, and clients?", scoringSource: "HUMAN", sortOrder: 50 },
  { section: "METRIC", itemKey: "competency.teamwork", label: "Teamwork", prompt: "How effectively does the employee cooperate with others and contribute to a positive working environment?", scoringSource: "HUMAN", sortOrder: 60 },
  { section: "METRIC", itemKey: "competency.initiative", label: "Initiative", prompt: "How willing is the employee to take responsibility, work independently, and identify tasks that need attention?", scoringSource: "HUMAN", sortOrder: 70 },
  { section: "METRIC", itemKey: "competency.problem_solving", label: "Problem-Solving", prompt: "How effectively does the employee identify problems and develop practical solutions?", scoringSource: "HUMAN", sortOrder: 80 },
  { section: "METRIC", itemKey: "competency.adaptability", label: "Adaptability", prompt: "How well does the employee respond to changes, feedback, new responsibilities, and workplace challenges?", scoringSource: "HUMAN", sortOrder: 90 },
  { section: "METRIC", itemKey: "competency.professionalism_accountability", label: "Professionalism and Accountability", prompt: "How consistently does the employee demonstrate integrity, respect, good judgment, and responsibility for their work?", scoringSource: "HUMAN", sortOrder: 100 }
];

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
                <p className="mt-1 text-sm text-slate-500">{t.description || "—"}</p>
              </div>
              <div className="flex gap-2">
                {t.isDefault ? <StatusBadge status="ACTIVE" /> : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{t.items.length} areas</p>
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
  const [name, setName] = useState(template?.name ?? "Standard performance evaluation");
  const [description, setDescription] = useState(template?.description ?? "");
  const [jobTitleHint, setJobTitleHint] = useState(template?.jobTitleHint ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? !template);
  const [items, setItems] = useState<TemplateItem[]>(
    template?.items?.length ? template.items.map((i) => ({ ...i, section: "METRIC" })) : STANDARD_ITEMS.map((i) => ({ ...i }))
  );

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description,
        jobTitleHint: jobTitleHint || undefined,
        isDefault,
        items: items.map((item, i) => ({
          ...item,
          section: "METRIC" as const,
          sortOrder: item.sortOrder || (i + 1) * 10
        }))
      };
      return template ? performanceApi.updateTemplate(template.id, payload) : performanceApi.createTemplate(payload);
    },
    onSuccess: () => {
      toast.success(template ? "Template updated" : "Template created");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>{template ? "Edit template" : "New template"}</DialogTitle>
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
              <Input value={jobTitleHint} onChange={(e) => setJobTitleHint(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Default template for employees
          </label>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Evaluation areas</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      section: "METRIC",
                      itemKey: `competency.area_${Date.now()}`,
                      label: "",
                      prompt: "",
                      scoringSource: "HUMAN",
                      sortOrder: (prev.at(-1)?.sortOrder ?? 0) + 10
                    }
                  ])
                }
              >
                Add area
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.itemKey} className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="min-w-[12rem] flex-1"
                      value={item.label}
                      onChange={(e) => setItems((prev) => prev.map((x) => (x.itemKey === item.itemKey ? { ...x, label: e.target.value } : x)))}
                      placeholder="Name"
                      required
                    />
                    <Select
                      value={item.scoringSource ?? "HUMAN"}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.itemKey === item.itemKey ? { ...x, scoringSource: e.target.value as TemplateItem["scoringSource"] } : x
                          )
                        )
                      }
                    >
                      <option value="HUMAN">Self + admin</option>
                      <option value="SYSTEM_ATTENDANCE">System (attendance)</option>
                    </Select>
                    <Button type="button" variant="ghost" onClick={() => setItems((prev) => prev.filter((x) => x.itemKey !== item.itemKey))}>
                      Remove
                    </Button>
                  </div>
                  <Input
                    value={item.prompt ?? ""}
                    onChange={(e) => setItems((prev) => prev.map((x) => (x.itemKey === item.itemKey ? { ...x, prompt: e.target.value } : x)))}
                    placeholder="Question"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending || items.length < 1}>{save.isPending ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
