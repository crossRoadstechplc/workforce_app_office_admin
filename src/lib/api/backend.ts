const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const url =
  process.env.BACKEND_API_BASE_URL ??
  (publicBase?.startsWith("http") ? publicBase : undefined) ??
  "http://localhost:4000/api/v1";
export async function backendFetch(path:string, init?:RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(`${url}${path}`, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: { "content-type":"application/json", ...(init?.headers ?? {}) },
      cache:"no-store"
    });
  } finally {
    clearTimeout(timer);
  }
}
