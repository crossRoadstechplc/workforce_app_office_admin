"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { PortalAdminGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { notificationApi } from "@/features/notifications/notification-api";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, humanizeKey } from "@/lib/utils/format";
import type { Notification } from "@/types/operations";
import { notificationHref } from "@/features/notifications/notification-navigation";

export default function NotificationsPage() {
  return (
    <PortalAdminGate>
      <NotificationsPageInner />
    </PortalAdminGate>
  );
}

function NotificationsPageInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => notificationApi.list() });
  const read = useMutation({
    mutationFn: notificationApi.read,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] })
  });
  const all = useMutation({
    mutationFn: notificationApi.readAll,
    onSuccess: () => {
      toast.success("All notifications marked read");
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });
  if (q.isLoading) return <PageSkeleton />;
  const data = q.data;

  function openNotification(n: Notification) {
    if (!n.isRead) read.mutate(n.id);
    const href = notificationHref(n);
    if (href) {
      router.push(href);
      return;
    }
    toast.message("This alert has no linked page. Open Leave or Attendance from the menu.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Persistent operational alerts. Realtime delivery refreshes this list through Socket.IO."
        action={
          <Button variant="outline" onClick={() => all.mutate()}>
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        }
      />
      <div className="space-y-3">
        {data?.items?.map((n) => (
          <Card
            key={n.id}
            className={`p-4 transition-colors hover:bg-slate-50/80 ${!n.isRead ? "border-blue-200 bg-blue-50/40" : ""}`}
          >
            <button type="button" className="w-full cursor-pointer text-left" onClick={() => openNotification(n)}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{n.title}</div>
                  <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {notificationHref(n) ? <span className="text-xs font-semibold text-blue-600">Open</span> : null}
                  {!n.isRead && <span className="mt-1 size-2 rounded-full bg-blue-600" />}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                  {formatDateTime(n.createdAt)} · {humanizeKey(n.type)}
                </span>
                {notificationHref(n) ? <span className="font-semibold text-blue-600">Tap to open</span> : null}
              </div>
            </button>
          </Card>
        ))}
        {!data?.items?.length && (
          <EmptyState title="No notifications yet" description="Operational alerts will appear here as they are generated." />
        )}
      </div>
    </div>
  );
}
