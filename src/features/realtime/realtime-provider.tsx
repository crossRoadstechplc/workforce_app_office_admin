"use client";

import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken, onAccessTokenChange } from "@/lib/auth/token-store";
import { useAuth } from "@/features/auth/auth-provider";

let socket: Socket | null = null;

const eventKeys: Record<string, string[][]> = {
  "employee.checked_in": [["dashboard"], ["timesheets"]],
  "employee.checked_out": [["dashboard"], ["timesheets"]],
  "employee.checked_in_late": [["dashboard"], ["timesheets"]],
  "attendance.corrected": [["dashboard"], ["timesheets"], ["attendance-day-roster"]],
  "attendance.correctness_requested": [["attendance-day-roster"], ["correction-requests"], ["leave-requests"]],
  "attendance.correctness_decided": [["correction-requests"], ["leave-requests"], ["attendance-day-roster"]],
  "attendance.missing_checkout": [["dashboard"], ["timesheets"]],
  "leave.requested": [["dashboard"], ["leave"]],
  "leave.cancelled": [["dashboard"], ["leave"]],
  "leave.decision_updated": [["dashboard"], ["leave"]],
  "evaluation.opened": [["evaluations"]],
  "evaluation.self_submitted": [["evaluations"]],
  "evaluation.scored": [["evaluations"]],
  "evaluation.finalized": [["evaluations"]],
  "notification.created": [["notifications"]],
  "meeting.changed": [["meeting-bookings"]],
  "meeting.booked": [["meeting-bookings"]],
  "meeting.cancelled": [["meeting-bookings"]],
  "meeting.rescheduled": [["meeting-bookings"]],
  "chat.message.created": [["chat-conversations"], ["chat-messages"]],
  "chat.conversation.updated": [["chat-conversations"]]
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const query = useQueryClient();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!getAccessToken()) return;

    socket = io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? "http://localhost:4000", {
      auth: (cb) => {
        cb({ token: getAccessToken() ?? "" });
      },
      transports: ["websocket", "polling"]
    });

    const listeners = Object.entries(eventKeys).map(([event, keys]) => {
      const handler = () => {
        for (const queryKey of keys) {
          void query.invalidateQueries({ queryKey });
        }
      };
      socket?.on(event, handler);
      return { event, handler };
    });

    const unsubscribeToken = onAccessTokenChange((token) => {
      if (!socket) return;
      if (!token) {
        socket.disconnect();
        return;
      }
      // Reconnect with fresh JWT after HTTP refresh so handshake does not reuse a stale token.
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.disconnect();
        socket.connect();
      }
    });

    return () => {
      unsubscribeToken();
      for (const { event, handler } of listeners) {
        socket?.off(event, handler);
      }
      socket?.disconnect();
      socket = null;
    };
  }, [status, query]);

  return children;
}
