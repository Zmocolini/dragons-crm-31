"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/rbac/session";
import type {
  FleetVehicle, FleetVehicleStatus, VehicleRental,
} from "./types";
import { todayIsoLocal } from "./types";

// TODO(real-users): server actions cu Drizzle. Momentan localStorage per tenant.

const KEY_VEHICLES = "crm31-fleet-vehicles";
const KEY_RENTALS  = "crm31-vehicle-rentals";

type StartRentalInput = {
  vehicleId: string;
  courierId: string;
  courierName: string;
  startDateIso: string;
  weeklyRateRon: number;
  notes: string | null;
};

type EndRentalInput = {
  rentalId: string;
  endDateIso: string;
  reason: string | null;
  notes: string | null;
};

type VehiclesContextValue = {
  hydrated: boolean;
  /** Toate vehiculele (toate flotele). */
  vehicles: FleetVehicle[];
  /** Vehiculele flotei active. */
  fleetVehicles: FleetVehicle[];
  /** Toate închirierile (toate flotele). */
  rentals: VehicleRental[];
  /** Închirierile flotei active. */
  fleetRentals: VehicleRental[];

  addVehicle: (input: Omit<FleetVehicle, "id" | "createdAtIso" | "status" | "currentRentalId">) => FleetVehicle;
  updateVehicle: (id: string, patch: Partial<Omit<FleetVehicle, "id" | "createdAtIso" | "tenantId">>) => void;
  deleteVehicle: (id: string) => { ok: boolean; reason?: string };

  sendToService: (id: string, note: string | null, actorName: string) => void;
  markAvailable: (id: string, actorName: string) => void;
  retireVehicle: (id: string, note: string | null, actorName: string) => void;

  startRental: (input: StartRentalInput, actorName: string) => VehicleRental | null;
  endRental: (input: EndRentalInput, actorName: string) => void;
  addRentalCollection: (rentalId: string, amountRon: number) => void;

  activeRentalOf: (vehicleId: string) => VehicleRental | null;
  rentalHistoryOf: (vehicleId: string) => VehicleRental[];
  rentalsForCourier: (courierId: string) => VehicleRental[];
};

