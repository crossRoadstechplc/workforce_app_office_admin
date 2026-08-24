"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function ChangePasswordPage() {
  const { status, user, changePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password updated. You can now use the admin portal.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unauthenticated" || status === "authenticated") {
    return (
      <main className="grid min-h-screen place-items-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </main>
    );
  }

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
          <p className="text-sm font-medium uppercase tracking-[.2em] text-blue-300">Security</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Set your permanent password.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Your account was created with a temporary password. Choose a new one before continuing.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-6 inline-flex rounded-xl bg-amber-100 p-3 text-amber-900">
            <KeyRound className="size-5" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Change password</h2>
          <p className="mt-2 text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{user?.email}</span>
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <Label htmlFor="current">Temporary password</Label>
              <PasswordInput
                id="current"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="new">New password</Label>
              <PasswordInput
                id="new"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={10}
                required
              />
              <p className="mt-1 text-xs text-slate-500">At least 10 characters with upper, lower, and a number.</p>
            </div>
            <div>
              <Label htmlFor="confirm">Confirm new password</Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={10}
                required
              />
            </div>
            <Button className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
