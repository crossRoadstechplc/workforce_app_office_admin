import { apiFetch } from "@/lib/api/api-client";
import type { DisplayBoardMode, DisplayDevice, DisplayDeviceList, DisplayPairing } from "@/types/displays";

const d = <T>(v: unknown): T => ((v as { data?: T })?.data ?? v) as T;

export const displayApi = {
  list: async () => d<DisplayDeviceList>(await apiFetch<unknown>("/admin/displays")),
  create: async (body: { officeId: string; name: string; boardMode: DisplayBoardMode }) =>
    d<DisplayDevice>(await apiFetch<unknown>("/admin/displays", { method: "POST", body: JSON.stringify(body) })),
  rePair: async (id: string) =>
    d<DisplayPairing>(await apiFetch<unknown>(`/admin/displays/${id}/re-pair`, { method: "POST", body: "{}" })),
  revoke: async (id: string) =>
    d<DisplayDevice>(await apiFetch<unknown>(`/admin/displays/${id}/revoke`, { method: "POST", body: "{}" }))
};
