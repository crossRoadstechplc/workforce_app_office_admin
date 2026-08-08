"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, ...props }: DialogPrimitive.DialogContentProps) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40"/><DialogPrimitive.Content className={cn("fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-white p-6 shadow-xl", className)} {...props}>{children}<DialogPrimitive.Close aria-label="Close" className="absolute right-4 top-4 rounded-md p-1 text-slate-500 hover:bg-slate-100"><X className="size-4"/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>; }
export function DialogTitle({ className, ...props }: DialogPrimitive.DialogTitleProps) { return <DialogPrimitive.Title className={cn("text-lg font-semibold text-slate-950", className)} {...props}/>; }
export function DialogDescription({ className, ...props }: DialogPrimitive.DialogDescriptionProps) { return <DialogPrimitive.Description className={cn("mt-1 text-sm text-slate-500", className)} {...props}/>; }
