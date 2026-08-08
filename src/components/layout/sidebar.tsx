"use client";
import Link from "next/link";import { usePathname } from "next/navigation";import { Bell,BookOpenCheck,Building2,CalendarClock,ClipboardList,FileBarChart2,LayoutDashboard,ShieldCheck,Users,Clock3,History } from "lucide-react";import { cn } from "@/lib/utils/cn";
export const primaryNav=[
{label:"Dashboard",href:"/dashboard",icon:LayoutDashboard},
{label:"Employees",href:"/employees",icon:Users},
{label:"Attendance",href:"/attendance",icon:Clock3},
{label:"Worksheets",href:"/worksheets",icon:ClipboardList},
{label:"Leave",href:"/leave",icon:CalendarClock},
{label:"Reports",href:"/reports",icon:FileBarChart2},
{label:"Offices",href:"/offices",icon:Building2},
{label:"Schedules",href:"/schedules",icon:BookOpenCheck},
{label:"Notifications",href:"/notifications",icon:Bell},
{label:"Audit",href:"/audit",icon:History}
];
export function Sidebar(){const path=usePathname();return <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-950 text-slate-300 lg:flex lg:flex-col"><div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5 text-white"><div className="rounded-lg bg-blue-600 p-2"><ShieldCheck className="size-4"/></div><div><p className="font-semibold">Workforce Control</p><p className="text-[11px] text-slate-500">Admin / CEO</p></div></div><nav className="flex-1 space-y-1 overflow-y-auto p-3">{primaryNav.map(item=>{const active=path===item.href||path.startsWith(item.href+"/");const Icon=item.icon;return <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",active?"bg-blue-600 text-white":"hover:bg-slate-900 hover:text-white")}><Icon className="size-4"/>{item.label}</Link>})}</nav><div className="border-t border-slate-800 p-4 text-xs text-slate-500">Workforce Platform v1.0</div></aside>}
