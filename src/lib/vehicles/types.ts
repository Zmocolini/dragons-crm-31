// Inventar de vehicule al flotei + registrul închirierilor către curieri.
// TODO(real-users): mutare pe tabele Drizzle `fleet_vehicles` + `vehicle_rentals`
// cu FK către couriers + tenants. Momentan totul în localStorage per tenant.

export type FleetVehicleType = "bike" | "e_bike" | "scooter" | "car" | "van";

export const FLEET_VEHICLE_TYPE_LABEL: Record<FleetVehicleType, string> = {
  bike:    "Bicicletă",
  e_bike:  "Bicicletă electrică",
  scooter: "Scuter / Moto",
  car:     "Mașină",
  van:     "Dubă",
};

/** ITP + RCA se cer doar la vehiculele înmatriculate. */
export const REGISTERED_TYPES: ReadonlyArray<FleetVehicleType> = ["scooter", "car", "van"];

export type FleetVehicleFuel = "petrol" | "diesel" | "electric" | "none";

export const FUEL_LABEL: Record<FleetVehicleFuel, string> = {
  petrol:   "Benzină",
  diesel:   "Motorină",
  electric: "Electric",
  none:     "—",
};

export type FleetVehicleStatus = "available" | "rented" | "service" | "retired";

export const VEHICLE_STATUS_LABEL: Record<FleetVehicleStatus, string> = {
  available: "Disponibil",
  rented:    "Închiriat",
  service:   "În service",
  retired:   "Retras",
};

export const VEHICLE_STATUS_STYLE: Record<FleetVehicleStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  rented:    "bg-violet-500/15 text-violet-300 border-violet-500/25",
  service:   "bg-amber-500/15 text-amber-300 border-amber-500/25",
  retired:   "bg-white/[0.06] text-fg-dim border-line",
};

export type FleetVehicle = {
  id: string;
  tenantId: string;

  /** Plăcuță (dacă e înmatriculat) sau serial intern (ex: „SCT-001", „BIKE-12"). */
  label: string;
  type: FleetVehicleType;
  brand: string;
  model: string;

  year: number | null;
  vin: string | null;
  color: string | null;
  fuel: FleetVehicleFuel | null;

  purchaseDateIso: string | null;
  purchasePriceRon: number | null;

  /** Doar pentru scooter/car/van. */
  itpExpiryIso: string | null;
  insuranceExpiryIso: string | null;

  status: FleetVehicleStatus;
  /** Pointer către rental-ul activ. Null când vehiculul nu e închiriat. */
  currentRentalId: string | null;

  notes: string | null;

  createdAtIso: string;
  createdBy: string;
};

export type VehicleRentalStatus = "active" | "ended";

export type VehicleRental = {
  id: string;
  vehicleId: string;
  tenantId: string;

  courierId: string;
  /** Snapshot la momentul închirierii — supraviețuiește ștergerii curierului. */
  courierName: string;

  startDateIso: string;
  endDateIso: string | null;

  weeklyRateRon: number;
  /** Cumulativ, actualizat manual sau prin acțiuni „Am încasat chiria". */
  totalCollectedRon: number;

  status: VehicleRentalStatus;
  /** „returnat", „vândut", „pierdut", etc. — completat la end. */
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
