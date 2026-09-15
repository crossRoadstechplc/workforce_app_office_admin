"use client";

import { Label } from "@/components/ui/label";

export type InviteDeliveryMethod = "SHOW_PASSWORD" | "SEND_EMAIL";

export function InviteDeliveryFields({
  value,
  onChange,
  emailLabel = "Send invite email"
}: {
  value: InviteDeliveryMethod;
  onChange: (value: InviteDeliveryMethod) => void;
  emailLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>Invite delivery</Label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="radio"
          className="mt-1"
          checked={value === "SHOW_PASSWORD"}
          onChange={() => onChange("SHOW_PASSWORD")}
        />
        <span>
          <span className="font-medium">Show temporary password</span>
          <span className="block text-xs text-slate-500">Create the account and copy the password now. You can set an easy password of at least 6 characters.</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="radio" className="mt-1" checked={value === "SEND_EMAIL"} onChange={() => onChange("SEND_EMAIL")} />
        <span>
          <span className="font-medium">{emailLabel}</span>
          <span className="block text-xs text-slate-500">They receive a link to set a password of at least 6 characters. No password is shown here.</span>
        </span>
      </label>
    </div>
  );
}
