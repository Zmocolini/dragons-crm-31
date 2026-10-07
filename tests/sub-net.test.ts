import assert from "node:assert/strict";
import { subNetTotals } from "../src/lib/subcontractors/net";
import type { Payment } from "../src/lib/payments/types";
import { EMPTY_BREAKDOWN } from "../src/lib/payments/types";

const pay = (id: string, by: string, rid: string, gross: number, comm: number): Payment => ({
  id, tenantId: "t", fleetId: "f", type: "courier_pay", method: "bank_transfer", status: "paid",
  recipient: { id: rid, name: rid, city: null, platform: null, status: null, kind: "courier" },
  periodStartIso: "2026-10-01", periodEndIso: "2026-10-07", paymentDateIso: "2026-10-07",
  breakdown: { ...EMPTY_BREAKDOWN, grossRevenue: gross, fleetCommission: comm },
  amountPaid: gross - comm, totalCalculated: gross - comm, reference: null, notes: null,
  createdAtIso: "", createdBy: by, overrideReason: null,
});

const ps = [
  pay("1", "a@x.ro", "c1", 1000, 100),   // creat de cont
  pay("2", "Sistem", "c2", 500, 50),     // către curierul lui (createdBy diferit)
  pay("3", "b@x.ro", "c9", 700, 70),     // alt subcontractor
];
const r = subNetTotals(ps, "A@X.ro", new Set(["c2"]));
assert.deepEqual(r, { count: 2, gross: 1500, commission: 150, net: 1350 });
assert.equal(subNetTotals(ps, "z@x.ro", new Set()).net, 0);
console.log("sub-net ok");
