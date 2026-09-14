/** Public links for post-invite “open app / get app / continue on web”. */

export type EmployeeDeviceKind = "ios" | "android" | "desktop";

export function detectEmployeeDevice(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): EmployeeDeviceKind {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

function trimUrl(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/$/, "");
}

export function employeeAppLinkConfig() {
  return {
    webBaseUrl: trimUrl(process.env.NEXT_PUBLIC_EMPLOYEE_WEB_URL),
    appStoreUrl: trimUrl(process.env.NEXT_PUBLIC_EMPLOYEE_APP_STORE_URL),
    playStoreUrl: trimUrl(process.env.NEXT_PUBLIC_EMPLOYEE_PLAY_STORE_URL),
    /** Custom scheme without :// — default workforce */
    deepLinkScheme: (process.env.NEXT_PUBLIC_EMPLOYEE_APP_SCHEME ?? "workforce").trim() || "workforce",
    androidPackage: (process.env.NEXT_PUBLIC_EMPLOYEE_ANDROID_PACKAGE ?? "workforce.app").trim() || "workforce.app"
  };
}

export function buildEmployeeWebLoginUrl(email: string): string | null {
  const base = employeeAppLinkConfig().webBaseUrl;
  if (!base) return null;
  const url = new URL(`${base}/login`);
  if (email) url.searchParams.set("email", email);
  return url.toString();
}

/** Custom-scheme URI that opens the native app on login when registered. */
export function buildEmployeeAppDeepLink(email: string): string {
  const { deepLinkScheme } = employeeAppLinkConfig();
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  const qs = params.toString();
  return `${deepLinkScheme}://login${qs ? `?${qs}` : ""}`;
}

/** Android Chrome Intent URL with store/web fallback when the app is missing. */
export function buildAndroidOpenIntent(email: string, fallbackUrl: string): string {
  const { deepLinkScheme, androidPackage } = employeeAppLinkConfig();
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  const qs = params.toString();
  const path = `login${qs ? `?${qs}` : ""}`;
  return `intent://${path}#Intent;scheme=${encodeURIComponent(deepLinkScheme)};package=${encodeURIComponent(androidPackage)};S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
}

export function storeUrlForDevice(device: EmployeeDeviceKind): string | null {
  const { appStoreUrl, playStoreUrl } = employeeAppLinkConfig();
  if (device === "ios") return appStoreUrl || null;
  if (device === "android") return playStoreUrl || null;
  return appStoreUrl || playStoreUrl || null;
}
