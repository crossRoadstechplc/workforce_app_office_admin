"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ContextPicker } from "@/features/auth/context-switcher";
import { useAuth } from "@/features/auth/auth-provider";
import { homePathForRoles } from "@/features/navigation/role-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  const { login, selectContext, cancelContextSelection, status, user, pendingContext } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(homePathForRoles(user?.roles));
    if (status === "mustChangePassword") router.replace("/change-password");
  }, [status, user?.roles, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(identifier, password);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function chooseContext(contextKey: string) {
    setBusy(true);
    try {
      await selectContext(contextKey);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  }

  if (status === "selectContext" && pendingContext) {
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
            <p className="text-sm font-medium uppercase tracking-[.2em] text-blue-300">Choose your workspace</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">Sign in with the role that matches what you need to do.</h1>
          </div>
          <p className="text-sm text-slate-500">You can switch roles any time from the header.</p>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <Button
              type="button"
              variant="ghost"
              className="mb-4 px-0 text-slate-500"
              onClick={cancelContextSelection}
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to sign in
            </Button>
            <h2 className="text-3xl font-semibold tracking-tight">How are you signing in?</h2>
            <p className="mt-2 text-sm text-slate-500">Your account has access to more than one admin role.</p>
            <div className="mt-8">
              <ContextPicker
                contexts={pendingContext.contexts}
                defaultContextKey={pendingContext.defaultContextKey}
                busy={busy}
                onSelect={(contextKey) => void chooseContext(contextKey)}
              />
            </div>
          </div>
        </section>
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
          <p className="text-sm font-medium uppercase tracking-[.2em] text-blue-300">Operations visibility</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">Know what is happening with your workforce today.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Attendance, worksheets, leave, and employee operations in one focused admin workspace.
          </p>
        </div>
        <p className="text-sm text-slate-500">Secure administrative access</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 inline-flex rounded-xl bg-blue-600 p-2 text-white">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in with your admin email or employee code.</p>

          <div className="mt-8 space-y-5">
            <div>
              <Label htmlFor="login">Email or employee code</Label>
              <Input id="login" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full" size="lg" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
