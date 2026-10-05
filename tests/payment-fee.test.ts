import assert from "node:assert/strict";
import { sanitizePaymentFee } from "../src/lib/payments/context";
import { calculateTotal, type Payment, type PaymentBreakdown } from "../src/lib/payments/types";

const bd = (o: Partial<PaymentBreakdown>): PaymentBreakdown => ({
  grossRevenue: 0, tips: 0, correction: 0, fleetCommission: 0, tax: 0, advance: 0, deductions: 0,
  vehicleCost: 0, housingCost: 0, equipmentCost: 0, guarantee: 0, penalty: 0, otherAdjustments: 0, ...o,
});
const run = (o: Partial<PaymentBreakdown>) => {
  const b = bd(o);
  const p = { breakdown: b, totalCalculated: calculateTotal(b), notes: null } as unknown as Payment;
  return sanitizePaymentFee(p);
};

// negativ: corecția/ajustările se păstrează (bug: erau ignorate)
assert.equal(run({ grossRevenue: 100, deductions: 150, correction: 30 }).totalCalculated, -20);
assert.equal(run({ grossRevenue: 100, deductions: 150, otherAdjustments: -5 }).totalCalculated, -55);
// negativ: comision și taxă se anulează
const neg = run({ grossRevenue: 100, deductions: 150, fleetCommission: 10, tax: 5 });
assert.equal(neg.breakdown.fleetCommission, 0);
assert.equal(neg.breakdown.tax, 0);
assert.equal(neg.totalCalculated, -50);
// egal => 0
assert.equal(run({ grossRevenue: 17.61, deductions: 17.61, fleetCommission: 3 }).totalCalculated, 0);
// pozitiv: comision plafonat la disponibil, fără modificare când încape
assert.equal(run({ grossRevenue: 100, fleetCommission: 10, tax: 5 }).totalCalculated, 85);
assert.equal(run({ grossRevenue: 100, deductions: 95, fleetCommission: 10 }).breakdown.fleetCommission, 5);
console.log("payment-fee: OK");
