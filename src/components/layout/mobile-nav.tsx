"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { primaryNav } from "./sidebar";
import { cn } from "@/lib/utils/cn";
export function MobileNav(){ const [open,setOpen]=useState(false); const path=usePathname(); return <><Button variant="ghost" className="lg:hidden" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu className="size-5"/></Button>{open&&<div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/45" aria-label="Close navigation" onClick={()=>setOpen(false)}/><aside className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] bg-slate-950 text-slate-300 shadow-2xl"><div className="flex h-16 items-center justify-between border-b border-slate-800 px-5 text-white"><div className="flex items-center gap-3"><div className="rounded-lg bg-blue-600 p-2"><ShieldCheck className="size-4"/></div><span className="font-semibold">Workforce Control</span></div><button className="rounded-lg p-2 hover:bg-slate-900" onClick={()=>setOpen(false)} aria-label="Close navigation"><X className="size-5"/></button></div><nav className="space-y-1 p-3">{primaryNav.map(item=>{const Icon=item.icon;const active=path===item.href||path.startsWith(item.href+"/");return <Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",active?"bg-blue-600 text-white":"hover:bg-slate-900 hover:text-white")}><Icon className="size-4"/>{item.label}</Link>})}</nav></aside></div>}</> }
