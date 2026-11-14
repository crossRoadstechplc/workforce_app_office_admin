import { apiFetch } from "@/lib/api/api-client";

export const assetTypeOptions = [
  { value: "LAPTOP", label: "Laptop" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "CAR", label: "Car" },
  { value: "OTHER", label: "Other" }
] as const;

export type AssetType = (typeof assetTypeOptions)[number]["value"];
export type AssetStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "RETURNED";

export type AssetDraft = {
  type: AssetType;
  name: string;
  identifier: string;
  notes: string;
};

export type CompanyAsset = {
  id: string;
  employeeId: string;
  type: AssetType;
  name: string;
  identifier: string;
  notes: string | null;
  status: AssetStatus;
  responseNote: string | null;
  respondedAt: string | null;
  returnedAt: string | null;
  returnNote: string | null;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    office: { id: string; name: string } | null;
  };
  assignedBy: { id: string; email: string } | null;
  returnedBy: { id: string; email: string } | null;
};

export type AssetCounts = Record<AssetStatus, number>;

export function emptyAssetDraft(): AssetDraft {
  return { type: "LAPTOP", name: "", identifier: "", notes: "" };
}

export function assetTypeLabel(type: string) {
  return assetTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function assetStatusLabel(status: AssetStatus) {
  switch (status) {
    case "PENDING":
      return "Waiting for employee";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "RETURNED":
      return "Returned";
  }
}

/** Keep complete rows and reject a half-filled one before submit. */
export function collectAssetDrafts(rows: AssetDraft[]) {
  const touched = rows.filter((row) => row.name.trim() || row.identifier.trim() || row.notes.trim());
  if (touched.some((row) => !row.name.trim() || !row.identifier.trim())) {
    return { error: "Each company asset needs a name and an identifier (serial, asset tag, or plate)." };
  }
  return {
    assets: touched.map((row) => ({
      type: row.type,
      name: row.name.trim(),
      identifier: row.identifier.trim(),
      ...(row.notes.trim() ? { notes: row.notes.trim() } : {})
    }))
  };
}

type ListResponse = {
  data: {
    items: CompanyAsset[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
    counts: AssetCounts;
  };
};

export const companyAssetApi = {
  list: async (params: URLSearchParams) => {
    const response = await apiFetch<ListResponse>(`/admin/company-assets?${params}`);
    return response.data;
  },
  create: async (input: { employeeId: string; type: AssetType; name: string; identifier: string; notes?: string | null }) => {
    const response = await apiFetch<{ data: CompanyAsset }>("/admin/company-assets", {
      method: "POST",
      body: JSON.stringify(input)
    });
    return response.data;
  },
  update: async (id: string, input: { type?: AssetType; name?: string; identifier?: string; notes?: string | null }) => {
    const response = await apiFetch<{ data: CompanyAsset }>(`/admin/company-assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
    return response.data;
  },
  markReturned: async (id: string, note?: string) => {
    const response = await apiFetch<{ data: CompanyAsset }>(`/admin/company-assets/${id}/return`, {
      method: "POST",
      body: JSON.stringify(note ? { note } : {})
    });
    return response.data;
  },
  remove: (id: string) => apiFetch<{ data: { id: string } }>(`/admin/company-assets/${id}`, { method: "DELETE" })
};
