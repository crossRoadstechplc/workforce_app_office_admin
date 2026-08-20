"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vaultApi } from "@/features/vault/vault-api";
import { hasVaultToken } from "@/features/vault/vault-token-store";
import { cn } from "@/lib/utils/cn";

export function MaskedSecret({
  credentialId,
  masked,
  onRevealUnlocked
}: {
  credentialId: string;
  masked: string;
  onRevealUnlocked?: () => void;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!secret) return;
    const timer = window.setTimeout(() => setSecret(null), 15_000);
    return () => window.clearTimeout(timer);
  }, [secret]);

  const reveal = useMutation({
    mutationFn: () => vaultApi.revealCredential(credentialId),
    onSuccess: (data) => {
      setSecret(data.secret);
      setPinOpen(false);
      setPin("");
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const unlockReveal = useMutation({
    mutationFn: () => vaultApi.unlock(pin, "reveal"),
    onSuccess: () => {
      onRevealUnlocked?.();
      reveal.mutate();
    },
    onError: (e: Error) => toast.error(e.message)
  });

  function requestReveal() {
    if (hasVaultToken("reveal")) {
      reveal.mutate();
      return;
    }
    setPinOpen(true);
  }

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copied");
    window.setTimeout(() => setCopied(false), 1500);
  }

  const shown = secret ?? masked;

  return (
    <>
      <div className="flex items-center gap-2">
        <span className={cn("font-mono text-sm", secret ? "text-amber-950" : "text-slate-600")}>{shown}</span>
        <button
          type="button"
          aria-label={secret ? "Hide secret" : "Reveal secret"}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          onClick={() => (secret ? setSecret(null) : requestReveal())}
        >
          {secret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
        {secret ? (
          <button
            type="button"
            aria-label="Copy secret"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => void copy()}
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </button>
        ) : null}
      </div>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogTitle>Reveal PIN</DialogTitle>
          <DialogDescription>Enter the reveal PIN to show this secret for 15 seconds.</DialogDescription>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              unlockReveal.mutate();
            }}
          >
            <div>
              <Label htmlFor="reveal-pin">PIN</Label>
              <Input id="reveal-pin" type="password" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setPinOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!pin || unlockReveal.isPending || reveal.isPending}>
                Reveal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
