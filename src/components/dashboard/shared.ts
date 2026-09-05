import type { CourierStatus, PlatformKey } from "@/lib/dashboard/types";

type BadgeTone = "success" | "info" | "warn" | "danger" | "neutral" | "bolt" | "wolt" | "glovo";

export const STATUS_TONE: Record<CourierStatus, BadgeTone> = {
  activ: "success",
  in_proces: "warn",
  documente: "info",
  asteptare: "neutral",
};

export const STATUS_LABEL: Record<CourierStatus, string> = {
  activ: "Activ",
  in_proces: "În proces",
  documente: "Documente",
  asteptare: "În așteptare",
};

export const PLATFORM_TONE: Record<PlatformKey, BadgeTone> = {
  bolt: "bolt",
  wolt: "wolt",
  glovo: "glovo",
};

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  bolt: "Bolt",
  wolt: "Wolt",
  glovo: "Glovo",
};

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
