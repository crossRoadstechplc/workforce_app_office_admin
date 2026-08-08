export type TodaySummary = { date:string; totalEmployees:number; checkedIn:number; checkedOut:number; onTime:number; late:number; onLeave:number; notCheckedIn:number; missingCheckout:number; worksheetsSubmitted:number; pendingLeaveRequests:number };
export type AttendanceTrend = { date:string; attendance:number; late:number; missingCheckout:number; approvedLeaveRequests:number }[];
export type LeaveSummaryItem = { status:string; requests:number; days:number };
export type ActivityItem = { id:string; action:string; entityType:string; entityId:string; reason?:string|null; createdAt:string; actor?:{id:string;email:string}|null };