const VehiclesContext = createContext<VehiclesContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function VehiclesProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [rentals, setRentals] = useState<VehicleRental[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setVehicles(safeRead<FleetVehicle[]>(KEY_VEHICLES, []));
    setRentals(safeRead<VehicleRental[]>(KEY_RENTALS, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY_VEHICLES, JSON.stringify(vehicles)); } catch {}
  }, [vehicles, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY_RENTALS, JSON.stringify(rentals)); } catch {}
  }, [rentals, hydrated]);

  const fleetVehicles = useMemo(
    () => vehicles.filter((v) => v.tenantId === activeFleetId),
    [vehicles, activeFleetId],
  );
  const fleetRentals = useMemo(
    () => rentals.filter((r) => r.tenantId === activeFleetId),
    [rentals, activeFleetId],
  );

  const addVehicle = useCallback((
    input: Omit<FleetVehicle, "id" | "createdAtIso" | "status" | "currentRentalId">,
  ): FleetVehicle => {
    const created: FleetVehicle = {
      ...input,
      id: uid("veh"),
      createdAtIso: new Date().toISOString(),
      status: "available",
      currentRentalId: null,
    };
    setVehicles((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateVehicle = useCallback((id: string, patch: Partial<Omit<FleetVehicle, "id" | "createdAtIso" | "tenantId">>) => {
    setVehicles((prev) => prev.map((v) => v.id === id ? { ...v, ...patch } : v));
  }, []);

  const deleteVehicle = useCallback((id: string): { ok: boolean; reason?: string } => {
    const v = vehicles.find((x) => x.id === id);
    if (!v) return { ok: false, reason: "Vehiculul nu există." };
    if (v.status === "rented" && v.currentRentalId) {
      return { ok: false, reason: "Nu poți șterge un vehicul închiriat. Returnează-l întâi." };
    }
    setVehicles((prev) => prev.filter((x) => x.id !== id));
    return { ok: true };
  }, [vehicles]);

  const sendToService = useCallback((id: string, _note: string | null, _actorName: string) => {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== id) return v;
      if (v.status === "rented") return v; // trebuie returnat înainte
      return { ...v, status: "service" };
    }));
  }, []);

  const markAvailable = useCallback((id: string, _actorName: string) => {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== id) return v;
      if (v.status === "rented") return v;
      return { ...v, status: "available" };
    }));
  }, []);

  const retireVehicle = useCallback((id: string, _note: string | null, _actorName: string) => {
    setVehicles((prev) => prev.map((v) => {
      if (v.id !== id) return v;
      if (v.status === "rented") return v;
      return { ...v, status: "retired", currentRentalId: null };
    }));
  }, []);

  const startRental = useCallback((input: StartRentalInput, actorName: string): VehicleRental | null => {
    const v = vehicles.find((x) => x.id === input.vehicleId);
    if (!v) return null;
    if (v.status === "rented" || v.status === "retired") return null;

    const created: VehicleRental = {
      id: uid("rent"),
      vehicleId: input.vehicleId,
      tenantId: v.tenantId,
      courierId: input.courierId,
      courierName: input.courierName,
      startDateIso: input.startDateIso || todayIsoLocal(),
      endDateIso: null,
      weeklyRateRon: input.weeklyRateRon,
      totalCollectedRon: 0,
      status: "active",
      endedReason: null,
      notes: input.notes,
      createdAtIso: new Date().toISOString(),
      createdBy: actorName,
    };
    setRentals((prev) => [created, ...prev]);
    setVehicles((prev) => prev.map((x) => x.id === input.vehicleId
      ? { ...x, status: "rented", currentRentalId: created.id }
      : x,
    ));
    return created;
  }, [vehicles]);

  const endRental = useCallback((input: EndRentalInput, _actorName: string) => {
    const rental = rentals.find((r) => r.id === input.rentalId);
    if (!rental || rental.status === "ended") return;
    setRentals((prev) => prev.map((r) => r.id === input.rentalId
      ? { ...r, status: "ended" as const, endDateIso: input.endDateIso, endedReason: input.reason, notes: input.notes ?? r.notes }
      : r,
    ));
    setVehicles((prev) => prev.map((v) => v.id === rental.vehicleId
      ? { ...v, status: "available" as const, currentRentalId: null }
      : v,
    ));
  }, [rentals]);

  const addRentalCollection = useCallback((rentalId: string, amountRon: number) => {
    if (!Number.isFinite(amountRon) || amountRon <= 0) return;
    setRentals((prev) => prev.map((r) => r.id === rentalId
      ? { ...r, totalCollectedRon: Math.round((r.totalCollectedRon + amountRon) * 100) / 100 }
      : r,
    ));
  }, []);

  const activeRentalOf = useCallback((vehicleId: string): VehicleRental | null => {
    return rentals.find((r) => r.vehicleId === vehicleId && r.status === "active") ?? null;
  }, [rentals]);

  const rentalHistoryOf = useCallback((vehicleId: string): VehicleRental[] => {
    return rentals
      .filter((r) => r.vehicleId === vehicleId)
      .sort((a, b) => (a.startDateIso < b.startDateIso ? 1 : -1));
  }, [rentals]);

  const rentalsForCourier = useCallback((courierId: string): VehicleRental[] => {
    return rentals
      .filter((r) => r.courierId === courierId)
      .sort((a, b) => (a.startDateIso < b.startDateIso ? 1 : -1));
  }, [rentals]);

  const value = useMemo<VehiclesContextValue>(() => ({
    hydrated,
    vehicles, fleetVehicles,
    rentals, fleetRentals,
    addVehicle, updateVehicle, deleteVehicle,
    sendToService, markAvailable, retireVehicle,
    startRental, endRental, addRentalCollection,
    activeRentalOf, rentalHistoryOf, rentalsForCourier,
  }), [
    hydrated, vehicles, fleetVehicles, rentals, fleetRentals,
    addVehicle, updateVehicle, deleteVehicle,
    sendToService, markAvailable, retireVehicle,
    startRental, endRental, addRentalCollection,
    activeRentalOf, rentalHistoryOf, rentalsForCourier,
  ]);

  return <VehiclesContext.Provider value={value}>{children}</VehiclesContext.Provider>;
}

/** KPI-uri agregate pentru cardurile din header-ul paginii Vehicule. */
export function computeFleetVehicleKpi(vehicles: FleetVehicle[], rentals: VehicleRental[]): {
  total: number;
  available: number;
  rented: number;
  service: number;
  retired: number;
  weeklyRentalIncome: number;
  itpExpiring: number;
  insuranceExpiring: number;
} {
  const total = vehicles.length;
  const available = vehicles.filter((v) => v.status === "available").length;
  const rented = vehicles.filter((v) => v.status === "rented").length;
  const service = vehicles.filter((v) => v.status === "service").length;
  const retired = vehicles.filter((v) => v.status === "retired").length;

  const activeRentals = rentals.filter((r) => r.status === "active");
  const weeklyRentalIncome = activeRentals.reduce((s, r) => s + (r.weeklyRateRon || 0), 0);

  const soonMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const isExpiringSoon = (iso: string | null): boolean => {
    if (!iso) return false;
    const t = new Date(iso + "T00:00:00Z").getTime();
    return Number.isFinite(t) && t - now <= soonMs;
  };
  const itpExpiring = vehicles.filter((v) => isExpiringSoon(v.itpExpiryIso)).length;
  const insuranceExpiring = vehicles.filter((v) => isExpiringSoon(v.insuranceExpiryIso)).length;

  return {
    total, available, rented, service, retired,
    weeklyRentalIncome: Math.round(weeklyRentalIncome * 100) / 100,
    itpExpiring, insuranceExpiring,
  };
}

export function useVehicles(): VehiclesContextValue {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error("useVehicles must be used within <VehiclesProvider>");
  return ctx;
}
