"use client";

import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { employeeApi } from "@/features/employees/employee-api";
import { employeeName } from "@/lib/utils/format";

export function SupervisorSelect({
  value,
  onChange,
  excludeId,
  name
}: {
  value: string;
  onChange?: (id: string) => void;
  excludeId?: string;
  name?: string;
}) {
  const q = useQuery({
    queryKey: ["employees", "supervisor-options"],
    queryFn: () => employeeApi.list(new URLSearchParams({ page: "1", pageSize: "100", status: "ACTIVE" }))
  });
  const items = (q.data?.items ?? []).filter((e) => e.id !== excludeId);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name ?? "supervisorId"}>Direct supervisor</Label>
      <Select
        id={name ?? "supervisorId"}
        name={name ?? "supervisorId"}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : { defaultValue: value })}
      >
        <option value="">Unassigned</option>
        {items.map((e) => (
          <option key={e.id} value={e.id}>
            {employeeName(e)}
            {e.jobTitle ? ` · ${e.jobTitle}` : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
