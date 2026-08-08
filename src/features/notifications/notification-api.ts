import { apiFetch } from "@/lib/api/api-client";
import type { Notification } from "@/types/operations";
export const notificationApi={list:async(params=new URLSearchParams({page:"1",pageSize:"50"}))=>{const r:any=await apiFetch(`/notifications?${params}`);return (r.data??r) as {items:Notification[];unreadCount?:number;page?:number;total?:number}},read:async(id:string)=>{const r:any=await apiFetch(`/notifications/${id}/read`,{method:"PATCH"});return r.data??r},readAll:async()=>{const r:any=await apiFetch("/notifications/read-all",{method:"PATCH"});return r.data??r}};
