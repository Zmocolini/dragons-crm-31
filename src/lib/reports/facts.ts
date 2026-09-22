import type { PlatformKey } from "@/lib/dashboard/types";
import type { CourierStatus } from "@/lib/couriers/types";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { Payment, PaymentBreakdown } from "@/lib/payments/types";
import { PAID_STATUSES, IN_PROGRESS_STATUSES, deductionsTotal, EMPTY_BREAKDOWN } from "@/lib/payments/types";

// ─────────────────────────────────────────────────────────────────────────
// REPORTS FACTS ENGINE — 100% derivat din date REALE:
//  • roster = curieri reali ai flotei (fără filler sintetic)
//  • facts  = plăți reale ale flotei, spărtite pe zilele perioadei lor
// Nicio valoare nu vine din RNG. Când nu ai plăți înregistrate → rapoarte goale.
// TODO(real-users): mută pe endpoint server-side (SUM(orders), SUM(gross), ...
//   GROUP BY day, platform, city, courier), tenant-scoped prin sesiune.
// ─────────────────────────────────────────────────────────────────────────

export const REPORT_PLATFORMS = ["bolt", "wolt", "glovo"] as const;
export type ReportPlatform = PlatformKey | "other";

export const PLATFORM_LABEL: Record<ReportPlatform, string> = {
  bolt: "Bolt Food",
  wolt: "Wolt",
  glovo: "Glovo",
  other: "Altele",
};

export const PLATFORM_COLOR: Record<ReportPlatform, string> = {
  bolt: "#34d399",
  wolt: "#38bdf8",
  glovo: "#facc15",
  other: "#94a3b8",
};

/** Status de plată agregat la nivel de curier pentru donut-ul „Status plăți". */
export type CourierPayState = "paid" | "in_progress" | "unpaid";

export const PAY_STATE_LABEL: Record<CourierPayState, string> = {
  paid: "Plătit",
  in_progress: "În proces",
  unpaid: "Neplătit",
};
export const PAY_STATE_COLOR: Record<CourierPayState, string> = {
  paid: "#34d399",
  in_progress: "#facc15",
  unpaid: "#f43f5e",
};

// ── Un „fapt" zilnic per curier ──────────────────────────────────────────────
export type DayFact = {
  dateIso: string;          // YYYY-MM-DD
  courierId: string;
  courierName: string;
  city: string;
  platform: ReportPlatform;
  subcontractorId: string | null;
  subcontractorName: string | null;
  status: CourierStatus;    // status curier (activ/pauză/...)
  orders: number;
  gross: number;            // RON
  commission: number;       // RON
  deductions: number;       // RON
};

/** Curier din roster-ul de rapoarte (doar reali — fără sintetici). */
export type RosterCourier = {
  id: string;
  name: string;
  city: string;
  platform: ReportPlatform;
  status: CourierStatus;
  subcontractorId: string | null;
  subcontractorName: string | null;
  isReal: boolean;
  payState: CourierPayState;
};

export type FactsBundle = {
  fleetId: string;
  roster: RosterCourier[];
  facts: DayFact[];
  /** prima și ultima zi acoperite de plăți (ISO). Când nu există plăți, ambele = azi. */
  windowStartIso: string;
  windowEndIso: string;
  /** Plățile reale ale flotei, păstrate pentru calcule KPI (ex: plăți efectuate). */
  payments: Payment[];
};

// ── Utilitare de dată ────────────────────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoAddDays(baseIso: string, delta: number): string {
  const d = new Date(baseIso + "T00:00:00Z");
  return new Date(d.getTime() + delta * DAY_MS).toISOString().slice(0, 10);
}

function daysBetweenInclusive(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T00:00:00Z").getTime();
  const end = new Date(endIso + "T00:00:00Z").getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.floor((end - start) / DAY_MS) + 1;
}

function primaryPlatform(payment: Payment, courier: RosterCourier | null): ReportPlatform {
  const list = payment.platforms && payment.platforms.length > 0
    ? payment.platforms
    : (payment.recipient.platform ? [payment.recipient.platform] : []);
  if (list.length > 0) return list[0];
  if (courier && courier.platform !== "other") return courier.platform;
  return "other";
}

// ── Construcția roster-ului (doar curieri reali) ───────────────────────────────
function buildRoster(realCouriers: CourierRow[], fleetPayments: Payment[]): RosterCourier[] {
  return realCouriers.map((c) => {
    const platform: ReportPlatform = c.platforms.length > 0 ? c.platforms[0] : "other";
    return {
      id: c.id,
      name: c.fullName,
      city: c.city,
      platform,
      status: c.status,
      subcontractorId: c.subcontractorName
        ? `sub_real_${c.subcontractorName.toLowerCase().replace(/\s+/g, "_")}`
        : null,
      subcontractorName: c.subcontractorName,
      isReal: true,
      payState: derivePayState(c.id, fleetPayments),
    };
  });
}

