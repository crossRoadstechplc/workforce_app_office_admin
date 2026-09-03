"use client";

import { Building2, Check, ChevronsUpDown, Globe2, UserSquare2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import type { ContextType, LoginContext } from "@/types/auth";

const ICONS: Record<ContextType, typeof Globe2> = {
  platform: Globe2,
  org_admin: Building2,
  office_admin: UserSquare2,
  employee: Users
};

type ContextSwitcherProps = {
  contexts: LoginContext[];
  activeContextKey?: string;
  onSwitch: (contextKey: string) => Promise<void>;
  switching?: boolean;
  compact?: boolean;
};

export function ContextSwitcher({ contexts, activeContextKey, onSwitch, switching, compact }: ContextSwitcherProps) {
  if (contexts.length <= 1) return null;

  const active = contexts.find((item) => item.key === activeContextKey) ?? contexts[0];

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn("max-w-[min(100%,20rem)] justify-between gap-2", compact && "h-9")}
          disabled={switching}
        >
          <span className="flex min-w-0 items-center gap-2">
            {active ? <ContextIcon type={active.type} /> : null}
            <span className="truncate text-left text-sm font-medium">{active?.label ?? "Select context"}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownTrigger>
      <DropdownContent align="start" className="w-[min(100vw-2rem,22rem)]">
        {contexts.map((context) => {
          const Icon = ICONS[context.type];
          const selected = context.key === activeContextKey;
          return (
            <DropdownItem
              key={context.key}
              className="flex items-start gap-3 py-2.5"
              onSelect={() => {
                if (!selected) void onSwitch(context.key);
              }}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{context.label}</span>
                {context.officeNames.length > 0 && (
                  <span className="block truncate text-xs text-slate-500">{context.officeNames.join(", ")}</span>
                )}
              </span>
              {selected && <Check className="size-4 shrink-0 text-blue-600" />}
            </DropdownItem>
          );
        })}
      </DropdownContent>
    </Dropdown>
  );
}

function ContextIcon({ type }: { type: ContextType }) {
  const Icon = ICONS[type];
  return <Icon className="size-4 shrink-0 text-slate-600" />;
}

type ContextPickerProps = {
  contexts: LoginContext[];
  defaultContextKey: string | null;
  busy?: boolean;
  onSelect: (contextKey: string) => void;
};

export function ContextPicker({ contexts, defaultContextKey, busy, onSelect }: ContextPickerProps) {
  return (
    <div className="space-y-3">
      {contexts.map((context) => {
        const Icon = ICONS[context.type];
        const isDefault = context.key === defaultContextKey;
        return (
          <button
            key={context.key}
            type="button"
            disabled={busy}
            onClick={() => onSelect(context.key)}
            className={cn(
              "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60",
              isDefault ? "border-blue-300 bg-blue-50/40" : "border-slate-200 bg-white"
            )}
          >
            <span className="mt-0.5 grid size-9 place-items-center rounded-lg bg-slate-100">
              <Icon className="size-4 text-slate-700" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-950">{context.label}</span>
              {context.officeNames.length > 0 && (
                <span className="mt-0.5 block text-sm text-slate-500">{context.officeNames.join(", ")}</span>
              )}
              {isDefault && <span className="mt-1 inline-block text-xs font-medium text-blue-700">Suggested</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
