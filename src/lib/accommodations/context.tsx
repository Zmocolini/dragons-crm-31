"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/rbac/session";
import type { Accommodation, AccommodationAssignment } from "./types";
import { todayIsoLocal } from "./types";

const KEY_ACC   = "crm31-fleet-accommodations";
const KEY_ASSIG = "crm31-accommodation-assignments";

type AssignInput = {
  accommodationId: string;
  courierId: string;
  courierName: string;
  startDateIso: string;
  monthlyRateRon: number;
  notes: string | null;
};

type EndAssignmentInput = {
  assignmentId: string;
  endDateIso: string;
  reason: string | null;
  notes: string | null;
};

type AccommodationsContextValue = {
  hydrated: boolean;
  accommodations: Accommodation[];
  fleetAccommodations: Accommodation[];
  assignments: AccommodationAssignment[];
  fleetAssignments: AccommodationAssignment[];

  addAccommodation: (input: Omit<Accommodation, "id" | "createdAtIso" | "status">) => Accommodation;
  updateAccommodation: (id: string, patch: Partial<Omit<Accommodation, "id" | "createdAtIso" | "tenantId">>) => void;
  deleteAccommodation: (id: string) => { ok: boolean; reason?: string };
  sendToService: (id: string) => void;
  markActive: (id: string) => void;
  retireAccommodation: (id: string) => void;

  assignCourier: (input: AssignInput, actorName: string) => AccommodationAssignment | null;
  endAssignment: (input: EndAssignmentInput, actorName: string) => void;
  addAssignmentCollection: (assignmentId: string, amountRon: number) => void;

  activeAssignmentsOf: (accommodationId: string) => AccommodationAssignment[];
  historyOf: (accommodationId: string) => AccommodationAssignment[];
  assignmentsForCourier: (courierId: string) => AccommodationAssignment[];
  occupiedCount: (accommodationId: string) => number;
};

