"use client";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth/token-store";
import { useAuth } from "@/features/auth/auth-provider";
let socket:Socket|null=null;
const events=["employee.checked_in","employee.checked_out","employee.checked_in_late","attendance.corrected","attendance.missing_checkout","leave.requested","leave.cancelled","leave.decision_updated","dashboard.summary_updated","notification.created"];
export function RealtimeProvider({children}:{children:React.ReactNode}){const {status}=useAuth();const query=useQueryClient();useEffect(()=>{if(status!=="authenticated")return;const token=getAccessToken();if(!token)return;socket=io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL??"http://localhost:4000",{auth:{token},transports:["websocket","polling"]});const refresh=()=>{void query.invalidateQueries({queryKey:["dashboard"]});void query.invalidateQueries({queryKey:["notifications"]});void query.invalidateQueries({queryKey:["timesheets"]});void query.invalidateQueries({queryKey:["leave"]});};events.forEach(e=>socket?.on(e,refresh));return()=>{events.forEach(e=>socket?.off(e,refresh));socket?.disconnect();socket=null;};},[status,query]);return children;}
