"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useDocuments } from "./context";
import { useDocumentFilters } from "./filters-context";
import { buildRows, computeKpi, filterRows, progressByColumn, tabCounts } from "./analytics";

/**
 * Hook central pentru pagina Documente. Un singur „adevăr": roster flotă +
 * documente (seed+user) → rânduri → KPI/progres/filtrare/paginare.
 * TODO(real-users): fetch server-side deja scoped pe tenantId din sesiune.
 */
export function useDocumentsData() {
  const { user, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { fleetDocuments, hydrated } = useDocuments();
  const { filters, page, pageSize, selectedCourierId } = useDocumentFilters();

  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);
  const rowsAll = useMemo(() => buildRows(fleetCouriers, fleetDocuments), [fleetCouriers, fleetDocuments]);

  const baseFiltered = useMemo(() => filterRows(rowsAll, { ...filters, tab: "all" }), [rowsAll, filters]);
  const filtered = useMemo(() => filterRows(rowsAll, filters), [rowsAll, filters]);

  const kpi = useMemo(() => computeKpi(baseFiltered), [baseFiltered]);
  const counts = useMemo(() => tabCounts(baseFiltered), [baseFiltered]);
  const progress = useMemo(() => progressByColumn(rowsAll), [rowsAll]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(() => filtered.slice((safePage - 1) * pageSize, safePage * pageSize), [filtered, safePage, pageSize]);

  const selectedRow = useMemo(() => rowsAll.find((r) => r.courier.id === selectedCourierId) ?? null, [rowsAll, selectedCourierId]);

  const cityOptions = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.city))).sort((a, b) => a.localeCompare(b)), [fleetCouriers]);
  const nationalityOptions = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.nationality))), [fleetCouriers]);
  const subcontractorOptions = useMemo(() => Array.from(new Set(fleetCouriers.map((c) => c.subcontractorName).filter((s): s is string => !!s))).sort(), [fleetCouriers]);

  return {
    hydrated,
    rowsAll, filtered, pageRows, filteredCount: filtered.length,
    kpi, counts, progress,
    pageCount, safePage,
    selectedRow,
    cityOptions, nationalityOptions, subcontractorOptions,
    fleetName: user.activeTenant.name,
    generatedBy: user.name,
  };
}
