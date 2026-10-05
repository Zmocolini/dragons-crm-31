// Unește vizual perechi de plăți alese manual de user (cont-dublu).
// Rezultatul e o plată sintetică cu venitul agregat, comisionul cumulat și
// deducerile însumate. Merge-ul e doar pentru afișare — plățile originale
// rămân intacte în state.

import type { PlatformKey } from "@/lib/dashboard/types";
import type { Payment, PaymentBreakdown } from "./types";
import { areNamesEquivalent, normalizeBase } from "@/lib/utils/name-matching";
import type { DuplicateGroup } from "@/lib/subcontractors/duplicate-accounts";

/** Opțiuni de unificare aplicate la construirea plății sintetice. */
export type MergeOptions = {
  /** Taxa săptămânală (RON) aplicată o singură dată. Null = însumează per rând (fără unificare). */
  feeOnce?: number | null;
  /** Procent de comision aplicat o singură dată pe totalul brut agregat. Null = însumează per rând. */
  commissionPct?: number | null;
  /** Numele canonic al persoanei (pentru afișare în rândul merged). */
  displayName?: string;
};

function round2(n: number): number { return Math.round(n * 100) / 100; }

const BREAKDOWN_KEYS: Array<keyof PaymentBreakdown> = [
  "grossRevenue", "tips", "correction", "fleetCommission",
  "tax", "advance", "deductions", "vehicleCost", "housingCost",
  "equipmentCost", "guarantee", "penalty", "otherAdjustments",
];

export const MERGED_ID_PREFIX = "merged__";
export function isMergedPayment(id: string): boolean {
  return id.startsWith(MERGED_ID_PREFIX);
}

function mergeBreakdowns(items: Payment[]): PaymentBreakdown {
  const out = {} as PaymentBreakdown;
  for (const k of BREAKDOWN_KEYS) {
    out[k] = round2(items.reduce((s, p) => s + (p.breakdown[k] || 0), 0));
  }
  return out;
}

function pickStatus(items: Payment[]): Payment["status"] {
  const order: Payment["status"][] = ["blocked", "issue", "in_review", "partial", "unpaid", "paid"];
  for (const s of order) if (items.some((p) => p.status === s)) return s;
  return items[0]?.status ?? "in_review";
}

/**
 * Grupă în perechi/lanțuri, pornind de la o hartă bidirecțională paymentId→partnerId.
 * Ex.: A↔B ⇒ [[A, B]]. Suportă lanțuri A↔B, B↔C (deja rar în practică) → [[A,B,C]].
 */
function collectGroups(pairs: Map<string, string>): string[][] {
  const seen = new Set<string>();
  const groups: string[][] = [];
  for (const start of pairs.keys()) {
    if (seen.has(start)) continue;
    const group: string[] = [];
    const queue: string[] = [start];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      group.push(id);
      const partner = pairs.get(id);
      if (partner && !seen.has(partner)) queue.push(partner);
    }
    if (group.length > 1) groups.push(group);
  }
  return groups;
}

/**
 * Aplică perechile pe lista de plăți: fiecare pereche/lanț devine un singur
 * rând sintetic (merged). Restul plăților trec neschimbate.
 *
 * `getMergeOptions` returnează opțiunile (unifyFee, unifyCommission, commissionPct, displayName)
 * pentru un lanț de plăți pe baza id-urilor. Dacă lipsește, se folosesc valorile default:
 * fără unificare — pur și simplu sumează breakdown-urile.
 */
