"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vaultApi } from "@/features/vault/vault-api";
import type { VaultScope } from "@/types/vault";

export function VaultLockCard({
  scope,
  title,
  description,
  onUnlocked
}: {
  scope: Exclude<VaultScope, "reveal">;
  title: string;
  description: string;
  onUnlocked: () => void;
}) {
  const [pin, setPin] = useState("");
  const unlock = useMutation({
    mutationFn: () => vaultApi.unlock(pin, scope),
    onSuccess: () => {
      setPin("");
      toast.success(`${title} unlocked`);
      onUnlocked();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  return (
    <Card className="mx-auto max-w-md p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Lock className="size-5" />
      </div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          unlock.mutate();
        }}
      >
        <div>
          <Label htmlFor={`vault-pin-${scope}`}>Vault PIN</Label>
          <Input
            id={`vault-pin-${scope}`}
            type="password"
            autoComplete="off"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
          />
        </div>
        <Button type="submit" className="w-full" disabled={!pin || unlock.isPending}>
          {unlock.isPending ? "Unlocking…" : "Unlock"}
        </Button>
      </form>
    </Card>
  );
}
