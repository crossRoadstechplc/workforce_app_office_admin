"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/features/auth/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
export function DashboardShell({children}:{children:React.ReactNode}) { const {status}=useAuth(); const router=useRouter(); useEffect(()=>{if(status==="unauthenticated")router.replace("/login")},[status,router]); if(status!=="authenticated") return <div className="min-h-screen p-8"><Skeleton className="h-12 w-full"/><Skeleton className="mt-6 h-96 w-full"/></div>; return <div className="min-h-screen"><Sidebar/><div className="lg:pl-64"><Header/><main className="p-4 md:p-6 xl:p-8">{children}</main></div></div> }