export function mergeDuplicatePayments(
  payments: Payment[],
  mergePairs: Map<string, string>,
  getMergeOptions?: (ids: string[]) => MergeOptions | null,
): Payment[] {
  if (mergePairs.size === 0) return payments;

  const byId = new Map(payments.map((p) => [p.id, p]));
  const groups = collectGroups(mergePairs);

  const consumed = new Set<string>();
  const merged: Payment[] = [];

  for (const ids of groups) {
    const items = ids.map((id) => byId.get(id)).filter((x): x is Payment => !!x);
    if (items.length < 2) continue;
    for (const it of items) consumed.add(it.id);

    items.sort((a, b) => (a.recipient.platform ?? "").localeCompare(b.recipient.platform ?? ""));
    const first = items[0];
    const platforms: PlatformKey[] = Array.from(new Set(
      items.flatMap((p) => p.platforms ?? (p.recipient.platform ? [p.recipient.platform] : []))
        .filter((x): x is PlatformKey => !!x),
    ));

    const opts = getMergeOptions?.(ids) ?? {};
    const displayName = opts.displayName ?? first.recipient.name;

    // Breakdown de bază: sumă simplă
    const breakdown = mergeBreakdowns(items);

    // Unificare comision: recalculat pe totalul brut cu procentul specificat, o singură dată.
    if (opts.commissionPct != null) {
      // FIX: comisionul se aplică pe brut+tips (nu doar pe grossRevenue care e fără tips).
      const totalGross = round2(items.reduce((s, p) => s + (p.breakdown.grossRevenue || 0) + (p.breakdown.tips || 0), 0));
      breakdown.fleetCommission = round2(totalGross * (opts.commissionPct / 100));
    }

    // Unificare taxă: în loc de suma din toate rândurile, folosesc valoarea specificată (RON) o singură dată,
    // dar plafonată la venitul disponibil pentru a nu trece pe minus din cauza taxei.
    if (opts.feeOnce != null) {
      const gross = round2(breakdown.grossRevenue + breakdown.tips);
      const comm = breakdown.fleetCommission || 0;
      const ded = Math.max(0, breakdown.deductions || 0);
      const otherCosts = (breakdown.vehicleCost || 0) + (breakdown.housingCost || 0) + (breakdown.equipmentCost || 0) + (breakdown.guarantee || 0) + (breakdown.penalty || 0) + (breakdown.advance || 0);
      const available = Math.max(0, round2(gross - comm - ded - otherCosts));
      breakdown.tax = Math.min(round2(opts.feeOnce), available);
    }

    // Recalculez totalul din breakdown (evită incoerențe dintre breakdown modificat și totalCalculated).
    const rawTotal = round2(
      breakdown.grossRevenue + breakdown.tips + breakdown.correction + breakdown.otherAdjustments
      - breakdown.fleetCommission - breakdown.tax - breakdown.advance - breakdown.deductions
      - breakdown.vehicleCost - breakdown.housingCost - breakdown.equipmentCost
      - breakdown.guarantee - breakdown.penalty,
    );
    const totalCalculated = Math.abs(rawTotal) < 0.001 ? 0 : rawTotal;

    merged.push({
      ...first,
      id: `${MERGED_ID_PREFIX}${items.map((p) => p.id).sort().join("__")}`,
      recipient: {
        ...first.recipient,
        name: displayName,
        platform: platforms[0] ?? first.recipient.platform,
      },
      platforms,
      breakdown,
      totalCalculated,
      amountPaid: round2(items.reduce((s, p) => s + p.amountPaid, 0)),
      status: pickStatus(items),
      reference: `merged (${items.length} conturi)`,
      commissionPercentage: opts.commissionPct != null ? opts.commissionPct : first.commissionPercentage,
    });
  }

  const passthrough = payments.filter((p) => !consumed.has(p.id));
  return [...passthrough, ...merged];
}

/**
 * Găsește toate plățile conexe (aceeași persoană/curier + aceeași săptămână),
 * fie prin aliasuri de cont dublu (ex: Magar Thapa Glovo ↔ Ahtasham Haider Bolt),
 * fie prin nume echivalente (inversate/identice), fie prin același recipient.id.
 */
export function getSiblingPaymentsForPerson(
  targetPayment: Payment | null | undefined,
  allPayments: Payment[],
  dupGroupFor: (name: string) => DuplicateGroup | null,
): Payment[] {
  if (!targetPayment) return [];

  // 1. Dacă plata țintă este un rând sintetic (merged), extragem componentele sale originale
  if (targetPayment.id.startsWith(MERGED_ID_PREFIX)) {
    const subIds = new Set(targetPayment.id.replace(MERGED_ID_PREFIX, "").split("__"));
    return allPayments.filter((p) => subIds.has(p.id));
  }

  const group = dupGroupFor(targetPayment.recipient.name);
  const targetNorm = normalizeBase(targetPayment.recipient.name);
  const aliasNorms = new Set<string>();
  if (group) {
    for (const a of group.aliases) {
      aliasNorms.add(normalizeBase(a.name));
    }
  }

  // Căutăm doar plăți din aceeași săptămână ISO
  const matches = allPayments.filter((other) => {
    if (other.recipient.kind !== "courier") return false;
    if (other.periodStartIso !== targetPayment.periodStartIso) return false;
    if (other.id === targetPayment.id) return true;

    const otherNorm = normalizeBase(other.recipient.name);

    // Potrivire cu un alias din grupul contului dublu
    if (aliasNorms.has(otherNorm)) return true;

    // Verificăm dacă celălalt curier are un grup de cont dublu care include numele curent
    const otherGroup = dupGroupFor(other.recipient.name);
    if (otherGroup) {
      if (
        otherGroup.aliases.some(
          (a) => normalizeBase(a.name) === targetNorm || areNamesEquivalent(a.name, targetPayment.recipient.name),
        )
      ) {
        return true;
      }
    }

    // Nume echivalente (ex: "Ahmed Sauod" pe ambele platforme sau nume inversate)
    if (areNamesEquivalent(other.recipient.name, targetPayment.recipient.name)) {
      return true;
    }

    // Același profil de curier dacă recipient.id există
    if (other.recipient.id && targetPayment.recipient.id && other.recipient.id === targetPayment.recipient.id) {
      return true;
    }

    return false;
  });

  // Ne asigurăm că plata țintă este inclusă în listă chiar dacă a fost sintetică
  if (!matches.some((m) => m.id === targetPayment.id)) {
    matches.unshift(targetPayment);
  }

  return matches;
}

