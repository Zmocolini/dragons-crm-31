import type { CourierStatus } from "@/lib/couriers/types";
import {
  type DayFact,
  type FactsBundle,
  type ReportPlatform,
  type RosterCourier,
  type CourierPayState,
  REPORT_PLATFORMS,
  PLATFORM_LABEL,
} from "./facts";
import { PAID_STATUSES } from "@/lib/payments/types";

// ─────────────────────────────────────────────────────────────────────────────
// Agregări pure peste fact table. Toate componentele consumă DOAR aceste funcții,
// alimentate din același state central de filtre → un singur „adevăr" pe pagină.
// ─────────────────────────────────────────────────────────────────────────────

export type ReportTypeKey =
  | "revenue_payments"
  | "courier_performance"
  | "city_performance"
  | "platform_performance"
  | "commissions"
  | "payments_status";

export const REPORT_TYPE_LABEL: Record<ReportTypeKey, string> = {
  revenue_payments: "Venituri & Plăți",
  courier_performance: "Performanță curieri",
  city_performance: "Performanță orașe",
  platform_performance: "Platforme",
  commissions: "Comisioane",
  payments_status: "Plăți",
};

export type ReportFilterState = {
  fromIso: string;
  toIso: string;
  platforms: ReportPlatform[]; // empty = toate
  cities: string[];            // empty = toate
  courierStatus: CourierStatus | "all";
  subcontractorId: string | "all";
  reportType: ReportTypeKey;
};

// ── Perioadă ─────────────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(toIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / DAY_MS) + 1;
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00Z").getTime();
  return new Date(d + delta * DAY_MS).toISOString().slice(0, 10);
}

/** Perioada anterioară echivalentă (aceeași lungime, imediat înainte). */
export function previousPeriod(fromIso: string, toIso: string): { fromIso: string; toIso: string } {
  const len = daysBetween(fromIso, toIso);
  return { fromIso: addDays(fromIso, -len), toIso: addDays(fromIso, -1) };
}

const RO_MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Noi", "Dec"];

