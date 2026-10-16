export type EmergencyContactRelation =
  | "MOTHER"
  | "FATHER"
  | "BROTHER"
  | "SISTER"
  | "SPOUSE"
  | "CHILD"
  | "FRIEND"
  | "RELATIVE"
  | "OTHER";

export const EMERGENCY_CONTACT_RELATIONS: { value: EmergencyContactRelation; label: string }[] = [
  { value: "MOTHER", label: "Mother" },
  { value: "FATHER", label: "Father" },
  { value: "BROTHER", label: "Brother" },
  { value: "SISTER", label: "Sister" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "CHILD", label: "Child" },
  { value: "FRIEND", label: "Friend" },
  { value: "RELATIVE", label: "Relative" },
  { value: "OTHER", label: "Other" }
];

export function formatEmergencyRelation(
  relation?: EmergencyContactRelation | null,
  other?: string | null
): string | null {
  if (!relation) return null;
  if (relation === "OTHER") return other?.trim() || "Other";
  return EMERGENCY_CONTACT_RELATIONS.find((item) => item.value === relation)?.label ?? relation;
}

export type Office = { id:string; name:string; address?:string|null; isActive:boolean };
export type ScheduleDay = { weekday:number; checkInTime:string; checkOutTime:string };
export type Schedule = { id:string; name:string; checkInTime:string; checkOutTime:string; lateGraceMinutes:number; workingDays:number[]; days?:ScheduleDay[]; isActive:boolean };
export type Department = { id: string; name: string; isActive: boolean };
export type EvaluationTemplateOption = { id: string; name: string; jobTitleHint?: string | null; isDefault?: boolean };
export type EmployeeSupervisor = {
  id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  jobTitle?: string | null;
  userId: string;
};
export type Employee = {
  id: string;
  userId: string;
  employeeCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: EmergencyContactRelation | null;
  emergencyContactRelationOther?: string | null;
  jobTitle?: string | null;
  departmentId?: string | null;
  evaluationTemplateId?: string | null;
  employmentStartDate: string;
  birthDate?: string | null;
  status: "ACTIVE" | "INACTIVE" | "TERMINATED";
  officeId?: string | null;
  scheduleId?: string | null;
  supervisorId?: string | null;
  supervisor?: EmployeeSupervisor | null;
  supervisorHasPortalAccess?: boolean;
  createdAt?: string;
  updatedAt?: string;
  user: { id: string; email: string; status: string; mustChangePassword: boolean; lastLoginAt?: string | null };
  office?: Office | null;
  schedule?: Schedule | null;
  department?: Department | null;
  evaluationTemplate?: EvaluationTemplateOption | null;
};
export type PageMeta = { page:number; pageSize:number; total:number; totalPages:number };
export type EmployeeList = { items:Employee[]; meta:PageMeta };
