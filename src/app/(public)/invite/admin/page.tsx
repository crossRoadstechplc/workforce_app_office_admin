"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordMeetsRules, publicInviteApi } from "@/features/invites/invite-api";

export default function AdminInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center">
          <Loader2 className="size-8 animate-spin text-slate-400" />
        </main>
      }
    >
      <AdminInviteInner />
    </Suspense>
  );
}

function AdminInviteInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const invite = useQuery({
    queryKey: ["invite", token],
    queryFn: () => publicInviteApi.get(token),
    enabled: token.length > 0,
    retry: false
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const requiresPassword = invite.data?.requiresPassword ?? true;
    if (requiresPassword) {
      if (password !== confirm) {
        toast.error("Passwords do not match");
        return;
      }
      if (!passwordMeetsRules(password)) {
        toast.error("Use at least 10 characters with upper, lower, and a number");
        return;
      }
    }
    setBusy(true);
    try {
      const result = await publicInviteApi.acceptAdmin(token, requiresPassword ? password : undefined);
      toast.success(result.existingAccount ? "Access confirmed. Sign in with your existing password." : "Password saved. You can sign in now.");
      router.replace("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete invite");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p className="text-sm text-slate-500">This invite link is missing a token.</p>
      </main>
    );
  }

  if (invite.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </main>
    );
  }

  if (invite.isError || !invite.data) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <p className="max-w-sm text-center text-sm text-slate-500">
          {invite.error instanceof Error ? invite.error.message : "This invite is invalid or has expired."}
        </p>
      </main>
    );
  }

  const data = invite.data;
  const requiresPassword = data.requiresPassword;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <div className="rounded-lg bg-blue-600 p-2">
            <ShieldCheck className="size-5" />
          </div>
          Workforce Control
        </div>
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-[.2em] text-blue-300">Invitation</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">
            {requiresPassword ? `Set your password for ${data.organization.name}.` : `Confirm your access to ${data.organization.name}.`}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            {requiresPassword
              ? "After you choose a password, sign in to continue setting up your company."
              : "You already have an account. Confirm this invite, then sign in with your existing password."}
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-6 inline-flex rounded-xl bg-amber-100 p-3 text-amber-900">
            <KeyRound className="size-5" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">{requiresPassword ? "Set password" : "Confirm access"}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Invited as <span className="font-medium text-slate-700">{data.email}</span>
          </p>
          <div className="mt-8 space-y-5">
            {requiresPassword ? (
              <>
                <div>
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />
                  <p className="mt-1 text-xs text-slate-500">At least 10 characters with upper, lower, and a number.</p>
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={10} required />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">This invite adds administrator access to your existing Workforce account.</p>
            )}
            <Button className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Continue
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
