import { getAccessToken, setAccessToken } from "@/lib/auth/token-store";
export class ApiError extends Error { constructor(public status:number, public code:string, message:string, public details?:unknown){ super(message); } }
let refreshPromise: Promise<string|null> | null = null;
async function refreshToken() {
  if (!refreshPromise) refreshPromise = fetch("/api/auth/refresh", { method:"POST" }).then(async r => { if(!r.ok) return null; const data=await r.json(); setAccessToken(data.accessToken); return data.accessToken as string; }).finally(()=>{refreshPromise=null;});
  return refreshPromise;
}
export async function apiFetch<T>(path:string, init:RequestInit = {}, retry=true):Promise<T> {
  const token=getAccessToken();
  const response=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}${path}`, { ...init, headers:{ "content-type":"application/json", ...(token?{authorization:`Bearer ${token}`}:{ }), ...(init.headers??{}) } });
  if(response.status===401 && retry) { const next=await refreshToken(); if(next) return apiFetch<T>(path,init,false); }
  if(!response.ok) { const body=await response.json().catch(()=>({})); throw new ApiError(response.status, body.code??"REQUEST_FAILED", body.message??"Request failed", body.details); }
  if(response.status===204) return undefined as T;
  return response.json() as Promise<T>;
}
export async function apiDownload(path:string,filename:string):Promise<void>{
  const token=getAccessToken();
  const response=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}${path}`,{headers:{...(token?{authorization:`Bearer ${token}`}:{})}});
  if(response.status===401){const next=await refreshToken();if(next)return apiDownload(path,filename);}
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new ApiError(response.status,body.code??"DOWNLOAD_FAILED",body.message??"Download failed",body.details);}
  const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
