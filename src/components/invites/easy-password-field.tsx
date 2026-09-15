"use client";

import type { ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { EASY_PASSWORD_HINT } from "@/features/invites/invite-api";

export function EasyPasswordField({
  id = "password",
  name,
  value,
  onChange,
  required = false,
  optional = false,
  label = "Password"
}: {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {optional ? `${label} (optional)` : label}
        {required ? " *" : ""}
      </Label>
      <PasswordInput
        id={id}
        name={name}
        autoComplete="new-password"
        minLength={optional ? undefined : 6}
        required={required}
        {...(onChange
          ? { value: value ?? "", onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value) }
          : {})}
        placeholder={optional ? "Leave blank to auto-generate" : "At least 6 characters"}
      />
      <p className="text-xs text-slate-500">{EASY_PASSWORD_HINT}</p>
    </div>
  );
}
