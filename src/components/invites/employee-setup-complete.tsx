"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Smartphone, Store, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyValue } from "@/components/ui/copy-value";
import {
  buildAndroidOpenIntent,
  buildEmployeeAppDeepLink,
  buildEmployeeWebLoginUrl,
  detectEmployeeDevice,
  employeeAppLinkConfig,
  storeUrlForDevice,
  type EmployeeDeviceKind
} from "@/lib/employee-app-links";

type Props = {
  email: string;
  employeeCode: string;
  existingAccount?: boolean;
};

export function EmployeeSetupComplete({ email, employeeCode, existingAccount }: Props) {
  const [device, setDevice] = useState<EmployeeDeviceKind>("desktop");
  const [opening, setOpening] = useState(false);
  const openTimer = useRef<number | null>(null);

  useEffect(() => {
    setDevice(detectEmployeeDevice());
    return () => {
      if (openTimer.current != null) window.clearTimeout(openTimer.current);
    };
  }, []);

  const config = useMemo(() => employeeAppLinkConfig(), []);
  const webLoginUrl = useMemo(() => buildEmployeeWebLoginUrl(email), [email]);
  const storeUrl = useMemo(() => storeUrlForDevice(device), [device]);
  const isMobile = device === "ios" || device === "android";
  const hasStore = Boolean(storeUrl);
  const hasWeb = Boolean(webLoginUrl);
  const passwordHint = existingAccount ? " and your existing password." : " and the password you just chose.";

  function openStore() {
    if (!storeUrl) {
      toast.message("App store link is not configured yet. Continue on the web, or ask your admin for the app.");
      return;
    }
    window.location.assign(storeUrl);
  }

  function continueOnWeb() {
    if (!webLoginUrl) {
      toast.message("Employee web app URL is not configured (NEXT_PUBLIC_EMPLOYEE_WEB_URL).");
      return;
    }
    window.location.assign(webLoginUrl);
  }

  function openApp() {
    const fallback = storeUrl || webLoginUrl;
    if (!fallback && device === "desktop") {
      toast.message("Install the employee app on your phone, or continue on the web.");
      return;
    }

    setOpening(true);
    if (openTimer.current != null) window.clearTimeout(openTimer.current);

    if (device === "android") {
      const fallbackUrl = fallback || config.playStoreUrl || webLoginUrl || "about:blank";
      window.location.href = buildAndroidOpenIntent(email, fallbackUrl);
      setOpening(false);
      return;
    }

    if (device === "ios") {
      const deepLink = buildEmployeeAppDeepLink(email);
      const started = Date.now();
      window.location.href = deepLink;
      openTimer.current = window.setTimeout(() => {
        // If the app opened, the page is usually hidden; only fall back if still visible.
        if (document.visibilityState === "visible" && Date.now() - started >= 1400) {
          if (storeUrl) window.location.assign(storeUrl);
          else if (webLoginUrl) window.location.assign(webLoginUrl);
          else toast.message("Could not open the app. Continue on the web or install from the store.");
        }
        setOpening(false);
      }, 1600);
      return;
    }

    // Desktop: try scheme (rarely works) then prefer web / show store hint
    window.location.href = buildEmployeeAppDeepLink(email);
    openTimer.current = window.setTimeout(() => {
      if (webLoginUrl) window.location.assign(webLoginUrl);
      setOpening(false);
    }, 800);
  }

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8">
        <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-blue-800">
          <UserPlus className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold">You are set up</h1>
        <p className="mt-2 text-sm text-slate-500">
          {isMobile
            ? `Open the employee app, get it from the store, or continue in the browser with your email or employee code${passwordHint}`
            : `Sign in on the employee web app or your phone with your email or employee code${passwordHint}`}
        </p>

        <div className="mt-6 space-y-3">
          <CopyValue label="Email" value={email} />
          <CopyValue label="Employee code" value={employeeCode} />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {isMobile ? (
            <>
              <Button type="button" size="lg" className="w-full" disabled={opening} onClick={openApp}>
                <Smartphone className="size-4" />
                {opening ? "Opening…" : "Open employee app"}
              </Button>
              {hasStore ? (
                <Button type="button" size="lg" variant="secondary" className="w-full" onClick={openStore}>
                  <Store className="size-4" />
                  Get the app
                </Button>
              ) : null}
              {hasWeb ? (
                <Button type="button" size="lg" variant="outline" className="w-full" onClick={continueOnWeb}>
                  <ExternalLink className="size-4" />
                  Continue on web
                </Button>
              ) : null}
            </>
          ) : (
            <>
              {hasWeb ? (
                <Button type="button" size="lg" className="w-full" onClick={continueOnWeb}>
                  <ExternalLink className="size-4" />
                  Continue on web
                </Button>
              ) : null}
              {config.appStoreUrl || config.playStoreUrl ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {config.playStoreUrl ? (
                    <Button type="button" variant="secondary" className="w-full" asChild>
                      <a href={config.playStoreUrl} target="_blank" rel="noreferrer">
                        <Store className="size-4" />
                        Google Play
                      </a>
                    </Button>
                  ) : null}
                  {config.appStoreUrl ? (
                    <Button type="button" variant="secondary" className="w-full" asChild>
                      <a href={config.appStoreUrl} target="_blank" rel="noreferrer">
                        <Store className="size-4" />
                        App Store
                      </a>
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <p className="text-center text-xs text-slate-500">
                On your phone, open or install the employee app and sign in with the email or code above.
              </p>
            </>
          )}
        </div>

        {!hasWeb && !hasStore ? (
          <p className="mt-4 text-xs text-amber-700">
            App and web links are not configured on this portal yet. Use your email or employee code in the employee app when you have it.
          </p>
        ) : null}
      </div>
    </main>
  );
}
