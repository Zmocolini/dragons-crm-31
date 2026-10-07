import assert from "node:assert/strict";
import { vatRateFor } from "../src/lib/invoices/vat";

assert.equal(vatRateFor("Moldova", true), 20);
assert.equal(vatRateFor("România", true), 21);
assert.equal(vatRateFor("Moldova", false), 0);
assert.equal(vatRateFor("România", undefined), 0);
console.log("vat ok");

import { reportBase } from "../src/lib/invoices/vat";
const pays = [
  { status: "paid", periodStartIso: "2026-09-01", periodEndIso: "2026-09-07", amountPaid: 100.105 },
  { status: "paid", periodStartIso: "2026-09-08", periodEndIso: "2026-09-14", amountPaid: 50 },
  { status: "unpaid", periodStartIso: "2026-09-01", periodEndIso: "2026-09-07", amountPaid: 999 },
  { status: "paid", periodStartIso: "2026-08-28", periodEndIso: "2026-09-03", amountPaid: 999 }, // iese din perioadă
];
assert.deepEqual(reportBase(pays, "2026-09-01", "2026-09-14"), { base: 150.11, count: 2 });
console.log("reportBase ok");
