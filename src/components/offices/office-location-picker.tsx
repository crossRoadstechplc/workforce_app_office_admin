"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { OfficeLocationPickerProps } from "./office-location-picker-inner";

export type { OfficeLocationPickerProps };

export const OfficeLocationPicker = dynamic(
  () => import("./office-location-picker-inner").then((m) => m.OfficeLocationPickerInner),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />
  }
) as React.ComponentType<OfficeLocationPickerProps>;
