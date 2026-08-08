import { apiFetch } from "@/lib/api/api-client";
import type { Office,Schedule,Paged } from "@/types/configuration";
const unwrap=<T>(v:any):T=>(v?.data??v) as T;
export const configurationApi={
 offices:async(params=new URLSearchParams({page:"1",pageSize:"100"}))=>unwrap<Paged<Office>|Office[]>(await apiFetch<any>(`/admin/offices?${params}`)),
 office:async(id:string)=>unwrap<Office>(await apiFetch<any>(`/admin/offices/${id}`)),
 createOffice:async(input:Partial<Office>)=>unwrap<Office>(await apiFetch<any>("/admin/offices",{method:"POST",body:JSON.stringify(input)})),
 updateOffice:async(id:string,input:Partial<Office>)=>unwrap<Office>(await apiFetch<any>(`/admin/offices/${id}`,{method:"PATCH",body:JSON.stringify(input)})),
 officeStatus:async(id:string,isActive:boolean,reason:string)=>unwrap<Office>(await apiFetch<any>(`/admin/offices/${id}/status`,{method:"PATCH",body:JSON.stringify({isActive,reason})})),
 schedules:async(params=new URLSearchParams({page:"1",pageSize:"100"}))=>unwrap<Paged<Schedule>|Schedule[]>(await apiFetch<any>(`/admin/schedules?${params}`)),
 schedule:async(id:string)=>unwrap<Schedule>(await apiFetch<any>(`/admin/schedules/${id}`)),
 createSchedule:async(input:Partial<Schedule>)=>unwrap<Schedule>(await apiFetch<any>("/admin/schedules",{method:"POST",body:JSON.stringify(input)})),
 updateSchedule:async(id:string,input:Partial<Schedule>)=>unwrap<Schedule>(await apiFetch<any>(`/admin/schedules/${id}`,{method:"PATCH",body:JSON.stringify(input)})),
 scheduleStatus:async(id:string,isActive:boolean,reason:string)=>unwrap<Schedule>(await apiFetch<any>(`/admin/schedules/${id}/status`,{method:"PATCH",body:JSON.stringify({isActive,reason})}))
};
export function itemsOf<T>(value:Paged<T>|T[]):T[]{return Array.isArray(value)?value:value.items??[]}