/** Derivă starea de plată a unui curier din plățile lui reale (cea mai recentă). */
function derivePayState(courierId: string, payments: Payment[]): CourierPayState {
  const mine = payments.filter((p) => p.recipient.id === courierId);
  if (mine.length === 0) return "unpaid";
  const latest = [...mine].sort((a, b) => (a.periodStartIso < b.periodStartIso ? 1 : -1))[0];
  if (PAID_STATUSES.includes(latest.status)) return "paid";
  if (IN_PROGRESS_STATUSES.includes(latest.status)) return "in_progress";
  return "unpaid";
}

// ── Fact table din plăți reale ────────────────────────────────────────────────────────
function buildFacts(roster: RosterCourier[], fleetPayments: Payment[]): DayFact[] {
  if (fleetPayments.length === 0) return [];
  const rosterById = new Map(roster.map((c) => [c.id, c]));
  const facts: DayFact[] = [];

  for (const p of fleetPayments) {
    if (p.recipient.kind !== "courier") continue;
    if (!p.periodStartIso || !p.periodEndIso) continue;

    const courier = rosterById.get(p.recipient.id) ?? null;
    const platform = primaryPlatform(p, courier);
    const city = p.recipient.city ?? courier?.city ?? "—";
    const status = (p.recipient.status ?? courier?.status ?? "active") as CourierStatus;
    const subcontractorId = courier?.subcontractorId ?? null;
    const subcontractorName = courier?.subcontractorName ?? null;

    const breakdown: PaymentBreakdown = p.breakdown ?? EMPTY_BREAKDOWN;
    const gross = breakdown.grossRevenue ?? 0;
    const commission = breakdown.fleetCommission ?? 0;
    const deductions = deductionsTotal(breakdown);
    const orders = p.ordersCount ?? 0;

    if (gross === 0 && commission === 0 && orders === 0) continue;

    const nDays = daysBetweenInclusive(p.periodStartIso, p.periodEndIso);
    const perDayGross = Math.round((gross / nDays) * 100) / 100;
    const perDayCommission = Math.round((commission / nDays) * 100) / 100;
    const perDayDeductions = Math.round((deductions / nDays) * 100) / 100;
    const baseOrders = Math.floor(orders / nDays);
    const remainderOrders = orders - baseOrders * nDays;

    for (let d = 0; d < nDays; d++) {
      const dateIso = isoAddDays(p.periodStartIso, d);
      const dayOrders = baseOrders + (d < remainderOrders ? 1 : 0);
      facts.push({
        dateIso,
        courierId: p.recipient.id,
        courierName: p.recipient.name,
        city,
        platform,
        subcontractorId,
        subcontractorName,
        status,
        orders: dayOrders,
        gross: perDayGross,
        commission: perDayCommission,
        deductions: perDayDeductions,
      });
    }
  }

  return facts;
}

// ── Cache per flotă (cheia include contorul plăților ca să invalideze la nou) ─
const CACHE = new Map<string, FactsBundle>();

export function getFactsBundle(
  fleetId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _targetSize: number,
  realCouriers: CourierRow[],
  fleetPayments: Payment[],
): FactsBundle {
  const key = `${fleetId}:${realCouriers.length}:${fleetPayments.length}`;
  const cached = CACHE.get(key);
  if (cached) return cached;

  const roster = buildRoster(realCouriers, fleetPayments);
  const facts = buildFacts(roster, fleetPayments);

  let windowStartIso = todayIsoLocal();
  let windowEndIso = windowStartIso;
  if (facts.length > 0) {
    const dates = facts.map((f) => f.dateIso);
    windowStartIso = dates.reduce((a, b) => (a < b ? a : b));
    windowEndIso = dates.reduce((a, b) => (a > b ? a : b));
  }

  const bundle: FactsBundle = { fleetId, roster, facts, windowStartIso, windowEndIso, payments: fleetPayments };
  CACHE.set(key, bundle);
  return bundle;
}

// Compat: păstrate pentru importuri existente. FACTS_DAYS nu mai are efect — fereastra
// se calculează din datele reale ale plăților.
export const FACTS_END_ISO = todayIsoLocal();
export const FACTS_DAYS = 120;
export const ALL_CITIES: string[] = [];
