import type { AttendanceCorrectnessRequestRow, AttendanceCorrectnessSubmission } from "@/types/operations";

function submissionKey(row: AttendanceCorrectnessRequestRow) {
  return row.submissionId ?? row.id;
}

function aggregateStatus(statuses: string[]) {
  if (statuses.some((s) => s === "PENDING")) return "PENDING" as const;
  if (statuses.every((s) => s === "APPROVED")) return "APPROVED" as const;
  if (statuses.every((s) => s === "REJECTED")) return "REJECTED" as const;
  if (statuses.every((s) => s === "CANCELLED")) return "CANCELLED" as const;
  return "PARTIAL" as const;
}

export function groupCorrectionSubmissions(rows: AttendanceCorrectnessRequestRow[]): AttendanceCorrectnessSubmission[] {
  const map = new Map<string, AttendanceCorrectnessRequestRow[]>();
  for (const row of rows) {
    const key = submissionKey(row);
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const submissions: AttendanceCorrectnessSubmission[] = [];
  for (const [submissionId, days] of map) {
    const sorted = [...days].sort((a, b) => a.workDate.localeCompare(b.workDate) || (a.session ?? "").localeCompare(b.session ?? ""));
    const statuses = sorted.map((d) => d.status);
    submissions.push({
      submissionId,
      status: aggregateStatus(statuses),
      employee: sorted[0]!.employee,
      employeeNote: sorted.find((d) => d.employeeNote)?.employeeNote ?? null,
      createdAt: sorted.reduce((min, d) => (d.createdAt < min ? d.createdAt : min), sorted[0]!.createdAt),
      dayCount: sorted.length,
      workDateFrom: sorted[0]!.workDate,
      workDateTo: sorted[sorted.length - 1]!.workDate,
      days: sorted
    });
  }

  return submissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countCorrectionSubmissions(rows: AttendanceCorrectnessRequestRow[], status?: string) {
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  if (status === "PENDING") {
    return new Set(filtered.map(submissionKey)).size;
  }
  const groups = groupCorrectionSubmissions(rows);
  if (!status) return groups.length;
  return groups.filter((g) => g.status === status || (status === "PENDING" && g.days.some((d) => d.status === "PENDING"))).length;
}

export function pendingCorrectionSubmissionCount(rows: AttendanceCorrectnessRequestRow[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    if (row.status === "PENDING") keys.add(submissionKey(row));
  }
  return keys.size;
}
