import type { Payment } from "@/lib/payments/types";
import { round2 } from "@/lib/payments/types";

export type SubNet = { count: number; gross: number; commission: number; net: number };

/**
 * Suma trimisă unui subcontractor, DUPĂ comision: plățile lui (create de contul lui sau
 * către curierii lui), net = totalCalculated (brut + tips − comision − deduceri din breakdown).
 */
export function subNetTotals(payments: Payment[], email: string, courierIds: ReadonlySet<string>): SubNet {
  const mail = email.toLowerCase();
  let count = 0, gross = 0, commission = 0, net = 0;
  for (const p of payments) {
    if (p.type !== "courier_pay" && p.type !== "subcontractor_pay") continue;
    if ((p.createdBy || "").toLowerCase() !== mail && !courierIds.has(p.recipient.id)) continue;
    count += 1;
    gross += p.breakdown.grossRevenue || 0;
    commission += p.breakdown.fleetCommission || 0;
    net += p.totalCalculated || 0;
  }
  return { count, gross: round2(gross), commission: round2(commission), net: round2(net) };
}
