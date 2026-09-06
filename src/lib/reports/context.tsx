"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { ReportRecord } from "./types";

// TODO(real-users): server table `report_exports` cu audit complet (filtre, hash rows, format).

const STORAGE_KEY = "crm31-reports-history";
const MAX_HISTORY = 50;

type ReportsContextValue = {
  history: ReportRecord[];
  addRecord: (r: Omit<ReportRecord, "id" | "createdAtIso">) => ReportRecord;
  hydrated: boolean;
};

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ReportRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as ReportRecord[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch {}
  }, [history, hydrated]);

  const addRecord = useCallback((r: Omit<ReportRecord, "id" | "createdAtIso">) => {
    const created: ReportRecord = {
      ...r,
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAtIso: new Date().toISOString(),
    };
    setHistory((prev) => [created, ...prev].slice(0, MAX_HISTORY));
    return created;
  }, []);

  const value = useMemo<ReportsContextValue>(
    () => ({ history, addRecord, hydrated }),
    [history, addRecord, hydrated],
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within <ReportsProvider>");
  return ctx;
}
