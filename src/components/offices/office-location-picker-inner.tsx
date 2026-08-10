"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { reverseGeocode, searchPlaces, type PlaceResult } from "@/lib/geo/nominatim";
import { getOfficeMarkerIcon } from "@/lib/geo/leaflet-icon";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [9.032, 38.746];

export type OfficeLocationPickerProps = {
  latitude: number | "";
  longitude: number | "";
  address: string;
  allowedRadiusMeters: number;
  onChange: (patch: { latitude: number | ""; longitude: number | ""; address?: string }) => void;
};

function MapController({ latitude, longitude, zoom }: { latitude: number; longitude: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], zoom, { animate: true });
  }, [latitude, longitude, map, zoom]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export function OfficeLocationPickerInner({
  latitude,
  longitude,
  address,
  allowedRadiusMeters,
  onChange
}: OfficeLocationPickerProps) {
  const [query, setQuery] = useState(address);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [manualEdit, setManualEdit] = useState(false);
  const [locating, setLocating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reverseAbortRef = useRef<AbortController | null>(null);

  const hasCoords = latitude !== "" && longitude !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const lat = hasCoords ? Number(latitude) : DEFAULT_CENTER[0];
  const lng = hasCoords ? Number(longitude) : DEFAULT_CENTER[1];
  const position = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);
  const mapZoom = hasCoords ? 16 : 12;
  const markerIcon = useMemo(() => getOfficeMarkerIcon(), []);

  useEffect(() => {
    setQuery(address);
  }, [address]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setSearching(true);
      try {
        const places = await searchPlaces(query, controller.signal);
        if (!controller.signal.aborted) {
          setResults(places);
          setShowResults(true);
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          toast.error(e instanceof Error ? e.message : "Address search failed");
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [query]);

  const applyCoords = useCallback(
    async (lat: number, lng: number, nextAddress?: string) => {
      onChange({ latitude: lat, longitude: lng, address: nextAddress });

      if (nextAddress !== undefined) {
        setQuery(nextAddress);
        return;
      }

      reverseAbortRef.current?.abort();
      const controller = new AbortController();
      reverseAbortRef.current = controller;
      try {
        const label = await reverseGeocode(lat, lng, controller.signal);
        if (label && !controller.signal.aborted) {
          onChange({ latitude: lat, longitude: lng, address: label });
          setQuery(label);
        }
      } catch {
        // reverse geocode is best-effort
      }
    },
    [onChange]
  );

  function selectPlace(place: PlaceResult) {
    setShowResults(false);
    setResults([]);
    void applyCoords(place.latitude, place.longitude, place.displayName);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported in this browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void applyCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Allow location access in the browser, or click the map instead.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          toast.error("Location is currently unavailable");
        } else if (err.code === err.TIMEOUT) {
          toast.error("Location request timed out. Try again.");
        } else {
          toast.error("Could not access your location");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Label htmlFor="office-address-search">Search address</Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="office-address-search"
            className="pl-9"
            placeholder="Search street, city, or landmark"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => window.setTimeout(() => setShowResults(false), 150)}
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" />}
        </div>
        {showResults && results.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
            {results.map((place) => (
              <li key={`${place.latitude}-${place.longitude}-${place.displayName}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPlace(place)}
                >
                  {place.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <MapContainer center={position} zoom={mapZoom} className="h-[300px] w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController latitude={lat} longitude={lng} zoom={mapZoom} />
          <MapClickHandler onPick={(lat, lng) => void applyCoords(lat, lng)} />
          {hasCoords && (
            <>
              <Marker
                position={position}
                draggable
                icon={markerIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat: nextLat, lng: nextLng } = e.target.getLatLng();
                    void applyCoords(nextLat, nextLng);
                  }
                }}
              />
              <Circle
                center={position}
                radius={allowedRadiusMeters}
                pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2 }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <MapPin className="size-4 shrink-0" />
          {hasCoords ? (
            <span>
              {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </span>
          ) : (
            <span className="text-slate-400">Click the map or search an address to set location</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={locating} onClick={useMyLocation}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            Use my location
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setManualEdit((v) => !v)}>
            {manualEdit ? "Hide manual" : "Edit manually"}
          </Button>
        </div>
      </div>

      {manualEdit && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Latitude">
            <Input
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                if (val === "" || Number.isFinite(val)) {
                  onChange({
                    latitude: val,
                    longitude: longitude === "" ? "" : Number(longitude),
                    address: query
                  });
                }
              }}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                if (val === "" || Number.isFinite(val)) {
                  onChange({
                    latitude: latitude === "" ? "" : Number(latitude),
                    longitude: val,
                    address: query
                  });
                }
              }}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} onBlur={() => {
                if (latitude !== "" && longitude !== "") {
                  onChange({ latitude: Number(latitude), longitude: Number(longitude), address: query });
                }
              }} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
