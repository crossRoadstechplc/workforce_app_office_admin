"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, Plus } from "lucide-react";
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
import { displayApi } from "@/features/displays/display-api";
import type { DisplayBoardMode, DisplayDevice } from "@/types/displays";

function PairingQr({ value }: { value: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(value)}`;
  return <img src={src} alt={`Pairing code ${value}`} width={180} height={180} className="rounded-lg bg-white p-2" />;
}

function formatSeen(value?: string | null) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Never";
  return d.toLocaleString();
}

export default function DisplayDevicesPage() {
  return (
    <CompanyAdminGate>
      <DisplaysInner />
    </CompanyAdminGate>
  );
}

function DisplaysInner() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["display-devices"], queryFn: () => displayApi.list() });
  const offices = useQuery({ queryKey: ["offices", "select"], queryFn: employeeApi.offices });
  const [createOpen, setCreateOpen] = useState(false);
  const [officeId, setOfficeId] = useState("");
  const [name, setName] = useState("");
  const [boardMode, setBoardMode] = useState<DisplayBoardMode>("BOTH");
  const [pin, setPin] = useState<{ name: string; code: string; expiresAt?: string } | null>(null);

  const create = useMutation({
    mutationFn: () => displayApi.create({ officeId, name: name.trim(), boardMode }),
    onSuccess: (device) => {
      void qc.invalidateQueries({ queryKey: ["display-devices"] });
      setCreateOpen(false);
      if (device.pairingCode) {
        setPin({ name: device.name, code: device.pairingCode, expiresAt: device.pairingExpiresAt });
      }
      toast.success("Display created. Enter the PIN on the tablet.");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const rePair = useMutation({
    mutationFn: (device: DisplayDevice) => displayApi.rePair(device.id),
    onSuccess: (result, device) => {
      void qc.invalidateQueries({ queryKey: ["display-devices"] });
      setPin({ name: device.name, code: result.pairingCode, expiresAt: result.pairingExpiresAt });
      toast.success("New PIN generated. The previous tablet session was ended.");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const revoke = useMutation({
    mutationFn: (id: string) => displayApi.revoke(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["display-devices"] });
      toast.success("Display unpaired");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function startCreate() {
    setOfficeId("");
    setName("");
    setBoardMode("BOTH");
    setCreateOpen(true);
  }

  if (q.isLoading) return <PageSkeleton />;
  const devices = q.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lobby displays"
        description="Pair a wall tablet with a one-time PIN. Displays are read-only and bound to a single office."
        action={
          <Button onClick={startCreate}>
            <Plus className="size-4" />
            Pair tablet
          </Button>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogTitle>Pair a tablet</DialogTitle>
          <DialogDescription>The tablet never uses an employee or admin login. You will get a 6-digit PIN that expires in 10 minutes.</DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div>
              <Label>Office</Label>
              <Select value={officeId} onChange={(e) => setOfficeId(e.target.value)} required>
                <option value="">Select office</option>
                {(offices.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lobby TV" required minLength={2} />
            </div>
            <div>
              <Label>Board</Label>
              <Select value={boardMode} onChange={(e) => setBoardMode(e.target.value as DisplayBoardMode)}>
                <option value="BOTH">Rooms and people (auto-flip)</option>
                <option value="ROOMS">Rooms calendar only</option>
                <option value="PEOPLE">People board only</option>
              </Select>
            </div>
            <Button type="submit" disabled={create.isPending || !officeId || name.trim().length < 2}>
              Generate PIN
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pin} onOpenChange={(open) => { if (!open) setPin(null); }}>
        <DialogContent>
          <DialogTitle>Enter this PIN on the tablet</DialogTitle>
          <DialogDescription>
            {pin?.name ?? "Display"} · expires in 10 minutes
          </DialogDescription>
          {pin && (
            <div className="mt-4 flex flex-col items-center gap-4">
              <p className="font-mono text-5xl font-semibold tracking-[0.3em] text-slate-950">{pin.code}</p>
              <PairingQr value={pin.code} />
              <p className="text-center text-sm text-slate-500">Scan the QR or type the PIN in the kiosk app.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-2">
        {devices.map((device) => (
          <Card key={device.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                  <MonitorSmartphone className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{device.name}</h2>
                    <StatusBadge status={device.isActive ? "ACTIVE" : "INACTIVE"} />
                    {device.pairingPending && <StatusBadge status="PENDING" />}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{device.office?.name ?? "Office"} · {device.boardMode.replaceAll("_", " ")}</p>
                </div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Last seen</dt>
                <dd className="font-medium">{formatSeen(device.lastSeenAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium">{device.isActive ? (device.pairingPending ? "Waiting for PIN" : "Paired") : "Revoked"}</dd>
              </div>
            </dl>
            {device.isActive && (
              <div className="mt-4 flex gap-2 border-t pt-3">
                <Button size="sm" variant="outline" onClick={() => rePair.mutate(device)} disabled={rePair.isPending}>
                  New PIN
                </Button>
                <Button size="sm" variant="danger" onClick={() => revoke.mutate(device.id)} disabled={revoke.isPending}>
                  Unpair
                </Button>
              </div>
            )}
          </Card>
        ))}
        {!devices.length && <p className="text-sm text-slate-500">No lobby tablets yet. Pair the first one for an office.</p>}
      </div>
    </div>
  );
}
