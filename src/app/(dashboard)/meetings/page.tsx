"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { OfficeFilter } from "@/components/ops/office-filter";
import { OpsSummaryStrip } from "@/components/ops/ops-summary-strip";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { TableShell } from "@/components/ui/table-shell";
import { meetingApi } from "@/features/meetings/meeting-api";
import { formatDateTime } from "@/lib/utils/format";
import type { MeetingBooking } from "@/types/meetings";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingQueuePage() {
  return (
    <CompanyAdminGate>
      <QueueInner />
    </CompanyAdminGate>
  );
}

function QueueInner() {
  const qc = useQueryClient();
  const [officeId, setOfficeId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MeetingBooking | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [moveRoomId, setMoveRoomId] = useState("");

  const rooms = useQuery({ queryKey: ["meeting-rooms"], queryFn: () => meetingApi.rooms() });
  const params = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: "50", status: "BOOKED" });
    if (officeId) p.set("officeId", officeId);
    if (roomId) p.set("roomId", roomId);
    if (search.trim()) p.set("search", search.trim());
    return p;
  }, [officeId, roomId, search, page]);

  const q = useQuery({ queryKey: ["meeting-bookings", params.toString()], queryFn: () => meetingApi.bookings(params) });

  const save = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("No booking selected");
      return meetingApi.reschedule(editing.id, {
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        roomId: moveRoomId || undefined
      });
    },
    onSuccess: () => {
      toast.success("Booking time updated");
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["meeting-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const cancel = useMutation({
    mutationFn: (id: string) => meetingApi.cancel(id),
    onSuccess: () => {
      toast.success("Booking cancelled");
      void qc.invalidateQueries({ queryKey: ["meeting-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  const items = q.data?.items ?? [];
  const counts = q.data?.counts;
  const meta = q.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting bookings"
        description="Live queue from employees and office admins. Change times or rooms — there is no approve or reject."
        action={
          <Button variant="outline" asChild>
            <Link href="/meetings/rooms">Manage rooms</Link>
          </Button>
        }
      />

      {counts && (
        <OpsSummaryStrip
          metrics={[
            { label: "Today", value: counts.today, tone: "default" },
            { label: "Upcoming", value: counts.upcoming, tone: "success" },
            { label: "In view", value: counts.total }
          ]}
        />
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4">
        <OfficeFilter visible value={officeId} onChange={(v) => { setOfficeId(v); setPage(1); }} />
        <div className="min-w-44 space-y-1.5">
          <Label>Room</Label>
          <Select value={roomId} onChange={(e) => { setRoomId(e.target.value); setPage(1); }}>
            <option value="">All rooms</option>
            {(rooms.data?.items ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.office?.name} · {r.name}</option>
            ))}
          </Select>
        </div>
        <div className="min-w-56 flex-1">
          <Label>Search</Label>
          <Input className="mt-1.5" placeholder="Title, name, or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <TableShell>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["When", "Room", "Title", "Booked by", "Status", ""].map((h) => (
                <th key={h || "a"} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{formatDateTime(row.startsAt)}</div>
                  <div className="text-xs text-slate-500">to {formatDateTime(row.endsAt)}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{row.room?.name}</div>
                  <div className="text-xs text-slate-500">{row.office?.name}</div>
                </td>
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">
                  <div>{row.organizerName ?? row.bookedBy?.email}</div>
                  <div className="text-xs text-slate-500">{row.bookedBy?.email}</div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={row.rescheduledAt ? "RESCHEDULED" : row.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(row);
                        setStartsAt(toLocalInput(row.startsAt));
                        setEndsAt(toLocalInput(row.endsAt));
                        setMoveRoomId(row.roomId);
                      }}
                    >
                      Change time
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Cancel this booking?")) cancel.mutate(row.id); }}>
                      Cancel
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">No bookings in this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableShell>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-slate-500">Page {meta.page} of {meta.totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogTitle>Change booking time</DialogTitle>
          <DialogDescription>Move the meeting to a free slot. This is not an approval — the booking stays confirmed.</DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            </div>
            <div>
              <Label>Room</Label>
              <Select value={moveRoomId} onChange={(e) => setMoveRoomId(e.target.value)}>
                {(rooms.data?.items ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.office?.name} · {r.name}</option>
                ))}
              </Select>
            </div>
            <Button type="submit" disabled={save.isPending}>Save time</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
