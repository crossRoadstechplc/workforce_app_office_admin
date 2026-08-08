"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils/cn";
export const Dropdown = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;
export function DropdownContent({ className, ...props }: DropdownMenu.DropdownMenuContentProps) { return <DropdownMenu.Portal><DropdownMenu.Content sideOffset={8} className={cn("z-50 min-w-44 rounded-xl border bg-white p-1 shadow-lg", className)} {...props}/></DropdownMenu.Portal>; }
export function DropdownItem({ className, ...props }: DropdownMenu.DropdownMenuItemProps) { return <DropdownMenu.Item className={cn("cursor-pointer rounded-lg px-3 py-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100", className)} {...props}/>; }
