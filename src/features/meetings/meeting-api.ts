import { apiFetch } from "@/lib/api/api-client";
import type { MeetingBooking, MeetingBookingList, MeetingRoom, MeetingRoomList } from "@/types/meetings";

const d = <T>(v: unknown): T => ((v as { data?: T })?.data ?? v) as T;

export const meetingApi = {
  rooms: async (params = new URLSearchParams({ page: "1", pageSize: "100" })) =>
    d<MeetingRoomList>(await apiFetch<unknown>(`/admin/meetings/rooms?${params}`)),
  createRoom: async (body: { officeId: string; name: string; location?: string; capacity: number; amenities?: string[] }) =>
    d<MeetingRoom>(await apiFetch<unknown>("/admin/meetings/rooms", { method: "POST", body: JSON.stringify(body) })),
  updateRoom: async (id: string, body: unknown) =>
    d<MeetingRoom>(await apiFetch<unknown>(`/admin/meetings/rooms/${id}`, { method: "PATCH", body: JSON.stringify(body) })),
  bookings: async (params: URLSearchParams) =>
    d<MeetingBookingList>(await apiFetch<unknown>(`/admin/meetings/bookings?${params}`)),
  reschedule: async (id: string, body: { startsAt?: string; endsAt?: string; roomId?: string; title?: string }) =>
    d<MeetingBooking>(await apiFetch<unknown>(`/admin/meetings/bookings/${id}`, { method: "PATCH", body: JSON.stringify(body) })),
  cancel: async (id: string) =>
    d<MeetingBooking>(await apiFetch<unknown>(`/admin/meetings/bookings/${id}/cancel`, { method: "POST", body: "{}" }))
};
