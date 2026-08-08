import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
const buttonVariants = cva("inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-blue-600 text-white hover:bg-blue-700", secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200", outline: "border bg-white hover:bg-slate-50", danger: "bg-red-600 text-white hover:bg-red-700", ghost: "hover:bg-slate-100" }, size: { default: "h-10", sm: "h-8 px-3 text-xs", lg: "h-11 px-5" } }, defaultVariants: { variant: "default", size: "default" } });
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export function Button({ className, variant, size, asChild, ...props }: ButtonProps) { const Comp = asChild ? Slot : "button"; return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
