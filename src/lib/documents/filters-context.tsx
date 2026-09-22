"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PlatformKey } from "@/lib/dashboard/types";
import type { Nationality } from "@/lib/candidates/types";
import { EMPTY_DOC_FILTERS, type DocFilterState, type DocStatusTab } from "./analytics";
import type { CourierDocStatus, DocColumnKey } from "./rules";

// State central + URL sync (#45). TODO(real-users): trimite la server pentru filtrare reală.

type FiltersValue = {
  filters: DocFilterState;
  patch: (p: Partial<DocFilterState>) => void;
  setTab: (t: DocStatusTab) => void;
  setSearch: (s: string) => void;
  togglePlatform: (p: PlatformKey) => void;
  toggleCity: (c: string) => void;
  toggleNationality: (n: Nationality) => void;
  reset: () => void;
  isDirty: boolean;
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  selectedCourierId: string | null;
  setSelectedCourierId: (id: string | null) => void;
};

const Ctx = createContext<FiltersValue | null>(null);

const PLATFORMS: PlatformKey[] = ["bolt", "wolt", "glovo"];
const NATS: Nationality[] = ["ro", "eu", "non_eu"];

function parse(sp: URLSearchParams): { filters: DocFilterState; page: number; pageSize: number; courier: string | null } {
  const list = (k: string) => (sp.get(k) ?? "").split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean);
  return {
    filters: {
      ...EMPTY_DOC_FILTERS,
      search: sp.get("q") ?? "",
      platforms: list("platform").filter((p): p is PlatformKey => (PLATFORMS as string[]).includes(p)),
      cities: list("city"),
      nationalities: list("nat").filter((n): n is Nationality => (NATS as string[]).includes(n)),
      status: (sp.get("status") as CourierDocStatus | "all") || "all",
      tab: (sp.get("tab") as DocStatusTab) || "all",
      docColumn: (sp.get("col") as DocColumnKey | "all") || "all",
      subcontractor: sp.get("sub") || "all",
      onlyActive: sp.get("active") === "1",
    },
    page: Math.max(1, Number(sp.get("page") || 1)),
    pageSize: [10, 25, 50, 100].includes(Number(sp.get("rows"))) ? Number(sp.get("rows")) : 10,
    courier: sp.get("courier"),
  };
}

function toQs(f: DocFilterState, page: number, pageSize: number, courier: string | null): string {
  const p = new URLSearchParams();
  if (f.search) p.set("q", f.search);
  if (f.platforms.length) p.set("platform", f.platforms.join(","));
  if (f.cities.length) p.set("city", f.cities.map(encodeURIComponent).join(","));
  if (f.nationalities.length) p.set("nat", f.nationalities.join(","));
  if (f.status !== "all") p.set("status", f.status);
  if (f.tab !== "all") p.set("tab", f.tab);
  if (f.docColumn !== "all") p.set("col", f.docColumn);
  if (f.subcontractor !== "all") p.set("sub", f.subcontractor);
  if (f.onlyActive) p.set("active", "1");
  if (page > 1) p.set("page", String(page));
  if (pageSize !== 10) p.set("rows", String(pageSize));
  if (courier) p.set("courier", courier);
  return p.toString();
}

export function DocumentsFilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = useMemo(() => parse(new URLSearchParams(searchParams.toString())), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [filters, setFilters] = useState<DocFilterState>(initial.filters);
  const [page, setPageState] = useState(initial.page);
  const [pageSize, setPageSizeState] = useState(initial.pageSize);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(initial.courier);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const qs = toQs(filters, page, pageSize, selectedCourierId);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, page, pageSize, selectedCourierId, pathname, router]);

  const patch = useCallback((p: Partial<DocFilterState>) => { setFilters((prev) => ({ ...prev, ...p })); setPageState(1); }, []);

  const value = useMemo<FiltersValue>(() => ({
    filters, patch,
    setTab: (t) => { setFilters((p) => ({ ...p, tab: t })); setPageState(1); },
    setSearch: (s) => { setFilters((p) => ({ ...p, search: s })); setPageState(1); },
    togglePlatform: (pl) => { setFilters((p) => ({ ...p, platforms: p.platforms.includes(pl) ? p.platforms.filter((x) => x !== pl) : [...p.platforms, pl] })); setPageState(1); },
    toggleCity: (c) => { setFilters((p) => ({ ...p, cities: p.cities.includes(c) ? p.cities.filter((x) => x !== c) : [...p.cities, c] })); setPageState(1); },
    toggleNationality: (n) => { setFilters((p) => ({ ...p, nationalities: p.nationalities.includes(n) ? p.nationalities.filter((x) => x !== n) : [...p.nationalities, n] })); setPageState(1); },
    reset: () => { setFilters({ ...EMPTY_DOC_FILTERS }); setPageState(1); },
    isDirty:
      filters.search !== "" || filters.platforms.length > 0 || filters.cities.length > 0 ||
      filters.nationalities.length > 0 || filters.status !== "all" || filters.tab !== "all" ||
      filters.docColumn !== "all" || filters.subcontractor !== "all" || filters.onlyActive,
    page, setPage: setPageState, pageSize, setPageSize: (n) => { setPageSizeState(n); setPageState(1); },
    selectedCourierId, setSelectedCourierId,
  }), [filters, patch, page, pageSize, selectedCourierId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDocumentFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDocumentFilters must be used within <DocumentsFilterProvider>");
  return ctx;
}
