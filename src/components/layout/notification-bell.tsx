"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { notificationApi } from "@/features/notifications/notification-api";
import { notificationHref, notificationIsActionable } from "@/features/notifications/notification-navigation";
import { formatDateTime } from "@/lib/utils/format";
import type { Notification } from "@/types/operations";

export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", "header"],
    queryFn: () => notificationApi.list(new URLSearchParams({ page: "1", pageSize: "8" })),
    refetchInterval: 60000
  });
  const read = useMutation({
    mutationFn: notificationApi.read,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  });

  const unread = q.data?.unreadCount ?? q.data?.items.filter((x) => !x.isRead).length ?? 0;
  const items = q.data?.items ?? [];

  function open(n: Notification) {
    if (!n.isRead) read.mutate(n.id);
    const href = notificationHref(n);
    if (href) {
      router.push(href);
      return;
    }
    toast.message("This alert has no linked page. Open Leave or Attendance from the menu.");
  }

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" aria-label="Notifications" className="relative size-11 px-0 sm:size-auto sm:px-3">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] p-0">
        <div className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent alerts</div>
        {items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {items.map((n) => (
              <DropdownItem
                key={n.id}
                className="flex flex-col items-start gap-0.5 rounded-none px-3 py-2.5"
                onSelect={() => open(n)}
              >
                <span className={`text-sm ${n.isRead ? "font-medium text-slate-800" : "font-semibold text-slate-950"}`}>
                  {n.title}
                </span>
                <span className="line-clamp-2 text-xs text-slate-500">{n.message}</span>
                <span className="mt-1 flex w-full items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>{formatDateTime(n.createdAt)}</span>
                  {notificationIsActionable(n) ? <span className="font-semibold text-blue-600">Tap to open</span> : null}
                </span>
              </DropdownItem>
            ))}
          </div>
        )}
        <div className="border-t p-1">
          <DropdownItem asChild className="justify-center text-center font-semibold text-blue-700">
            <Link href="/notifications">View all notifications</Link>
          </DropdownItem>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
