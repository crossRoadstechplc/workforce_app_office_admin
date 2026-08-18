"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { employeeApi } from "@/features/employees/employee-api";
import { meetingApi } from "@/features/meetings/meeting-api";
import type { MeetingRoom } from "@/types/meetings";

export default function MeetingRoomsPage() {
  return (
    <CompanyAdminGate>
      <RoomsInner />
    </CompanyAdminGate>
  );
}

function RoomsInner() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["meeting-rooms"], queryFn: () => meetingApi.rooms() });
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingRoom | null>(null);
  const [officeId, setOfficeId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("8");
  const [amenities, setAmenities] = useState("");

  function startCreate() {
    setEditing(null);
    setOfficeId("");
    setName("");
    setLocation("");
    setCapacity("8");
    setAmenities("");
    setOpen(true);
  }

  function startEdit(room: MeetingRoom) {
    setEditing(room);
    setOfficeId(room.officeId);
    setName(room.name);
    setLocation(room.location ?? "");
    setCapacity(String(room.capacity));
    setAmenities((room.amenities ?? []).join(", "));
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        location: location.trim() || undefined,
        capacity: Number(capacity) || 4,
        amenities: amenities.split(",").map((s) => s.trim()).filter(Boolean)
      };
      if (editing) return meetingApi.updateRoom(editing.id, payload);
      if (!officeId) throw new Error("Select an office");
      return meetingApi.createRoom({ officeId, ...payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Room updated" : "Room created");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["meeting-rooms"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const toggle = useMutation({
    mutationFn: (room: MeetingRoom) => meetingApi.updateRoom(room.id, { isActive: !room.isActive }),
    onSuccess: () => {
      toast.success("Room status updated");
      void qc.invalidateQueries({ queryKey: ["meeting-rooms"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;
  const rooms = q.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meeting rooms"
        description="Each room belongs to one office. Employees and office admins book free slots from the app — no approval step."
        action={
          <Button onClick={startCreate}>
            <Plus className="size-4" />
            Add room
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{editing ? "Edit room" : "New meeting room"}</DialogTitle>
          <DialogDescription>Rooms are office-scoped. People can only book rooms at their office.</DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            {!editing && (
              <div>
                <Label>Office</Label>
                <Select value={officeId} onChange={(e) => setOfficeId(e.target.value)} required>
                  <option value="">Select office</option>
                  {(offices.data ?? []).map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Boardroom" required />
            </div>
            <div>
              <Label>Location / floor</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="3rd floor, west wing" />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" min={1} max={200} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div>
              <Label>Amenities</Label>
              <Input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="TV, whiteboard, video" />
            </div>
            <Button type="submit" disabled={save.isPending}>{editing ? "Save" : "Create room"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-2">
        {rooms.map((room) => (
          <Card key={room.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{room.name}</h2>
                  <StatusBadge status={room.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{room.office?.name ?? "Office"} · {room.location || "No location"}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => startEdit(room)}>Edit</Button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Capacity</dt><dd className="font-medium">{room.capacity}</dd></div>
              <div><dt className="text-slate-500">Upcoming</dt><dd className="font-medium">{room._count?.bookings ?? 0}</dd></div>
            </dl>
            {!!room.amenities?.length && <p className="mt-3 text-sm text-slate-600">{room.amenities.join(" · ")}</p>}
            <div className="mt-4 border-t pt-3">
              <Button size="sm" variant={room.isActive ? "danger" : "secondary"} onClick={() => toggle.mutate(room)}>
                {room.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
        {!rooms.length && <p className="text-sm text-slate-500">No rooms yet. Create the first one for an office.</p>}
      </div>
    </div>
  );
}
