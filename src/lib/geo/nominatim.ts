export type PlaceResult = {
  displayName: string;
  latitude: number;
  longitude: number;
};

const MIN_QUERY_LENGTH = 3;

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const params = new URLSearchParams({ q: trimmed });
  const res = await fetch(`/api/geo/search?${params}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Address search failed");
  }
  return res.json();
}

export async function reverseGeocode(latitude: number, longitude: number, signal?: AbortSignal): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude)
  });
  const res = await fetch(`/api/geo/reverse?${params}`, { signal });
  if (!res.ok) return null;
  const data = (await res.json()) as { displayName?: string | null };
  return data.displayName ?? null;
}
