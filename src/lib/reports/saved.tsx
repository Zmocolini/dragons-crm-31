"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { ReportFilterState } from "./analytics";

// Rapoarte salvate — configurații de filtre reutilizabile (localStorage per browser).
// TODO(real-users): tabel `saved_reports` cu owner_id + tenant_id, share între operatori.

export type SavedReport = {
  id: string;
  name: string;
  filters: ReportFilterState;
  createdAtIso: string;
};

const STORAGE_KEY = "crm31-saved-reports";

type SavedReportsValue = {
  reports: SavedReport[];
  hydrated: boolean;
  save: (name: string, filters: ReportFilterState) => SavedReport;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
};

const Ctx = createContext<SavedReportsValue | null>(null);

export function SavedReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setReports(JSON.parse(raw) as SavedReport[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch {}
  }, [reports, hydrated]);

  const save = useCallback((name: string, filters: ReportFilterState): SavedReport => {
    const rep: SavedReport = {
      id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || "Raport fără nume",
      filters,
      createdAtIso: new Date().toISOString(),
    };
    setReports((prev) => [rep, ...prev]);
    return rep;
  }, []);

  const rename = useCallback((id: string, name: string) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, name: name.trim() || r.name } : r)));
  }, []);

  const remove = useCallback((id: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value = useMemo<SavedReportsValue>(
    () => ({ reports, hydrated, save, rename, remove }),
    [reports, hydrated, save, rename, remove],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedReports() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSavedReports must be used within <SavedReportsProvider>");
  return ctx;
}
