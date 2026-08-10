import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "WorkforceAdminPortal/1.0 (workforce-admin-portal)";
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;

async function throttle() {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
  }

  try {
    await throttle();
    const url = new URL("/reverse", NOMINATIM_BASE);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": USER_AGENT
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return NextResponse.json({ displayName: null });
    }

    const data = (await res.json()) as { display_name?: string };
    return NextResponse.json({ displayName: data.display_name ?? null });
  } catch {
    return NextResponse.json({ displayName: null });
  }
}
