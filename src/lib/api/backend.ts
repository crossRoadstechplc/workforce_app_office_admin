const url = process.env.BACKEND_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
export async function backendFetch(path:string, init?:RequestInit) { return fetch(`${url}${path}`, { ...init, headers: { "content-type":"application/json", ...(init?.headers ?? {}) }, cache:"no-store" }); }
