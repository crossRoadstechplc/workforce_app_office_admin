"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { employeeApi } from "@/features/employees/employee-api";
import { performanceApi } from "@/features/performance/performance-api";
import { employeeName } from "@/lib/utils/format";
import type { Employee } from "@/types/employee";

function unwrapList<T>(raw: unknown): T[] {
  const r = raw as { data?: { items?: T[] }; items?: T[] };
  return r?.data?.items ?? r?.items ?? [];
}

export function NewEvaluationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [name, setName] = useState("Performance review");
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(today);

  const departments = useQuery({ queryKey: ["departments", "select"], queryFn: employeeApi.departments, enabled: open });
  const employees = useQuery({
    queryKey: ["employees", "eval-pick", departmentId],
    enabled: open,
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", pageSize: "100", status: "ACTIVE" });
      if (departmentId) p.set("departmentId", departmentId);
      return employeeApi.list(p);
    }
  });
  const cycles = useQuery({
    queryKey: ["evaluation-cycles"],
    queryFn: () => performanceApi.cycles(),
    enabled: open
  });

  const employeeItems = unwrapList<Employee>(employees.data);
  const deptItems: { id: string; name: string }[] = Array.isArray(departments.data)
    ? departments.data
    : unwrapList<{ id: string; name: string }>(departments.data);
  const openCycles = (cycles.data?.items ?? []).filter((c) => c.status === "OPEN" || c.status === "DRAFT");

  const selectedCycle = useMemo(() => openCycles.find((c) => c.id === cycleId), [openCycles, cycleId]);

  const create = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Select an employee");
      if (cycleId && selectedCycle?.status === "OPEN") {
        return performanceApi.openCycle(cycleId, { employeeIds: [employeeId] });
      }
      if (cycleId && selectedCycle?.status === "DRAFT") {
        return performanceApi.openCycle(cycleId, { employeeIds: [employeeId] });
      }
      return performanceApi.createCycle({
        name,
        periodStart: from,
        periodEnd: to,
        employeeIds: [employeeId],
        open: true
      });
    },
    onSuccess: () => {
      toast.success("Evaluation created");
      onOpenChange(false);
      setEmployeeId("");
      void qc.invalidateQueries({ queryKey: ["evaluations"] });
      void qc.invalidateQueries({ queryKey: ["evaluation-cycles"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>New evaluation</DialogTitle>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div>
            <Label>Department</Label>
            <Select value={departmentId} onChange={(e) => { setDepartmentId(e.target.value); setEmployeeId(""); }}>
              <option value="">All departments</option>
              {deptItems.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Employee</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
              <option value="">Select employee</option>
              {employeeItems.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {employeeName(emp)} {emp.jobTitle ? `· ${emp.jobTitle}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Cycle</Label>
            <Select value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              <option value="">New cycle</option>
              {openCycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </Select>
          </div>
          {!cycleId && (
            <>
              <div>
                <Label>Cycle name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Period start</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
                </div>
                <div>
                  <Label>Period end</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
                </div>
              </div>
            </>
          )}
          {selectedCycle ? (
            <p className="text-sm text-slate-500">
              {selectedCycle.periodStart} – {selectedCycle.periodEnd}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
