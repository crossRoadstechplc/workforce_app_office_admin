export type VaultScope = "credentials" | "subscriptions" | "reveal";

export type VaultCredentialType = "EMAIL" | "PASSWORD" | "WIFI" | "BANK" | "SOFTWARE" | "API_KEY" | "OTHER";

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "CANCELLED" | "EXPIRED";

export type BillingCycle = "MONTHLY" | "YEARLY";

export type SubscriptionAssigneeType = "PERSON" | "TEAM" | "COMPANY";

export type PeriodPaymentStatus = "WAITING" | "PAID" | "CANCELLED";

export type VaultUnlockResult = {
  vaultToken: string;
  scope: VaultScope;
  expiresIn: number;
};

export type VaultCredential = {
  id: string;
  officeId?: string | null;
  officeName?: string | null;
  title: string;
  type: VaultCredentialType;
  username?: string | null;
  email?: string | null;
  url?: string | null;
  notes?: string | null;
  secretMasked: string;
  hasSecret: boolean;
  lastRevealedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type VaultCredentialInput = {
  title: string;
  type: VaultCredentialType;
  officeId?: string | null;
  username?: string | null;
  email?: string | null;
  url?: string | null;
  notes?: string | null;
  secret?: string;
};

export type SubscriptionPeriod = {
  id: string;
  yearMonth: string;
  seats: number;
  amount: string;
  paid: boolean;
  paymentStatus: PeriodPaymentStatus;
  paidAt?: string | null;
  notes?: string | null;
};

export type OfficeSubscription = {
  id: string;
  officeId?: string | null;
  officeName?: string | null;
  assigneeType: SubscriptionAssigneeType;
  employeeId?: string | null;
  employeeName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  assigneeLabel: string;
  name: string;
  vendor?: string | null;
  category?: string | null;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  seats: number;
  unitAmount: string;
  currency: string;
  startDate: string;
  endDate?: string | null;
  renewalDay?: number | null;
  notes?: string | null;
  loginCredentialId?: string | null;
  loginCredentialTitle?: string | null;
  currentMonthSeats: number;
  currentMonthAmount: string;
  currentMonthPaymentStatus: PeriodPaymentStatus;
  lastMonthPaymentStatus?: PeriodPaymentStatus | null;
  lastMonthYearMonth?: string;
  currentYearMonth: string;
  actionYearMonth: string;
  actionPaymentStatus: PeriodPaymentStatus;
  actionSeats: number;
  actionAmount: string;
  historyPeriods: SubscriptionPeriod[];
  recentPeriods: SubscriptionPeriod[];
  periods: SubscriptionPeriod[];
  createdAt?: string;
  updatedAt?: string;
};

export type SubscriptionInput = {
  name: string;
  vendor?: string | null;
  category?: string | null;
  status?: SubscriptionStatus;
  billingCycle: BillingCycle;
  seats: number;
  unitAmount: number;
  currency?: string;
  startDate: string;
  endDate?: string | null;
  renewalDay?: number | null;
  notes?: string | null;
  officeId?: string | null;
  loginCredentialId?: string | null;
  assigneeType?: SubscriptionAssigneeType;
  employeeId?: string | null;
  departmentId?: string | null;
  fromYearMonth?: string;
};

export type SubscriptionSummary = {
  yearMonth: string;
  nextYearMonth?: string;
  activeCount: number;
  waitingCount?: number;
  waitingSeats?: number;
  waitingTotal?: string;
  paidThisMonthCount?: number;
  paidThisMonthTotal?: string;
  cancelledThisMonthCount?: number;
  thisMonthSeats: number;
  thisMonthTotal: string;
  renewingSoon: Array<{ id: string; name: string; endDate?: string | null; seats: number; currency: string }>;
};

export type Paged<T> = { items: T[]; meta?: { page: number; pageSize: number; total: number; totalPages: number } };