const AccommodationsContext = createContext<AccommodationsContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function AccommodationsProvider({ children }: { children: ReactNode }) {
  const { activeFleetId } = useSession();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [assignments, setAssignments] = useState<AccommodationAssignment[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAccommodations(safeRead<Accommodation[]>(KEY_ACC, []));
    setAssignments(safeRead<AccommodationAssignment[]>(KEY_ASSIG, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY_ACC, JSON.stringify(accommodations)); } catch {}
  }, [accommodations, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY_ASSIG, JSON.stringify(assignments)); } catch {}
  }, [assignments, hydrated]);

  const fleetAccommodations = useMemo(
    () => accommodations.filter((a) => a.tenantId === activeFleetId),
    [accommodations, activeFleetId],
  );
  const fleetAssignments = useMemo(
    () => assignments.filter((r) => r.tenantId === activeFleetId),
    [assignments, activeFleetId],
  );

  const addAccommodation = useCallback((input: Omit<Accommodation, "id" | "createdAtIso" | "status">): Accommodation => {
    const created: Accommodation = {
      ...input,
      id: uid("acc"),
      createdAtIso: new Date().toISOString(),
      status: "active",
    };
    setAccommodations((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateAccommodation = useCallback((id: string, patch: Partial<Omit<Accommodation, "id" | "createdAtIso" | "tenantId">>) => {
    setAccommodations((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const deleteAccommodation = useCallback((id: string): { ok: boolean; reason?: string } => {
    const activeCount = assignments.filter((r) => r.accommodationId === id && r.status === "active").length;
    if (activeCount > 0) return { ok: false, reason: `Nu poți șterge. ${activeCount} curieri sunt încă repartizați aici.` };
    setAccommodations((prev) => prev.filter((a) => a.id !== id));
    return { ok: true };
  }, [assignments]);

  const sendToService = useCallback((id: string) => {
    setAccommodations((prev) => prev.map((a) => a.id === id ? { ...a, status: "service" as const } : a));
  }, []);
  const markActive = useCallback((id: string) => {
    setAccommodations((prev) => prev.map((a) => a.id === id ? { ...a, status: "active" as const } : a));
  }, []);
  const retireAccommodation = useCallback((id: string) => {
    setAccommodations((prev) => prev.map((a) => a.id === id ? { ...a, status: "retired" as const } : a));
  }, []);

  const assignCourier = useCallback((input: AssignInput, actorName: string): AccommodationAssignment | null => {
    const acc = accommodations.find((a) => a.id === input.accommodationId);
    if (!acc) return null;
    if (acc.status === "retired") return null;

    const occupied = assignments.filter((r) => r.accommodationId === input.accommodationId && r.status === "active").length;
    if (occupied >= acc.totalPlaces) return null;

    const already = assignments.find((r) => r.accommodationId === input.accommodationId && r.courierId === input.courierId && r.status === "active");
    if (already) return null;

    const created: AccommodationAssignment = {
      id: uid("aa"),
      accommodationId: input.accommodationId,
      tenantId: acc.tenantId,
      courierId: input.courierId,
      courierName: input.courierName,
      startDateIso: input.startDateIso || todayIsoLocal(),
      endDateIso: null,
      monthlyRateRon: input.monthlyRateRon,
      totalCollectedRon: 0,
      status: "active",
      endedReason: null,
      notes: input.notes,
      createdAtIso: new Date().toISOString(),
      createdBy: actorName,
    };
    setAssignments((prev) => [created, ...prev]);
    return created;
  }, [accommodations, assignments]);

  const endAssignment = useCallback((input: EndAssignmentInput, _actorName: string) => {
    setAssignments((prev) => prev.map((r) => r.id === input.assignmentId
      ? { ...r, status: "ended" as const, endDateIso: input.endDateIso, endedReason: input.reason, notes: input.notes ?? r.notes }
      : r,
    ));
  }, []);

  const addAssignmentCollection = useCallback((assignmentId: string, amountRon: number) => {
    if (!Number.isFinite(amountRon) || amountRon <= 0) return;
    setAssignments((prev) => prev.map((r) => r.id === assignmentId
      ? { ...r, totalCollectedRon: Math.round((r.totalCollectedRon + amountRon) * 100) / 100 }
      : r,
    ));
  }, []);

  const activeAssignmentsOf = useCallback((accommodationId: string): AccommodationAssignment[] => {
    return assignments
      .filter((r) => r.accommodationId === accommodationId && r.status === "active")
      .sort((a, b) => (a.startDateIso < b.startDateIso ? 1 : -1));
  }, [assignments]);

  const historyOf = useCallback((accommodationId: string): AccommodationAssignment[] => {
    return assignments
      .filter((r) => r.accommodationId === accommodationId)
      .sort((a, b) => (a.startDateIso < b.startDateIso ? 1 : -1));
  }, [assignments]);

  const assignmentsForCourier = useCallback((courierId: string): AccommodationAssignment[] => {
    return assignments
      .filter((r) => r.courierId === courierId)
      .sort((a, b) => (a.startDateIso < b.startDateIso ? 1 : -1));
  }, [assignments]);

  const occupiedCount = useCallback((accommodationId: string): number => {
    return assignments.filter((r) => r.accommodationId === accommodationId && r.status === "active").length;
  }, [assignments]);

  const value = useMemo<AccommodationsContextValue>(() => ({
    hydrated,
    accommodations, fleetAccommodations,
    assignments, fleetAssignments,
    addAccommodation, updateAccommodation, deleteAccommodation,
    sendToService, markActive, retireAccommodation,
    assignCourier, endAssignment, addAssignmentCollection,
    activeAssignmentsOf, historyOf, assignmentsForCourier, occupiedCount,
  }), [
    hydrated,
    accommodations, fleetAccommodations, assignments, fleetAssignments,
    addAccommodation, updateAccommodation, deleteAccommodation,
    sendToService, markActive, retireAccommodation,
    assignCourier, endAssignment, addAssignmentCollection,
    activeAssignmentsOf, historyOf, assignmentsForCourier, occupiedCount,
  ]);

  return <AccommodationsContext.Provider value={value}>{children}</AccommodationsContext.Provider>;
}

/** KPI-uri agregate pentru cardurile din header. */
export function computeAccommodationsKpi(
  accommodations: Accommodation[],
  assignments: AccommodationAssignment[],
): {
  locations: number;
  totalPlaces: number;
  occupied: number;
  available: number;
  occupiedPct: number;
  monthlyIncome: number;
  monthlyCost: number;
  monthlyProfit: number;
  contractsExpiringSoon: number;
} {
  const locations = accommodations.length;
  const activeAccommodations = accommodations.filter((a) => a.status === "active");
  const totalPlaces = activeAccommodations.reduce((s, a) => s + a.totalPlaces, 0);
  const activeAssigns = assignments.filter((r) => r.status === "active");
  const occupied = activeAssigns.length;
  const available = Math.max(0, totalPlaces - occupied);
  const monthlyIncome = activeAssigns.reduce((s, r) => s + (r.monthlyRateRon || 0), 0);
  const monthlyCost = accommodations
    .filter((a) => a.status === "active")
    .reduce((s, a) => s + (a.monthlyRentToOwnerRon || 0), 0);

  const soonMs = 45 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const contractsExpiringSoon = accommodations.filter((a) => {
    if (!a.contractEndIso) return false;
    const t = new Date(a.contractEndIso + "T00:00:00Z").getTime();
    return Number.isFinite(t) && t - now <= soonMs;
  }).length;

  return {
    locations,
    totalPlaces,
    occupied,
    available,
    occupiedPct: totalPlaces > 0 ? Math.round((occupied / totalPlaces) * 100) : 0,
    monthlyIncome: Math.round(monthlyIncome * 100) / 100,
    monthlyCost: Math.round(monthlyCost * 100) / 100,
    monthlyProfit: Math.round((monthlyIncome - monthlyCost) * 100) / 100,
    contractsExpiringSoon,
  };
}

export function useAccommodations(): AccommodationsContextValue {
  const ctx = useContext(AccommodationsContext);
  if (!ctx) throw new Error("useAccommodations must be used within <AccommodationsProvider>");
  return ctx;
}
