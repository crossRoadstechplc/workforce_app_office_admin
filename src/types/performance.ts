export type EvaluationStatus =
  | "OPEN"
  | "SELF_DRAFT"
  | "SELF_SUBMITTED"
  | "EVALUATOR_DRAFT"
  | "EVALUATOR_SUBMITTED"
  | "FINALIZED";

export type EvaluationCycleStatus = "DRAFT" | "OPEN" | "CLOSED";
export type EvaluationItemSection = "METRIC" | "RESPONSIBILITY" | "SKILL_IMPROVED" | "GOAL";

export type PeriodSnapshot = {
  attendanceDays: number;
  lateDays: number;
  lateMinutes: number;
  missingCheckoutDays: number;
  worksheetsSubmitted: number;
  approvedLeaveDays: number;
  overtimeMinutes: number;
  workedMinutes: number;
};

export type EvaluationPerson = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  employeeCode?: string;
  jobTitle?: string | null;
  department?: string | null;
  officeId?: string | null;
  userId?: string;
  name: string;
  office?: { id: string; name: string } | null;
  supervisor?: { id: string; firstName: string; lastName: string; jobTitle?: string | null; name: string } | null;
};

export type EvaluationScore = {
  id: string;
  itemKey: string;
  section: EvaluationItemSection;
  label: string;
  sortOrder: number;
  selfScore: number | null;
  evaluatorScore: number | null;
  evaluatorComment: string | null;
};

export type EvaluationGoal = {
  id: string;
  skill: string;
  sortOrder: number;
  previousSelfScore: number | null;
  previousEvaluatorScore: number | null;
  improvementSelfScore: number | null;
  improvementEvaluatorScore: number | null;
  targetDate: string | null;
  criteria: string | null;
};

export type EvaluationCycle = {
  id: string;
  name: string;
  status: EvaluationCycleStatus;
  periodStart: string;
  periodEnd: string;
  selfDueAt?: string | null;
  evaluatorDueAt?: string | null;
  numberPrefix?: string | null;
  counts?: { total: number; awaitingSelf: number; awaitingEvaluator: number; done: number };
};

export type Evaluation = {
  id: string;
  number: string;
  status: EvaluationStatus;
  cycleId: string;
  employeeId: string;
  periodSnapshot: PeriodSnapshot;
  focusCompetency: string | null;
  actionPlan: string | null;
  overallSelf: number | null;
  overallEvaluator: number | null;
  selfSubmittedAt?: string | null;
  evaluatorSubmittedAt?: string | null;
  finalizedAt?: string | null;
  cycle: EvaluationCycle;
  employee: EvaluationPerson;
  evaluator?: { id: string; email: string } | null;
  scores: EvaluationScore[];
  goals: EvaluationGoal[];
};

export type EvaluationList = {
  items: Evaluation[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  counts: { awaitingSelf: number; awaitingEvaluator: number; done: number; overdue: number; total: number };
};

export type TemplateItem = {
  id?: string;
  section: EvaluationItemSection;
  itemKey: string;
  label: string;
  sortOrder: number;
};

export type EvaluationTemplate = {
  id: string;
  name: string;
  description?: string | null;
  jobTitleHint?: string | null;
  isDefault: boolean;
  isActive: boolean;
  items: TemplateItem[];
  _count?: { evaluations: number };
};
