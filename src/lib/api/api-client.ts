import { getAccessToken } from "@/lib/auth/token-store";
import { refreshSession } from "@/lib/auth/refresh-session";
export class ApiError extends Error { constructor(public status:number, public code:string, message:string, public details?:unknown){ super(message); } }
async function refreshToken() {
  const session = await refreshSession();
  const token = session?.accessToken;
  return typeof token === "string" && token ? token : null;
}
function formatApiError(err: { code?: string; message?: string; details?: unknown }) {
  const base = err.message || "Request failed";
  const details = err.details as { issues?: Array<{ path?: string; message?: string }>; fieldErrors?: Record<string, string[] | undefined> } | undefined;
  if (details?.issues?.length) {
    return details.issues.map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)).filter(Boolean).join("; ") || base;
  }
  if (details?.fieldErrors) {
    const parts = Object.entries(details.fieldErrors).flatMap(([key, messages]) => (messages ?? []).map((message) => `${key}: ${message}`));
    if (parts.length) return parts.join("; ");
  }
  return base;
}

export async function apiFetch<T>(path:string, init:RequestInit = {}, retry=true):Promise<T> {
  const token=getAccessToken();
  const response=await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"}${path}`, { ...init, headers:{ "content-type":"application/json", ...(token?{authorization:`Bearer ${token}`}:{ }), ...(init.headers??{}) } });
  if(response.status===401 && retry) { const next=await refreshToken(); if(next) return apiFetch<T>(path,init,false); }
  if(!response.ok) { const body=await response.json().catch(()=>({})); const err=body.error??body; throw new ApiError(response.status, err.code??"REQUEST_FAILED", formatApiError(err), err.details); }
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