export function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()} ${RO_MONTHS[d.getUTCMonth()]}`;
}
export function formatPeriodRange(fromIso: string, toIso: string): string {
  const a = new Date(fromIso + "T00:00:00Z");
  const b = new Date(toIso + "T00:00:00Z");
  const dd = (d: Date) => String(d.getUTCDate()).padStart(2, "0");
  return `${dd(a)} ${RO_MONTHS[a.getUTCMonth()]} ${a.getUTCFullYear()} - ${dd(b)} ${RO_MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

// ── Filtrare ─────────────────────────────────────────────────────────────────
export function filterFacts(bundle: FactsBundle, f: ReportFilterState): DayFact[] {
  return bundle.facts.filter((fact) => {
    if (fact.dateIso < f.fromIso || fact.dateIso > f.toIso) return false;
    if (f.platforms.length > 0 && !f.platforms.includes(fact.platform)) return false;
    if (f.cities.length > 0 && !f.cities.includes(fact.city)) return false;
    if (f.subcontractorId !== "all" && fact.subcontractorId !== f.subcontractorId) return false;
    // courierStatus: facts sunt doar de la curieri activi; filtrul are efect pe roster
    return true;
  });
}

/** Curierii care trec de filtrele non-temporale (pentru KPI roster/status plăți). */
export function filterRoster(bundle: FactsBundle, f: ReportFilterState): RosterCourier[] {
  return bundle.roster.filter((c) => {
    if (f.platforms.length > 0 && !f.platforms.includes(c.platform)) return false;
    if (f.cities.length > 0 && !f.cities.includes(c.city)) return false;
    if (f.subcontractorId !== "all" && c.subcontractorId !== f.subcontractorId) return false;
    if (f.courierStatus !== "all" && c.status !== f.courierStatus) return false;
    return true;
  });
}

// ── Totaluri ─────────────────────────────────────────────────────────────────
export type Totals = {
  gross: number;
  commission: number;
  deductions: number;
  orders: number;
  net: number;         // gross - commission - deductions
  activeCouriers: number;
};

export function totalsOf(facts: DayFact[]): Totals {
  let gross = 0, commission = 0, deductions = 0, orders = 0;
  const couriers = new Set<string>();
  for (const f of facts) {
    gross += f.gross;
    commission += f.commission;
    deductions += f.deductions;
    orders += f.orders;
    couriers.add(f.courierId);
  }
  return {
    gross: r2(gross),
    commission: r2(commission),
    deductions: r2(deductions),
    orders,
    net: r2(gross - commission - deductions),
    activeCouriers: couriers.size,
  };
}

// ── KPI ──────────────────────────────────────────────────────────────────────
export type Kpi = {
  grossTotal: number;
  grossDelta: number;      // % vs perioada anterioară
  commissions: number;
  commissionPct: number;   // % din brut
  activeCouriers: number;
  rosterCouriers: number;
  activeDelta: number;
  totalOrders: number;
  ordersPerCourier: number;
  ordersDelta: number;
  paymentsMade: number;
  paymentsPct: number;     // % din brut
  paymentsDelta: number;
};

function pctDelta(current: number, prev: number): number {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return r1(((current - prev) / prev) * 100);
}

export function computeKpi(
  bundle: FactsBundle,
  f: ReportFilterState,
): Kpi {
  const cur = totalsOf(filterFacts(bundle, f));
  const prevWin = previousPeriod(f.fromIso, f.toIso);
  const prev = totalsOf(filterFacts(bundle, { ...f, fromIso: prevWin.fromIso, toIso: prevWin.toIso }));

  const roster = filterRoster(bundle, f);
  const rosterActive = roster.filter((c) => c.status === "active").length;

  // Plăți efectuate — SUM(amountPaid) pentru plățile REALE cu status paid, dintre
  // cele care intersectează fereastra filtrată (perioada plate ∩ filter window).
  const inWindow = (p: { periodStartIso: string; periodEndIso: string }) =>
    p.periodStartIso <= f.toIso && p.periodEndIso >= f.fromIso;
  const inPrevWindow = (p: { periodStartIso: string; periodEndIso: string }) =>
    p.periodStartIso <= prevWin.toIso && p.periodEndIso >= prevWin.fromIso;

  const paymentsMade = r2(
    bundle.payments
      .filter((p) => p.recipient.kind === "courier" && inWindow(p) && PAID_STATUSES.includes(p.status))
      .reduce((s, p) => s + (p.amountPaid || 0), 0),
  );
  const prevPaymentsMade = r2(
    bundle.payments
      .filter((p) => p.recipient.kind === "courier" && inPrevWindow(p) && PAID_STATUSES.includes(p.status))
      .reduce((s, p) => s + (p.amountPaid || 0), 0),
  );

  return {
    grossTotal: cur.gross,
    grossDelta: pctDelta(cur.gross, prev.gross),
    commissions: cur.commission,
    commissionPct: cur.gross > 0 ? r1((cur.commission / cur.gross) * 100) : 0,
    activeCouriers: cur.activeCouriers || rosterActive,
    rosterCouriers: roster.length,
    activeDelta: pctDelta(cur.activeCouriers, prev.activeCouriers),
    totalOrders: cur.orders,
    ordersPerCourier: cur.activeCouriers > 0 ? Math.round(cur.orders / cur.activeCouriers) : 0,
    ordersDelta: pctDelta(cur.orders, prev.orders),
    paymentsMade,
    paymentsPct: cur.gross > 0 ? Math.round((paymentsMade / cur.gross) * 100) : 0,
    paymentsDelta: pctDelta(paymentsMade, prevPaymentsMade),
  };
}

// ── Serie zilnică (line chart) ───────────────────────────────────────────────
export type RevenuePoint = { dateIso: string; label: string; gross: number; commission: number; paid: number };

export function revenueSeries(bundle: FactsBundle, f: ReportFilterState): RevenuePoint[] {
  const facts = filterFacts(bundle, f);
  const payStateById = new Map(bundle.roster.map((c) => [c.id, c.payState]));
  const byDay = new Map<string, { gross: number; commission: number; deductions: number; paid: number }>();
  for (const fact of facts) {
    const cur = byDay.get(fact.dateIso) ?? { gross: 0, commission: 0, deductions: 0, paid: 0 };
    cur.gross += fact.gross;
    cur.commission += fact.commission;
    cur.deductions += fact.deductions;
    const net = fact.gross - fact.commission - fact.deductions;
    const st = payStateById.get(fact.courierId);
    if (st === "paid") cur.paid += net;
    else if (st === "in_progress") cur.paid += net * 0.5;
    byDay.set(fact.dateIso, cur);
  }
  const days: RevenuePoint[] = [];
  const n = daysBetween(f.fromIso, f.toIso);
  for (let i = 0; i < n; i++) {
    const dateIso = addDays(f.fromIso, i);
    const v = byDay.get(dateIso) ?? { gross: 0, commission: 0, deductions: 0, paid: 0 };
    days.push({
      dateIso,
      label: formatDayLabel(dateIso),
      gross: Math.round(v.gross),
      commission: Math.round(v.commission),
      paid: Math.round(v.paid),
    });
  }
  return days;
}

// ── Distribuție pe platforme (donut) ─────────────────────────────────────────
export type DistributionMetric = "gross" | "orders" | "commission" | "payments" | "couriers";
export const DISTRIBUTION_METRIC_LABEL: Record<DistributionMetric, string> = {
  gross: "Venit brut",
  orders: "Comenzi",
  commission: "Comisioane",
  payments: "Plăți",
  couriers: "Curieri",
};

export type DonutSlice = { key: string; label: string; color: string; value: number; pct: number };

export function platformDistribution(
  bundle: FactsBundle,
  f: ReportFilterState,
  metric: DistributionMetric,
): { slices: DonutSlice[]; total: number } {
  const facts = filterFacts(bundle, f);
  const payStateById = new Map(bundle.roster.map((c) => [c.id, c.payState]));
  const acc: Record<ReportPlatform, number> = { bolt: 0, wolt: 0, glovo: 0, other: 0 };
  const courierByPlatform: Record<ReportPlatform, Set<string>> = {
    bolt: new Set(), wolt: new Set(), glovo: new Set(), other: new Set(),
  };
  for (const fact of facts) {
    courierByPlatform[fact.platform].add(fact.courierId);
    if (metric === "gross") acc[fact.platform] += fact.gross;
    else if (metric === "orders") acc[fact.platform] += fact.orders;
    else if (metric === "commission") acc[fact.platform] += fact.commission;
    else if (metric === "payments") {
      const net = fact.gross - fact.commission - fact.deductions;
      const st = payStateById.get(fact.courierId);
      if (st === "paid") acc[fact.platform] += net;
      else if (st === "in_progress") acc[fact.platform] += net * 0.5;
    }
  }
  if (metric === "couriers") {
    (["bolt", "wolt", "glovo", "other"] as ReportPlatform[]).forEach((p) => {
      acc[p] = courierByPlatform[p].size;
    });
  }
  const order: ReportPlatform[] = ["bolt", "wolt", "glovo", "other"];
  const total = order.reduce((s, p) => s + acc[p], 0);
  const slices: DonutSlice[] = order
    .map((p) => ({
      key: p,
      label: PLATFORM_LABEL[p],
      color: platformColor(p),
      value: Math.round(acc[p] * 100) / 100,
      pct: total > 0 ? Math.round((acc[p] / total) * 100) : 0,
    }))
    .filter((s) => s.value > 0);
  return { slices, total: Math.round(total * 100) / 100 };
}

// ── Top orașe ────────────────────────────────────────────────────────────────
export type CityRow = {
  city: string;
  gross: number;
  orders: number;
  commission: number;
  deductions: number;
  net: number;
  activeCouriers: number;
  avgRevenuePerCourier: number;
  ordersPerCourier: number;
};

export function cityAggregation(bundle: FactsBundle, f: ReportFilterState): CityRow[] {
  const facts = filterFacts(bundle, f);
  const map = new Map<string, { gross: number; orders: number; commission: number; deductions: number; couriers: Set<string> }>();
  for (const fact of facts) {
    const cur = map.get(fact.city) ?? { gross: 0, orders: 0, commission: 0, deductions: 0, couriers: new Set<string>() };
    cur.gross += fact.gross;
    cur.orders += fact.orders;
    cur.commission += fact.commission;
    cur.deductions += fact.deductions;
    cur.couriers.add(fact.courierId);
    map.set(fact.city, cur);
  }
  const rows: CityRow[] = Array.from(map.entries()).map(([city, v]) => ({
    city,
    gross: r2(v.gross),
    orders: v.orders,
    commission: r2(v.commission),
    deductions: r2(v.deductions),
    net: r2(v.gross - v.commission - v.deductions),
    activeCouriers: v.couriers.size,
    avgRevenuePerCourier: v.couriers.size > 0 ? Math.round(v.gross / v.couriers.size) : 0,
    ordersPerCourier: v.couriers.size > 0 ? Math.round(v.orders / v.couriers.size) : 0,
  }));
  return rows.sort((a, b) => b.gross - a.gross);
}

// ── Performanță curieri ──────────────────────────────────────────────────────
export type CourierPerfRow = {
  id: string;
  name: string;
  isReal: boolean;
  city: string;
  platform: ReportPlatform;
  status: CourierStatus;
  payState: CourierPayState;
  subcontractorName: string | null;
  orders: number;
  gross: number;
  commission: number;
  deductions: number;
  net: number;
  performanceScore: number; // 0..100
};

export function courierAggregation(bundle: FactsBundle, f: ReportFilterState): CourierPerfRow[] {
  const facts = filterFacts(bundle, f);
  const rosterById = new Map(bundle.roster.map((c) => [c.id, c]));
  const map = new Map<string, { orders: number; gross: number; commission: number; deductions: number }>();
  for (const fact of facts) {
    const cur = map.get(fact.courierId) ?? { orders: 0, gross: 0, commission: 0, deductions: 0 };
    cur.orders += fact.orders;
    cur.gross += fact.gross;
    cur.commission += fact.commission;
    cur.deductions += fact.deductions;
    map.set(fact.courierId, cur);
  }
  const maxGross = Math.max(1, ...Array.from(map.values()).map((v) => v.gross));
  const rows: CourierPerfRow[] = [];
  for (const [id, v] of map) {
    const c = rosterById.get(id);
    if (!c) continue;
    if (f.courierStatus !== "all" && c.status !== f.courierStatus) continue;
    rows.push({
      id,
      name: c.name,
      isReal: c.isReal,
      city: c.city,
      platform: c.platform,
      status: c.status,
      payState: c.payState,
      subcontractorName: c.subcontractorName,
      orders: v.orders,
      gross: r2(v.gross),
      commission: r2(v.commission),
      deductions: r2(v.deductions),
      net: r2(v.gross - v.commission - v.deductions),
      performanceScore: Math.round((v.gross / maxGross) * 100),
    });
  }
  return rows.sort((a, b) => b.gross - a.gross);
}

// ── Status plăți (donut) ─────────────────────────────────────────────────────
export type PayStatusBreakdown = {
  total: number;
  paid: number;
  inProgress: number;
  unpaid: number;
};

export function payStatusBreakdown(bundle: FactsBundle, f: ReportFilterState): PayStatusBreakdown {
  const roster = filterRoster(bundle, f).filter((c) => c.status === "active");
  let paid = 0, inProgress = 0, unpaid = 0;
  for (const c of roster) {
    if (c.payState === "paid") paid++;
    else if (c.payState === "in_progress") inProgress++;
    else unpaid++;
  }
  return { total: roster.length, paid, inProgress, unpaid };
}

// ── Situație financiară pe platformă ─────────────────────────────────────────
export type FinancialRow = {
  platform: ReportPlatform;
  label: string;
  orders: number;
  gross: number;
  commission: number;
  deductions: number;
  paid: number;
  toPay: number;
};

export function financialByPlatform(bundle: FactsBundle, f: ReportFilterState): { rows: FinancialRow[]; total: FinancialRow } {
  const facts = filterFacts(bundle, f);
  const payStateById = new Map(bundle.roster.map((c) => [c.id, c.payState]));
  const acc: Record<ReportPlatform, { orders: number; gross: number; commission: number; deductions: number; paid: number }> = {
    bolt: { orders: 0, gross: 0, commission: 0, deductions: 0, paid: 0 },
    wolt: { orders: 0, gross: 0, commission: 0, deductions: 0, paid: 0 },
    glovo: { orders: 0, gross: 0, commission: 0, deductions: 0, paid: 0 },
    other: { orders: 0, gross: 0, commission: 0, deductions: 0, paid: 0 },
  };
  for (const fact of facts) {
    const a = acc[fact.platform];
    a.orders += fact.orders;
    a.gross += fact.gross;
    a.commission += fact.commission;
    a.deductions += fact.deductions;
    const net = fact.gross - fact.commission - fact.deductions;
    const st = payStateById.get(fact.courierId);
    if (st === "paid") a.paid += net;
    else if (st === "in_progress") a.paid += net * 0.5;
  }
  const order: ReportPlatform[] = ["bolt", "wolt", "glovo", "other"];
  const rows: FinancialRow[] = order
    .map((p) => {
      const a = acc[p];
      const net = a.gross - a.commission - a.deductions;
      return {
        platform: p,
        label: PLATFORM_LABEL[p],
        orders: a.orders,
        gross: r2(a.gross),
        commission: r2(a.commission),
        deductions: r2(a.deductions),
        paid: r2(a.paid),
        toPay: r2(net - a.paid),
      };
    })
    .filter((row) => row.gross > 0 || row.orders > 0);
  const total: FinancialRow = rows.reduce(
    (t, r) => ({
      platform: "other",
      label: "Total",
      orders: t.orders + r.orders,
      gross: r2(t.gross + r.gross),
      commission: r2(t.commission + r.commission),
      deductions: r2(t.deductions + r.deductions),
      paid: r2(t.paid + r.paid),
      toPay: r2(t.toPay + r.toPay),
    }),
    { platform: "other" as ReportPlatform, label: "Total", orders: 0, gross: 0, commission: 0, deductions: 0, paid: 0, toPay: 0 },
  );
  return { rows, total };
}

// ── Comisioane (breakdown pe tip colaborare via subcontractor) ───────────────
export type CommissionRow = { key: string; label: string; base: number; commission: number; pct: number };

export function commissionBreakdown(bundle: FactsBundle, f: ReportFilterState): CommissionRow[] {
  const facts = filterFacts(bundle, f);
  let fleetGross = 0, fleetComm = 0, subGross = 0, subComm = 0;
  for (const fact of facts) {
    if (fact.subcontractorId) { subGross += fact.gross; subComm += fact.commission; }
    else { fleetGross += fact.gross; fleetComm += fact.commission; }
  }
  const mk = (key: string, label: string, base: number, commission: number): CommissionRow => ({
    key, label, base: r2(base), commission: r2(commission), pct: base > 0 ? r1((commission / base) * 100) : 0,
  });
  return [
    mk("fleet", "Comision flotă (direct)", fleetGross, fleetComm),
    mk("subcontractor", "Comision subcontractori", subGross, subComm),
    mk("total", "Total comisioane", fleetGross + subGross, fleetComm + subComm),
  ];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function platformColor(p: ReportPlatform): string {
  return { bolt: "#34d399", wolt: "#38bdf8", glovo: "#facc15", other: "#94a3b8" }[p];
}
function r2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
function r1(n: number): number { return Math.round((n + Number.EPSILON) * 10) / 10; }

export function formatRon(n: number): string {
  return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(Math.round(n))} RON`;
}
export function formatInt(n: number): string {
  return new Intl.NumberFormat("ro-RO").format(Math.round(n));
}
export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}

export { REPORT_PLATFORMS, PLATFORM_LABEL };
