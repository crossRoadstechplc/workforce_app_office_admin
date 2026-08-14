"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type AttendancePhotoPreview = {
  url: string;
  title: string;
};

export function AttendancePhotoThumb({
  url,
  title,
  onOpen
}: {
  url?: string | null;
  title: string;
  onOpen: (photos: AttendancePhotoPreview[]) => void;
}) {
  if (!url) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <button
      type="button"
      title={title}
      aria-label={`View ${title}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen([{ url, title }]);
      }}
      className="inline-flex rounded-full ring-2 ring-white shadow-sm transition hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={title} className="size-9 rounded-full object-cover" />
    </button>
  );
}

export function AttendancePhotoStack({
  photos,
  onOpen
}: {
  photos: AttendancePhotoPreview[];
  onOpen: (photos: AttendancePhotoPreview[]) => void;
}) {
  if (!photos.length) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <button
      type="button"
      title={photos.length > 1 ? "View check-in and check-out photos" : photos[0]!.title}
      aria-label={photos.length > 1 ? "View attendance photos" : `View ${photos[0]!.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(photos);
      }}
      className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded-full"
    >
      <span className="flex">
        {photos.map((photo, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${photo.title}-${index}`}
            src={photo.url}
            alt={photo.title}
            className={`size-9 rounded-full object-cover ring-2 ring-white shadow-sm ${index > 0 ? "-ml-3" : ""}`}
            style={{ zIndex: photos.length - index }}
          />
        ))}
      </span>
    </button>
  );
}

export function AttendancePhotoLightbox({
  photos,
  onClose
}: {
  photos: AttendancePhotoPreview[] | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!photos?.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [photos, onClose]);

  if (!photos?.length || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Attendance photos">
      <button type="button" aria-label="Close photo" className="absolute inset-0 bg-slate-950/70" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col">
        <div className="mb-3 flex items-center justify-between text-white">
          <p className="text-sm font-medium">{photos.length > 1 ? "Attendance photos" : photos[0]!.title}</p>
          <button type="button" onClick={onClose} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto rounded-xl bg-black/40 p-3">
          <div className="space-y-6">
            {photos.map((photo) => (
              <figure key={photo.title} className="space-y-2">
                <figcaption className="text-sm font-medium text-white">{photo.title}</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.title} className="w-full rounded-lg bg-black object-contain" />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function locationPhotoType(location: { type?: string; locationType?: string }) {
  return location.type ?? location.locationType ?? "PHOTO";
}

export function locationPhotoTitle(type: string) {
  if (type === "CHECK_IN") return "Check-in photo";
  if (type === "CHECK_OUT") return "Check-out photo";
  return "Attendance photo";
}
