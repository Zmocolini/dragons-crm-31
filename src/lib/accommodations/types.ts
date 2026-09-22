// Inventar de cazări (apartamente / case / camere) + registrul repartizărilor curierilor.
// TODO(real-users): tabele Drizzle `accommodations` + `accommodation_assignments`.

export type AccommodationType = "apartment" | "house" | "room";

export const ACCOMMODATION_TYPE_LABEL: Record<AccommodationType, string> = {
  apartment: "Apartament",
  house:     "Casă",
  room:      "Cameră",
};

export type AccommodationStatus = "active" | "service" | "retired";

export const ACCOMMODATION_STATUS_LABEL: Record<AccommodationStatus, string> = {
  active:  "Operațională",
  service: "Renovare / Service",
  retired: "Retrasă",
};

export const ACCOMMODATION_STATUS_STYLE: Record<AccommodationStatus, string> = {
  active:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  service: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  retired: "bg-white/[0.06] text-fg-dim border-line",
};

/** O cazare pe care o dețin/închiriez pentru curieri. */
export type Accommodation = {
  id: string;
  tenantId: string;

  name: string;              // ex: „Dragon Residence #1", „Apt. Iancu Nicolae"
  city: string;
  address: string;
  type: AccommodationType;

  /** Capacitate maximă (paturi). Când `assignments` active = totalPlaces → full. */
  totalPlaces: number;

  /** Cât plătesc eu proprietarului pe lună. Null dacă e proprie. */
  monthlyRentToOwnerRon: number | null;
  ownerName: string | null;
  ownerPhone: string | null;

  contractStartIso: string | null;
  contractEndIso: string | null;

  facilities: string[];      // ["Wi-Fi", "Mașină de spălat", ...]

  status: AccommodationStatus;
  notes: string | null;

  createdAtIso: string;
  createdBy: string;
};

export type AccommodationAssignmentStatus = "active" | "ended";

/** O repartizare = un curier ocupă un loc într-o cazare. */
export type AccommodationAssignment = {
  id: string;
  accommodationId: string;
  tenantId: string;

  courierId: string;
  courierName: string;       // snapshot

  startDateIso: string;
  endDateIso: string | null;

  monthlyRateRon: number;    // cât plătește curierul
  totalCollectedRon: number; // cumulativ

  status: AccommodationAssignmentStatus;
  endedReason: string | null;
  notes: string | null;

  createdAtIso: string;
  createdBy: string;
};

// ── Utilități de dată ────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00Z").getTime();
  const now = Date.now();
  if (!Number.isFinite(t)) return null;
  return Math.round((t - now) / DAY_MS);
}

export function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
