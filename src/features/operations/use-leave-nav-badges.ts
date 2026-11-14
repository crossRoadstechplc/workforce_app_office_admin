"use client";

import { useQuery } from "@tanstack/react-query";
import { operationsApi } from "@/features/operations/operations-api";
import { pendingCorrectionSubmissionCount } from "@/features/operations/group-correction-submissions";

export function useLeaveNavBadges(enabled = true) {
  const leaveCounts = useQuery({
    queryKey: ["leave-requests", "nav-badge"],
    queryFn: () => operationsApi.leaves(new URLSearchParams({ page: "1", pageSize: "1" })),
    enabled,
    staleTime: 30_000
  });

  const correctionPending = useQuery({
    queryKey: ["correction-requests", "nav-badge"],
    queryFn: () => operationsApi.correctnessRequests(new URLSearchParams({ status: "PENDING" })),
    enabled,
    staleTime: 30_000
  });

  const pendingLeave = leaveCounts.data?.counts.pending ?? 0;
  const pendingCorrections = pendingCorrectionSubmissionCount(correctionPending.data ?? []);

  return {
    pendingLeave,
    pendingCorrections,
    total: pendingLeave + pendingCorrections
  };
}
