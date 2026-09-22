"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CourierStatus } from "@/lib/couriers/types";
import type { ReportPlatform } from "./facts";
import type { ReportFilterState, ReportTypeKey } from "./analytics";

// State central de filtre pentru pagina Rapoarte + sincronizare cu URL (#12, #29).
// TODO(real-users): trimite acest state la un server action `previewReport(filters)`
// care re-agregă SERVER-SIDE cu tenantId din sesiune.

export const DEFAULT_FILTERS: ReportFilterState = {
  fromIso: "2026-09-01",
  toIso: "2026-09-07",
  platforms: [],
  cities: [],
  courierStatus: "all",
  subcontractorId: "all",
  reportType: "revenue_payments",
};

type FiltersContextValue = {
  filters: ReportFilterState;
  setPeriod: (fromIso: string, toIso: string) => void;
  togglePlatform: (p: ReportPlatform) => void;
  setPlatforms: (p: ReportPlatform[]) => void;
  setCities: (c: string[]) => void;
  setCourierStatus: (s: CourierStatus | "all") => void;
  setSubcontractor: (id: string | "all") => void;
  setReportType: (t: ReportTypeKey) => void;
  patch: (p: Partial<ReportFilterState>) => void;
  reset: () => void;
  isDirty: boolean;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

const VALID_PLATFORMS: ReportPlatform[] = ["bolt", "wolt", "glovo", "other"];

function parseFromParams(sp: URLSearchParams): ReportFilterState {
  const platforms = (sp.get("platform") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ReportPlatform => (VALID_PLATFORMS as string[]).includes(s));
  const cities = (sp.get("city") ?? "")
    .split(",")
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean);
  return {
    fromIso: sp.get("from") || DEFAULT_FILTERS.fromIso,
    toIso: sp.get("to") || DEFAULT_FILTERS.toIso,
    platforms,
    cities,
    courierStatus: (sp.get("status") as CourierStatus | "all") || "all",
    subcontractorId: sp.get("sub") || "all",
    reportType: (sp.get("type") as ReportTypeKey) || DEFAULT_FILTERS.reportType,
  };
}

function toParams(f: ReportFilterState): string {
  const p = new URLSearchParams();
  if (f.fromIso !== DEFAULT_FILTERS.fromIso) p.set("from", f.fromIso);
  if (f.toIso !== DEFAULT_FILTERS.toIso) p.set("to", f.toIso);
  if (f.platforms.length) p.set("platform", f.platforms.join(","));
  if (f.cities.length) p.set("city", f.cities.map(encodeURIComponent).join(","));
  if (f.courierStatus !== "all") p.set("status", f.courierStatus);
  if (f.subcontractorId !== "all") p.set("sub", f.subcontractorId);
  if (f.reportType !== DEFAULT_FILTERS.reportType) p.set("type", f.reportType);
  return p.toString();
}

export function ReportsFilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // init din URL o singură dată
  const [filters, setFilters] = useState<ReportFilterState>(() =>
    parseFromParams(new URLSearchParams(searchParams.toString())),
  );
  const first = useRef(true);

  // scrie în URL la fiecare schimbare (fără reload, replace)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const qs = toParams(filters);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const patch = useCallback((p: Partial<ReportFilterState>) => {
    setFilters((prev) => ({ ...prev, ...p }));
  }, []);

  const value = useMemo<FiltersContextValue>(() => ({
    filters,
    setPeriod: (fromIso, toIso) => setFilters((p) => ({ ...p, fromIso, toIso })),
    togglePlatform: (pl) => setFilters((p) => ({
      ...p,
      platforms: p.platforms.includes(pl) ? p.platforms.filter((x) => x !== pl) : [...p.platforms, pl],
    })),
    setPlatforms: (pl) => setFilters((p) => ({ ...p, platforms: pl })),
    setCities: (c) => setFilters((p) => ({ ...p, cities: c })),
    setCourierStatus: (s) => setFilters((p) => ({ ...p, courierStatus: s })),
    setSubcontractor: (id) => setFilters((p) => ({ ...p, subcontractorId: id })),
    setReportType: (t) => setFilters((p) => ({ ...p, reportType: t })),
    patch,
    reset: () => setFilters({ ...DEFAULT_FILTERS }),
    isDirty:
      filters.platforms.length > 0 ||
      filters.cities.length > 0 ||
      filters.courierStatus !== "all" ||
      filters.subcontractorId !== "all" ||
      filters.fromIso !== DEFAULT_FILTERS.fromIso ||
      filters.toIso !== DEFAULT_FILTERS.toIso ||
      filters.reportType !== DEFAULT_FILTERS.reportType,
  }), [filters, patch]);

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useReportFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useReportFilters must be used within <ReportsFilterProvider>");
  return ctx;
}
