"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { usePayments } from "@/lib/payments/context";
import { getFactsBundle } from "./facts";
import { useReportFilters } from "./filters-context";
import {
  cityAggregation, commissionBreakdown, computeKpi, courierAggregation,
  financialByPlatform, payStatusBreakdown, platformDistribution, revenueSeries,
  filterRoster,
  type DistributionMetric,
} from "./analytics";

/**
 * Hook central: construiește fact table-ul flotei active și expune agregările.
 * Toate componentele consumă DE AICI → un singur „adevăr" alimentat de filtrele centrale.
 * TODO(real-users): schimbă getFactsBundle cu un fetch la un endpoint de analytics
 * (deja tenant-scoped server-side prin sesiune).
 */
export function useReportData(distributionMetric: DistributionMetric = "gross") {
  const { user, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { fleetPayments } = usePayments();
  const { filters } = useReportFilters();

  const fleetCouriers = useMemo(
    () => allRows.filter((c) => c.tenantId === activeFleetId),
    [allRows, activeFleetId],
  );

  const targetSize = user.activeTenant.planUsage.used;

  const bundle = useMemo(
    () => getFactsBundle(activeFleetId, targetSize, fleetCouriers, fleetPayments),
    [activeFleetId, targetSize, fleetCouriers, fleetPayments],
  );

  const kpi = useMemo(() => computeKpi(bundle, filters), [bundle, filters]);
  const series = useMemo(() => revenueSeries(bundle, filters), [bundle, filters]);
  const distribution = useMemo(
    () => platformDistribution(bundle, filters, distributionMetric),
    [bundle, filters, distributionMetric],
  );
  const cities = useMemo(() => cityAggregation(bundle, filters), [bundle, filters]);
  const couriers = useMemo(() => courierAggregation(bundle, filters), [bundle, filters]);
  const payStatus = useMemo(() => payStatusBreakdown(bundle, filters), [bundle, filters]);
  const financial = useMemo(() => financialByPlatform(bundle, filters), [bundle, filters]);
  const commissions = useMemo(() => commissionBreakdown(bundle, filters), [bundle, filters]);
  const roster = useMemo(() => filterRoster(bundle, filters), [bundle, filters]);

  // liste pentru dropdown-uri filtre (din roster-ul flotei)
  const cityOptions = useMemo(
    () => Array.from(new Set(bundle.roster.map((c) => c.city))).sort((a, b) => a.localeCompare(b)),
    [bundle],
  );
  const subcontractorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of bundle.roster) if (c.subcontractorId && c.subcontractorName) map.set(c.subcontractorId, c.subcontractorName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [bundle]);

  return {
    bundle, filters,
    kpi, series, distribution, cities, couriers, payStatus, financial, commissions, roster,
    cityOptions, subcontractorOptions,
    fleetName: user.activeTenant.name,
    generatedBy: user.name,
  };
}
