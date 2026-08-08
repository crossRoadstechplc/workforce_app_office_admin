import { apiFetch } from "@/lib/api/api-client";
import type { LeaveRequest,Timesheet,Worksheet } from "@/types/operations";
const d=<T>(v:any):T=>(v?.data??v) as T;
export const operationsApi={
 timesheets:async(params:URLSearchParams)=>d<any>(await apiFetch<any>(`/admin/timesheets?${params}`)),
 timesheet:async(id:string)=>d<Timesheet>(await apiFetch<any>(`/admin/timesheets/${id}`)),
 correctTimesheet:async(id:string,input:{actualCheckIn?:string;actualCheckOut?:string;reason:string})=>d<Timesheet>(await apiFetch<any>(`/admin/timesheets/${id}/correct`,{method:"POST",body:JSON.stringify(input)})),
 worksheets:async(params:URLSearchParams)=>d<any>(await apiFetch<any>(`/admin/worksheets?${params}`)),
 worksheet:async(id:string)=>d<Worksheet>(await apiFetch<any>(`/admin/worksheets/${id}`)),
 reviewWorksheet:async(id:string,input:{adminComment?:string})=>d<Worksheet>(await apiFetch<any>(`/admin/worksheets/${id}/review`,{method:"POST",body:JSON.stringify(input)})),
 leaves:async(params:URLSearchParams)=>d<any>(await apiFetch<any>(`/admin/leave-requests?${params}`)),
 leave:async(id:string)=>d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}`)),
 approveLeave:async(id:string,reason?:string)=>d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}/approve`,{method:"POST",body:JSON.stringify({reason})})),
 rejectLeave:async(id:string,reason:string)=>d<LeaveRequest>(await apiFetch<any>(`/admin/leave-requests/${id}/reject`,{method:"POST",body:JSON.stringify({reason})}))
};
