import { apiDownload,apiFetch } from "@/lib/api/api-client";
export const reportApi={
 timesheets:(p:URLSearchParams)=>apiFetch<any>(`/admin/reports/timesheets?${p}`),
 worksheets:(p:URLSearchParams)=>apiFetch<any>(`/admin/reports/worksheets?${p}`),
 leave:(p:URLSearchParams)=>apiFetch<any>(`/admin/reports/leave?${p}`),
 employee:(id:string,p:URLSearchParams)=>apiFetch<any>(`/admin/reports/employees/${id}?${p}`),
 activity:()=>apiFetch<any>("/admin/dashboard/recent-activity?limit=100"),
 export:(kind:"timesheets"|"worksheets"|"leave",p:URLSearchParams)=>{p.set("format","csv");return apiDownload(`/admin/reports/${kind}?${p}`,`${kind}.csv`)}
};
