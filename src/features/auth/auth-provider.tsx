"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/api-client";
import { setAccessToken, getAccessToken } from "@/lib/auth/token-store";
import type { AuthUser, MeResponse } from "@/types/auth";
type State={ status:"loading"|"authenticated"|"unauthenticated"; user:AuthUser|null; login:(login:string,password:string)=>Promise<void>; logout:()=>Promise<void>; hasPermission:(p:string)=>boolean };
const Ctx=createContext<State|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}) { const [status,setStatus]=useState<State["status"]>("loading"); const [user,setUser]=useState<AuthUser|null>(null); const router=useRouter();
  const hydrate=useCallback(async()=>{ try{ const r=await fetch("/api/auth/refresh",{method:"POST"}); if(!r.ok) throw new Error(); const session=await r.json(); if(session.mustChangePassword) throw new Error("Admin password must be changed using the employee/security flow first."); setAccessToken(session.accessToken); const me=await apiFetch<MeResponse>("/auth/me"); if(!me.roles.includes("ADMIN")) throw new Error("Admin access required"); setUser(me); setStatus("authenticated"); }catch{ setAccessToken(null); setUser(null); setStatus("unauthenticated"); } },[]);
  useEffect(()=>{ void hydrate(); },[hydrate]);
  const login=async(login:string,password:string)=>{ const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({login,password,deviceId:"admin-web"})}); const data=await r.json(); if(!r.ok) throw new Error(data.message??"Login failed"); if(data.mustChangePassword) throw new Error("This account must change its temporary password before admin access."); if(!data.user.roles?.includes("ADMIN")) throw new Error("Admin access required"); setAccessToken(data.accessToken); const me=await apiFetch<MeResponse>("/auth/me"); setUser(me); setStatus("authenticated"); router.replace("/dashboard"); };
  const logout=async()=>{ const token=getAccessToken(); await fetch("/api/auth/logout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accessToken:token})}); setAccessToken(null); setUser(null); setStatus("unauthenticated"); router.replace("/login"); };
  const value=useMemo(()=>({status,user,login,logout,hasPermission:(p:string)=>!!user?.permissions?.includes(p)}),[status,user]); return <Ctx.Provider value={value}>{children}</Ctx.Provider> }
export function useAuth(){ const v=useContext(Ctx); if(!v) throw new Error("useAuth must be inside AuthProvider"); return v; }
