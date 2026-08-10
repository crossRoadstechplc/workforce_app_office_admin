"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OfficeLocationPicker } from "@/components/offices/office-location-picker";
import { configurationApi } from "@/features/configuration/configuration-api";
import type { Office } from "@/types/configuration";

export type OfficeFormState = {
  name: string;
  address: string;
  latitude: number | "";
  longitude: number | "";
  allowedRadiusMeters: string;
  maximumAccuracyMeters: string;
  timezone: string;
};

export const blankOfficeForm: OfficeFormState = {
  name: "",
  address: "",
  latitude: "",
  longitude: "",
  allowedRadiusMeters: "150",
  maximumAccuracyMeters: "100",
  timezone: "Africa/Addis_Ababa"
};

type OfficeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Office | null;
  onSaved: () => void;
  trigger?: React.ReactNode;
};

function officeToForm(office: Office): OfficeFormState {
  return {
    name: office.name,
    address: office.address ?? "",
    latitude: office.latitude ?? "",
    longitude: office.longitude ?? "",
    allowedRadiusMeters: String(office.allowedRadiusMeters),
    maximumAccuracyMeters: String(office.maximumAccuracyMeters),
    timezone: office.timezone
  };
}

function validateForm(form: OfficeFormState): string | null {
  if (form.name.trim().length < 2) return "Office name is required";
  if (form.latitude === "" || form.longitude === "") return "Select a location on the map";
  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const radius = Number(form.allowedRadiusMeters);
  const accuracy = Number(form.maximumAccuracyMeters);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return "Latitude must be between -90 and 90";
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return "Longitude must be between -180 and 180";
  if (!Number.isFinite(radius) || radius < 10 || radius > 10000) return "Allowed radius must be between 10 and 10000 meters";
  if (!Number.isFinite(accuracy) || accuracy < 5 || accuracy > 5000) return "Max GPS accuracy must be between 5 and 5000 meters";
  return null;
}

export function OfficeFormDialog({ open, onOpenChange, editing, onSaved, trigger }: OfficeFormDialogProps) {
  const [form, setForm] = useState<OfficeFormState>(blankOfficeForm);

  useEffect(() => {
    if (open) {
      setForm(editing ? officeToForm(editing) : blankOfficeForm);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: async () => {
      const error = validateForm(form);
      if (error) throw new Error(error);
      const input = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        allowedRadiusMeters: Number(form.allowedRadiusMeters),
        maximumAccuracyMeters: Number(form.maximumAccuracyMeters),
        timezone: form.timezone.trim()
      };
      return editing ? configurationApi.updateOffice(editing.id, input) : configurationApi.createOffice(input);
    },
    onSuccess: () => {
      toast.success(editing ? "Office updated" : "Office created");
      onOpenChange(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-3xl">
        <DialogTitle>{editing ? "Edit office" : "Create office"}</DialogTitle>
        <DialogDescription>Pick the office location on the map. The geofence circle shows where employees can check in.</DialogDescription>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Office name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Timezone">
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </Field>

          <div className="sm:col-span-2">
            {open ? (
              <OfficeLocationPicker
                key={editing?.id ?? "new"}
                latitude={form.latitude}
                longitude={form.longitude}
                address={form.address}
                allowedRadiusMeters={Number(form.allowedRadiusMeters) || 150}
                onChange={(patch) =>
                  setForm((prev) => ({
                    ...prev,
                    latitude: patch.latitude,
                    longitude: patch.longitude,
                    address: patch.address ?? prev.address
                  }))
                }
              />
            ) : null}
          </div>

          <Field label="Allowed radius (m)">
            <Input
              type="number"
              value={form.allowedRadiusMeters}
              onChange={(e) => setForm({ ...form, allowedRadiusMeters: e.target.value })}
            />
          </Field>
          <Field label="Max GPS accuracy (m)">
            <Input
              type="number"
              value={form.maximumAccuracyMeters}
              onChange={(e) => setForm({ ...form, maximumAccuracyMeters: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving..." : "Save office"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
