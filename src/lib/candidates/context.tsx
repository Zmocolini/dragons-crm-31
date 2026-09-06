"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { Candidate, DuplicateMatch } from "./types";

// TODO(real-users): înlocuiește localStorage cu server actions + tabela `pipeline`
// (deja există în Drizzle schema conceptuală). Duplicate detection trebuie făcut
// server-side pe phone/email normalizat, în tenantul activ.

const STORAGE_KEY = "crm31-candidates";

// Curieri existenți (seed local, doar pentru duplicate detection demo)
const MOCK_COURIERS: { id: string; name: string; phone: string; email: string | null }[] = [
  { id: "c_001", name: "Andrei Popescu",   phone: "+40 722 123 456", email: null },
  { id: "c_002", name: "Mihai Ionescu",    phone: "+40 731 987 654", email: null },
  { id: "c_003", name: "Ravi Kumar",       phone: "+40 745 111 222", email: null },
  { id: "c_004", name: "Fatima Ali",       phone: "+40 756 333 444", email: null },
  { id: "c_005", name: "Carlos Mendes",    phone: "+40 768 555 666", email: null },
];

type CandidatesContextValue = {
  candidates: Candidate[];
  addCandidate: (c: Omit<Candidate, "id" | "createdAtIso">) => Candidate;
  findDuplicates: (phone: string, email: string | null) => DuplicateMatch[];
  hydrated: boolean;
};

const CandidatesContext = createContext<CandidatesContextValue | null>(null);

function normalizePhone(p: string): string {
  return p.replace(/[\s\-().]/g, "").toLowerCase();
}

function normalizeEmail(e: string | null): string {
  return (e ?? "").trim().toLowerCase();
}

export function CandidatesProvider({ children }: { children: ReactNode }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCandidates(JSON.parse(raw) as Candidate[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    } catch {}
  }, [candidates, hydrated]);

  const addCandidate = useCallback((c: Omit<Candidate, "id" | "createdAtIso">) => {
    const created: Candidate = {
      ...c,
      id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAtIso: new Date().toISOString(),
    };
    setCandidates((prev) => [created, ...prev]);
    return created;
  }, []);

  const findDuplicates = useCallback((phone: string, email: string | null): DuplicateMatch[] => {
    const nphone = normalizePhone(phone);
    const nemail = normalizeEmail(email);
    const out: DuplicateMatch[] = [];

    if (nphone.length >= 6) {
      candidates.forEach((c) => {
        if (normalizePhone(c.phone) === nphone) {
          out.push({ matchType: "phone", entity: "candidate", id: c.id, name: c.fullName, detail: c.phone });
        }
      });
      MOCK_COURIERS.forEach((c) => {
        if (normalizePhone(c.phone) === nphone) {
          out.push({ matchType: "phone", entity: "courier", id: c.id, name: c.name, detail: c.phone });
        }
      });
    }

    if (nemail) {
      candidates.forEach((c) => {
        if (c.email && normalizeEmail(c.email) === nemail) {
          out.push({ matchType: "email", entity: "candidate", id: c.id, name: c.fullName, detail: c.email });
        }
      });
    }

    return out;
  }, [candidates]);

  const value = useMemo<CandidatesContextValue>(
    () => ({ candidates, addCandidate, findDuplicates, hydrated }),
    [candidates, addCandidate, findDuplicates, hydrated],
  );

  return <CandidatesContext.Provider value={value}>{children}</CandidatesContext.Provider>;
}

export function useCandidates() {
  const ctx = useContext(CandidatesContext);
  if (!ctx) throw new Error("useCandidates must be used within <CandidatesProvider>");
  return ctx;
}
