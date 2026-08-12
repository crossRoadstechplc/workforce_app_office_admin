"use client";

import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { tenantContextApi } from "@/features/context/tenant-context-api";

export function OfficeFilter({
  value,
  onChange,
  visible
}: {
  value: string;
  onChange: (officeId: string) => void;
  visible: boolean;
}) {
  const q = useQuery({
    queryKey: ["tenant-context"],
    queryFn: tenantContextApi.get,
    enabled: visible
  });

  if (!visible) return null;

  const offices = q.data?.offices ?? [];

  return (
    <div className="min-w-48 space-y-1.5">
      <Label>Office</Label>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All offices</option>
        {offices.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
