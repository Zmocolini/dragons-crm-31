"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { Courier, CourierDuplicateMatch } from "./types";
import { useCandidates } from "@/lib/candidates/context";

// TODO(real-users): server actions + Drizzle table `couriers`; duplicate detection
// pe phone/email normalizat server-side per tenantId.

const STORAGE_KEY = "crm31-couriers";

// Curieri existenți seed (aliniat cu duplicate detection din candidates)
const MOCK_COURIERS = [
  { id: "c_001", name: "Andrei Popescu", phone: "+40 722 123 456", email: null },
  { id: "c_002", name: "Mihai Ionescu",  phone: "+40 731 987 654", email: null },
  { id: "c_003", name: "Ravi Kumar",     phone: "+40 745 111 222", email: null },
  { id: "c_004", name: "Fatima Ali",     phone: "+40 756 333 444", email: null },
  { id: "c_005", name: "Carlos Mendes",  phone: "+40 768 555 666", email: null },
];

type CouriersContextValue = {
  couriers: Courier[];
  addCourier: (c: Omit<Courier, "id" | "createdAtIso">) => Courier;
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

export function CouriersProvider({ children }: { children: ReactNode }) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { candidates } = useCandidates();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCouriers(JSON.parse(raw) as Courier[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(couriers));
    } catch {}
  }, [couriers, hydrated]);

  const addCourier = useCallback((c: Omit<Courier, "id" | "createdAtIso">) => {
    const created: Courier = {
      ...c,
      id: `courier_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAtIso: new Date().toISOString(),
    };
    setCouriers((prev) => [created, ...prev]);
    return created;
  }, []);

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
      MOCK_COURIERS.forEach((c) => {
        if (normalizePhone(c.phone) === nphone) {
          out.push({ matchType: "phone", entity: "courier", id: c.id, name: c.name, detail: c.phone });
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
      candidates.forEach((c) => {
        if (c.email && normalizeEmail(c.email) === nemail) {
          out.push({ matchType: "email", entity: "candidate", id: c.id, name: c.fullName, detail: c.email });
        }
      });
    }

    return out;
  }, [couriers, candidates]);

  const value = useMemo<CouriersContextValue>(
    () => ({ couriers, addCourier, findDuplicates, hydrated }),
    [couriers, addCourier, findDuplicates, hydrated],
  );

  return <CouriersContext.Provider value={value}>{children}</CouriersContext.Provider>;
}

export function useCouriers() {
  const ctx = useContext(CouriersContext);
  if (!ctx) throw new Error("useCouriers must be used within <CouriersProvider>");
  return ctx;
}
