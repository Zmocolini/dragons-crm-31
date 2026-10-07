import { SEED_COURIERS } from "@/lib/couriers/mock-seed";
import { isNonEu } from "@/lib/candidates/types";
import {
  calculateTotal, ibanForCourier, round2,
  type Payment, type PaymentBreakdown, type PaymentStatus,
} from "./types";

// TODO(real-users): înlocuiește cu SELECT din tabelul `payments` join couriers.
// Seed-ul e DETERMINIST (derivat din id-ul curierului) — sumele NU sunt hardcodate
// din screenshot, ci calculate reproductibil, ca să fie stabile între reload-uri.

// Perioada de plată curentă: săptămâna 36 (01–07 Sep 2026), aliniat cu referința.
const PERIOD_START = "2026-09-01";
const PERIOD_END = "2026-09-07";
const PERIOD_PAY_DATE = "2026-09-08";

/** Hash determinist 32-bit. */
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** PRNG determinist (mulberry32) pornit dintr-un seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COMMISSION_BY_COLLAB: Record<string, number> = {
  collaboration: 12,
  cim_8h:        10,
  cim_4h:        10,
};

function statusFor(r: number): PaymentStatus {
  const p = Math.floor(r * 100);
  if (p < 14) return "in_review";   // De verificat
  if (p < 32) return "partial";     // În proces
  if (p < 82) return "paid";        // Plătit
  if (p < 92) return "unpaid";      // Neplătit
  if (p < 97) return "issue";       // Problemă
  return "blocked";                 // Blocat
}

/** Generează plata seed pentru un curier (o singură plată/perioadă). */
function buildPayment(courierId: string): Payment {
  const c = SEED_COURIERS.find((x) => x.id === courierId)!;
  const seed = hash(c.id);
  const rand = rng(seed);

  const ordersCount = 60 + Math.floor(rand() * 160);           // 60..220
  const avgPerOrder = 13 + rand() * 8;                          // 13..21 RON
  const grossRevenue = round2(ordersCount * avgPerOrder);
  const tips = round2(rand() * 120);
  const commissionPercentage = COMMISSION_BY_COLLAB[c.collaboration] ?? 10;
  const fleetCommission = round2((grossRevenue * commissionPercentage) / 100);

  // deduceri ocazionale, deterministe
  const equipmentCost = rand() < 0.28 ? round2(20 + rand() * 60) : 0;
  const penalty       = rand() < 0.15 ? round2(30 + rand() * 90) : 0;
  const advance       = rand() < 0.12 ? round2(100 + rand() * 200) : 0;
  const vehicleCost   = c.vehicleOwnership === "rented" ? round2(80 + rand() * 70) : 0;
  const housingCost   = isNonEu(c.nationality) && rand() < 0.5 ? round2(150 + rand() * 100) : 0;
  const tax           = round2(grossRevenue * 0.01);

  const breakdown: PaymentBreakdown = {
    grossRevenue,
    tips,
    fleetCommission,
    tax,
    advance,
    correction: 0,
    deductions: 0,
    vehicleCost,
    housingCost,
    equipmentCost,
    guarantee: 0,
    penalty,
    otherAdjustments: 0,
  };

  const totalCalculated = calculateTotal(breakdown);
  const status = statusFor(rand());

  const isPaid = status === "paid";
  const isPartial = status === "partial";
  const amountPaid = isPaid ? totalCalculated : isPartial ? round2(totalCalculated * 0.5) : 0;

  const payDay = 8 + Math.floor(rand() * 2); // 08–09 Sep
  const payHour = 9 + Math.floor(rand() * 9);
  const payMin = Math.floor(rand() * 60);
  const paidAtIso = isPaid
    ? `2026-09-${String(payDay).padStart(2, "0")}T${String(payHour).padStart(2, "0")}:${String(payMin).padStart(2, "0")}:00.000Z`
    : null;

  const hasIssue = status === "issue" || status === "blocked";

  return {
    id: `payseed_${c.id}`,
    tenantId: c.tenantId,
    fleetId: c.tenantId,
    recipient: {
      id: c.id,
      name: c.fullName,
      city: c.city,
      platform: c.platforms[0] ?? null,
      status: c.status,
      kind: "courier",
    },
    type: "courier_pay",

    periodStartIso: PERIOD_START,
    periodEndIso: PERIOD_END,
    paymentDateIso: PERIOD_PAY_DATE,
    method: "bank_transfer",
    breakdown,
    amountPaid,
    totalCalculated,
    status,
    reference: isPaid ? `TRF-${seed.toString(36).slice(0, 8).toUpperCase()}` : null,
    notes: hasIssue ? "Necesită verificare sumă / documente lipsă." : null,
    createdAtIso: "2026-09-08T08:00:00.000Z",
    createdBy: "Sistem",
    overrideReason: null,
    ordersCount,
    platforms: c.platforms,
    commissionPercentage,
    currency: "RON",
    ibanSnapshot: ibanForCourier(c.id),
    operatorName: isPaid || status === "in_review" ? "Maria Ionescu" : null,
    approvedBy: status === "paid" || status === "partial" ? "Maria Ionescu" : null,
    approvedAtIso: status === "paid" || status === "partial" ? "2026-09-08T09:15:00.000Z" : null,
    paidBy: isPaid ? "Maria Ionescu" : null,
    paidAtIso,
  };
}

/** Toate plățile seed (toate flotele; contextul filtrează pe fleetId). */
export const SEED_PAYMENTS: Payment[] = SEED_COURIERS.map((c) => buildPayment(c.id));
