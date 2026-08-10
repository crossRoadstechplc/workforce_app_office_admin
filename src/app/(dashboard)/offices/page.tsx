"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MapPin, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { CompanyAdminGate } from "@/components/auth/role-gates";
import { OfficeFormDialog } from "@/components/offices/office-form-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { StatusBadge } from "@/components/ui/badge";
import { configurationApi, itemsOf } from "@/features/configuration/configuration-api";
import type { Office } from "@/types/configuration";

export default function OfficesPage() {
  return (
    <CompanyAdminGate>
      <OfficesPageInner />
    </CompanyAdminGate>
  );
}

function OfficesPageInner() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Office | null>(null);
  const q = useQuery({ queryKey: ["offices"], queryFn: () => configurationApi.offices() });

  const status = useMutation({
    mutationFn: ({ o, reason }: { o: Office; reason: string }) => configurationApi.officeStatus(o.id, !o.isActive, reason),
    onSuccess: () => {
      toast.success("Office status updated");
      void qc.invalidateQueries({ queryKey: ["offices"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (q.isLoading) return <PageSkeleton />;

  const offices = itemsOf(q.data ?? []);

  function edit(office: Office) {
    setEditing(office);
    setOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offices"
        description="Configure approved work locations and geofence rules."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add office
          </Button>
        }
      />

      <OfficeFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => void qc.invalidateQueries({ queryKey: ["offices"] })}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {offices.map((o) => (
          <Card key={o.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{o.name}</h2>
                    <StatusBadge status={o.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{o.address || "No address"}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => edit(o)}>
                Edit
              </Button>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <Info k="Geofence" v={`${o.allowedRadiusMeters} m`} />
              <Info k="GPS accuracy" v={`≤ ${o.maximumAccuracyMeters} m`} />
              <Info k="Coordinates" v={`${o.latitude}, ${o.longitude}`} />
              <Info k="Timezone" v={o.timezone} />
            </dl>

            {o.latitude != null && o.longitude != null && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${o.latitude}&mlon=${o.longitude}#map=17/${o.latitude}/${o.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="size-3.5" />
                View on OpenStreetMap
              </a>
            )}

            <div className="mt-5 border-t pt-4">
              <Button
                size="sm"
                variant={o.isActive ? "danger" : "secondary"}
                onClick={() => {
                  const reason = window.prompt(`Reason to ${o.isActive ? "deactivate" : "activate"} this office?`);
                  if (reason) status.mutate({ o, reason });
                }}
              >
                <Power className="size-4" />
                {o.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-slate-500">{k}</dt>
      <dd className="mt-1 font-medium text-slate-900">{v}</dd>
    </div>
  );
}
