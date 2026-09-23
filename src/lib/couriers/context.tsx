"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { Courier, CourierDuplicateMatch } from "./types";
import { SEED_COURIERS, type CourierRow } from "./mock-seed";
import { useAuth } from "@/lib/auth/context";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { useCandidates } from "@/lib/candidates/context";

// TODO(real-users): server actions + Drizzle table `couriers`; duplicate detection
// pe phone/email normalizat server-side per tenantId.

const STORAGE_KEY = "crm31-couriers";
const DELETED_KEY = "crm31-couriers-deleted";

type CouriersContextValue = {
  /** Curieri adăugați prin dialog în această sesiune (persistat în localStorage). */
  couriers: Courier[];
  /** Toți curierii (seed + user-added), gata de afișat în tabel. */
  allRows: CourierRow[];
  addCourier: (c: Omit<Courier, "id" | "createdAtIso">) => Courier;
  /** Modifică un curier user-added. */
  updateCourier: (id: string, patch: Partial<Omit<Courier, "id" | "createdAtIso" | "tenantId">>) => void;
  /** Șterge un curier (user-added sau seed, ascuns prin deletedIds). */
  deleteCourier: (id: string) => void;
  findDuplicates: (phone: string, email: string | null) => CourierDuplicateMatch[];
  hydrated: boolean;
};

const CouriersContext = createContext<CouriersContextValue | null>(null);

function normalizePhone(p: string): string {
  return p.replace(/[\s\-().]/g, "").toLowerCase();
}
function normalizeEmail(e: string | null): string {
  return (e ?? "").trim().toLowerCase();
}

const VEHICLE_MODEL_DEFAULT: Record<Courier["vehicleType"], string> = {
  bike:    "Bicicletă",
  e_bike:  "E-Bike",
  scooter: "Scuter",
  car:     "Autoturism",
};

/** Curier adăugat prin dialog → CourierRow cu defaulturi conservative pentru câmpurile derivate. */
function wrapUserCourier(c: Courier): CourierRow {
  // Defensive: curieri salvați cu shape mai vechi în localStorage pot lipsi câmpuri noi.
  const incomplete = Array.isArray(c.incompleteFields) ? c.incompleteFields : [];
  const missing = incomplete.length;
  const vType = c.vehicleType ?? "bike";
  return {
    ...c,
    incompleteFields: incomplete,
    vehicleType: vType,
    avatarUrl: null,
    vehicleModel: VEHICLE_MODEL_DEFAULT[vType] ?? "Vehicul",
    lastActivityIso: c.createdAtIso ?? new Date().toISOString(),
    documentsMissingCount: missing,
    documentsExpiredCount: 0,
    hasOpenIssue: false,
    hasPendingPayment: false,
    hasBlockedActivation: c.status === "in_activation" && missing > 0,
    subcontractorName: null,
  };
}

export function CouriersProvider({ children }: { children: ReactNode }) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { candidates } = useCandidates();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage; codebase-wide pattern in all providers.
      if (raw) setCouriers(JSON.parse(raw) as Courier[]);
      const rawDel = localStorage.getItem(DELETED_KEY);
      if (rawDel) setDeletedIds(JSON.parse(rawDel) as string[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(couriers));
      localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));
    } catch {}
  }, [couriers, deletedIds, hydrated]);

  const addCourier = useCallback((c: Omit<Courier, "id" | "createdAtIso">) => {
    // ATENȚIE: forțez createdBy = emailul user-ului logat ca să funcționeze filtrarea
    // per rol (subcontractor vede doar ce a creat el). Ignoră ce trimite caller-ul.
    const ownerEmail = currentUserEmailRef.current || c.createdBy || "";
    const created: Courier = {
      ...c,
      createdBy: ownerEmail,
      id: `courier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAtIso: new Date().toISOString(),
    };
    setCouriers((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateCourier = useCallback((id: string, patch: Partial<Omit<Courier, "id" | "createdAtIso" | "tenantId">>) => {
    setCouriers((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const deleteCourier = useCallback((id: string) => {
    setCouriers((prev) => prev.filter((c) => c.id !== id));
    setDeletedIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  }, []);

  const { current } = useAuth();
  const { scope } = useOwnerScope();
  const currentUserEmailRef = useRef<string>("");
  useEffect(() => { currentUserEmailRef.current = current?.email ?? ""; }, [current]);

  const allRows = useMemo<CourierRow[]>(() => {
    const all = [...couriers.map(wrapUserCourier), ...SEED_COURIERS].filter((c) => !deletedIds.includes(c.id));
    // Subcontractor: vede DOAR curierii lui.
    if (current?.role === "subcontractor_owner") {
      const myEmail = current.email.toLowerCase();
      return all.filter((c) => (c.createdBy || "").toLowerCase() === myEmail);
    }
    // Global Owner cu scope activ pe un subcontractor → vede DOAR curierii acelui subcontractor.
    if (scope) {
      const scopeEmail = scope.email.toLowerCase();
      return all.filter((c) => (c.createdBy || "").toLowerCase() === scopeEmail);
    }
    // Global Owner fără scope → vede TOT.
    return all;
  }, [couriers, deletedIds, current, scope]);

  const findDuplicates = useCallback((phone: string, email: string | null): CourierDuplicateMatch[] => {
    const nphone = normalizePhone(phone);
    const nemail = normalizeEmail(email);
    const out: CourierDuplicateMatch[] = [];

    if (nphone.length >= 6) {
      couriers.forEach((c) => {
        if (normalizePhone(c.phone) === nphone) {
          out.push({ matchType: "phone", entity: "courier", id: c.id, name: c.fullName, detail: c.phone });
        }
      });
      SEED_COURIERS.forEach((c) => {
        if (normalizePhone(c.phone) === nphone) {
          out.push({ matchType: "phone", entity: "courier", id: c.id, name: c.fullName, detail: c.phone });
        }
      });
      candidates.forEach((c) => {
        if (normalizePhone(c.phone) === nphone) {
          out.push({ matchType: "phone", entity: "candidate", id: c.id, name: c.fullName, detail: c.phone });
        }
      });
    }

    if (nemail) {
      couriers.forEach((c) => {
        if (c.email && normalizeEmail(c.email) === nemail) {
          out.push({ matchType: "email", entity: "courier", id: c.id, name: c.fullName, detail: c.email });
        }
      });
      SEED_COURIERS.forEach((c) => {
        if (c.email && normalizeEmail(c.email) === nemail) {
          out.push({ matchType: "email", entity: "courier", id: c.id, name: c.fullName, detail: c.email });
        }
      });
      candidates.forEach((c) => {
        if (c.email && normalizeEmail(c.email) === nemail) {
          out.push({ matchType: "email", entity: "candidate", id: c.id, name: c.fullName, detail: c.email });
        }
      });
    }

    return out;
  }, [couriers, candidates]);

  const value = useMemo<CouriersContextValue>(
    () => ({ couriers, allRows, addCourier, updateCourier, deleteCourier, findDuplicates, hydrated }),
    [couriers, allRows, addCourier, updateCourier, deleteCourier, findDuplicates, hydrated],
  );

  return <CouriersContext.Provider value={value}>{children}</CouriersContext.Provider>;
}

export function useCouriers() {
  const ctx = useContext(CouriersContext);
  if (!ctx) throw new Error("useCouriers must be used within <CouriersProvider>");
  return ctx;
}
