import * as React from "react";
import { cn } from "@/lib/utils/cn";
export function Select({className,...props}:React.SelectHTMLAttributes<HTMLSelectElement>){return <select className={cn("h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100",className)} {...props}/>}
