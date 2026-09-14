export type AnnualLeaveBucket = {
  id: string;
  periodStart: string;
  periodEnd: string;
  serviceYears: number;
  granted: number;
  used: number;
  pending: number;
  expired?: number;
  remaining: number;
  expiresOn: string;
  kind: "CURRENT" | "CARRY" | "EXPIRED" | string;
};

export type AnnualLeaveBalance = {
  hireDate?: string;
  asOf?: string;
  completedYears?: number;
  serviceMonthsThisYear?: number;
  currentYearGrant: number;
  carriedIn: number;
  entitledTotal: number;
  used: number;
  pending: number;
  expired?: number;
  available: number;
  nextAnniversary?: string;
  nextYearGrant?: number;
  buckets?: AnnualLeaveBucket[];
};

export type LeaveBalanceAllocation = {
  bucketId: string;
  periodStart: string;
  days: number;
};
