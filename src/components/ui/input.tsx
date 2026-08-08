import * as React from "react";
import { cn } from "@/lib/utils/cn";
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("h-10 w-full rounded-lg border bg-white px-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none", className)} {...props} />; }
