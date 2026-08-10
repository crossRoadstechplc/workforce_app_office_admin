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
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json([]);
  }

  try {
    await throttle();
    const url = new URL("/search", NOMINATIM_BASE);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": USER_AGENT
      },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return NextResponse.json({ message: "Geocoder unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
    const results = data.map((item) => ({
      displayName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    }));

    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ message: "Address search failed" }, { status: 500 });
  }
}
