"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import type { Courier, CourierDuplicateMatch, CourierStatus } from "./types";
import { SEED_COURIERS, type CourierRow } from "./mock-seed";
import { useAuth } from "@/lib/auth/context";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { useCandidates } from "@/lib/candidates/context";
import { saveCourierRate } from "@/lib/payments/imports";

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
      if (raw) {
        const parsed = JSON.parse(raw) as Courier[];
        const MIGRATION_PENDING_KEY = "crm31-migrated-pending-subcontractors-v2";
        const alreadyMigrated = localStorage.getItem(MIGRATION_PENDING_KEY);
        const migrated = parsed.map((c) => {
          let updated = { ...c };
          if (updated.fullName?.toLowerCase().trim() === "haani san" && (updated.commissionPct === 9 || updated.commissionPct === undefined)) {
            updated = { ...updated, commissionPct: 0, weeklyContractFeeRon: 0 };
          }
          if (!alreadyMigrated && (updated.fullName?.toLowerCase().includes("anton") || updated.createdBy?.toLowerCase().includes("anton"))) {
            updated = { ...updated, status: "pending" as CourierStatus };
          }
          return updated;
        });
        if (!alreadyMigrated) {
          try { localStorage.setItem(MIGRATION_PENDING_KEY, "1"); } catch {}
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration from localStorage; codebase-wide pattern in all providers.
        setCouriers(migrated);
      }
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

  const { current } = useAuth();
  const { scope } = useOwnerScope();
  const currentUserEmailRef = useRef<string>("");
  const currentUserRoleRef = useRef<string>("");
  const scopeEmailRef = useRef<string>("");
  useEffect(() => {
    currentUserEmailRef.current = current?.email ?? "";
    currentUserRoleRef.current = current?.role ?? "";
  }, [current]);
  useEffect(() => { scopeEmailRef.current = scope?.email.trim().toLowerCase() ?? ""; }, [scope]);

  const addCourier = useCallback((c: Omit<Courier, "id" | "createdAtIso">) => {
    // ATENȚIE: forțez createdBy = emailul proprietarului (serverul îl folosește ca owner).
    // Owner-ul cu scope pe un subcontractor creează curierul PENTRU acel subcontractor.
    const scoped = currentUserRoleRef.current === "global_owner" ? scopeEmailRef.current : "";
    const ownerEmail = scoped || currentUserEmailRef.current || c.createdBy || "";
    const nowIso = new Date().toISOString();
    const isSubcontractor = currentUserRoleRef.current === "subcontractor_owner";
    // Subcontractorii creează ÎNTOTDEAUNA curieri în status "pending" (în așteptare aprobare de la flotă)
    const courierStatus: CourierStatus = isSubcontractor ? "pending" : (c.status || "active");
    const created: Courier = {
      ...c,
      status: courierStatus,
      createdBy: ownerEmail,
      id: `courier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAtIso: nowIso,
      statusSinceIso: nowIso,
    };
    if (c.fullName && (c.commissionPct !== undefined || c.weeklyContractFeeRon !== undefined)) {
      saveCourierRate(c.fullName, {
        commissionPct: c.commissionPct,
        weeklyFeeRon: c.weeklyContractFeeRon,
      });
    }
    setCouriers((prev) => [created, ...prev]);
    return created;
  }, []);

  const updateCourier = useCallback((id: string, input: Partial<Omit<Courier, "id" | "createdAtIso" | "tenantId">>) => {
    const isSubcontractor = currentUserRoleRef.current === "subcontractor_owner";
    const safeInput = { ...input };
    // Subcontractorul NU poate modifica statusul curierului (statusul e confirmat și modificat doar de flotă)
    if (isSubcontractor && safeInput.status !== undefined) {
      delete safeInput.status;
    }
    // Proprietarul (createdBy) îl mută doar Global Owner; la subcontractor serverul ar respinge tăcut.
    if (isSubcontractor) delete safeInput.createdBy;
    setCouriers((prev) => {
      // Ceasul pending (pragul de 5 zile) pornește doar la o schimbare reală de status.
      const before = prev.find((c) => c.id === id) ?? SEED_COURIERS.find((c) => c.id === id);
      const patch = safeInput.status && before && safeInput.status !== before.status
        ? { ...safeInput, statusSinceIso: new Date().toISOString() }
        : safeInput;
      const idx = prev.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const target = prev[idx];
        if (target.fullName && (patch.commissionPct !== undefined || patch.weeklyContractFeeRon !== undefined)) {
          saveCourierRate(target.fullName, {
            commissionPct: patch.commissionPct,
            weeklyFeeRon: patch.weeklyContractFeeRon,
          });
        }
        return prev.map((c, i) => (i === idx ? { ...c, ...patch } : c));
      }
      const fromSeed = SEED_COURIERS.find((c) => c.id === id);
      if (fromSeed) {
        if (fromSeed.fullName && (patch.commissionPct !== undefined || patch.weeklyContractFeeRon !== undefined)) {
          saveCourierRate(fromSeed.fullName, {
            commissionPct: patch.commissionPct,
            weeklyFeeRon: patch.weeklyContractFeeRon,
          });
        }
        return [{ ...fromSeed, ...patch }, ...prev];
      }
      return prev;
    });
  }, []);

  const deleteCourier = useCallback((id: string) => {
    setCouriers((prev) => prev.filter((c) => c.id !== id));
    setDeletedIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  }, []);

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
