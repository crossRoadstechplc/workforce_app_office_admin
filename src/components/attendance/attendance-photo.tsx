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
  onOpen: (photo: AttendancePhotoPreview) => void;
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
        onOpen({ url, title });
      }}
      className="inline-flex rounded-full ring-2 ring-white shadow-sm transition hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={title} className="size-9 rounded-full object-cover" />
    </button>
  );
}

export function AttendancePhotoLightbox({
  photo,
  onClose
}: {
  photo: AttendancePhotoPreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [photo, onClose]);

  if (!photo || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={photo.title}>
      <button type="button" aria-label="Close photo" className="absolute inset-0 bg-slate-950/70" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between text-white">
          <p className="text-sm font-medium">{photo.title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/15 p-2 hover:bg-white/25"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.title} className="max-h-[80vh] w-full rounded-xl bg-black object-contain" />
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
