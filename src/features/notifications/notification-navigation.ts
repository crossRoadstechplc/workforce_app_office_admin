import type { Notification } from "@/types/operations";

export function notificationHref(n: Notification): string | null {
  const leaveQuery = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ tab: "leave", ...extra });
    return `/leave?${p}`;
  };
  const correctionQuery = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ tab: "correction", status: "PENDING", ...extra });
    return `/leave?${p}`;
  };

  const type = n.type.toUpperCase();
  const entity = n.relatedEntityType;

  if (type === "LEAVE_SUBMITTED" || entity === "LeaveRequest" || type.startsWith("LEAVE_")) {
    const base: Record<string, string> =
      type === "LEAVE_SUBMITTED" ? { status: "PENDING" } : {};
    return leaveQuery({
      ...base,
      ...(n.relatedEntityId ? { requestId: n.relatedEntityId } : {})
    });
  }
  if (
    type === "ATTENDANCE_CORRECTNESS_SUBMITTED" ||
    entity === "AttendanceCorrectnessRequest" ||
    type.startsWith("ATTENDANCE_CORRECTNESS")
  ) {
    return correctionQuery(n.relatedEntityId ? { requestId: n.relatedEntityId } : {});
  }
  if (entity === "Timesheet" || type.includes("CHECK_IN") || type.includes("CHECK_OUT") || type.includes("MISSING_CHECKOUT")) {
    return "/attendance";
  }
  if (entity === "Evaluation" || type.includes("EVALUATION")) {
    return "/performance";
  }
  if (entity === "MeetingBooking" || type.startsWith("MEETING_")) {
    return "/meetings";
  }
  if (entity === "ChatConversation" || type === "CHAT_MESSAGE") {
    return n.relatedEntityId ? `/chat` : "/chat";
  }
  return null;
}

export function notificationIsActionable(n: Notification): boolean {
  return notificationHref(n) != null;
}
