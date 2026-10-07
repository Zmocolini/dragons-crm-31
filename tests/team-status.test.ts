import assert from "node:assert/strict";
import { buildTeams, classifyCourier, type ClassifyInput } from "../src/lib/couriers/team-status";
import type { CourierRow } from "../src/lib/couriers/mock-seed";
import type { CrmDocument } from "../src/lib/documents/types";
import type { Payment } from "../src/lib/payments/types";

const NOW = Date.parse("2026-10-07");
const row = (o: Partial<CourierRow>): CourierRow => ({ id: "c", status: "active", incompleteFields: [], waitlistedPlatforms: [], ...o }) as CourierRow;
const doc = (o: Partial<CrmDocument>): CrmDocument => ({ type: "residence_permit", status: "approved", expiryIso: null, createdAtIso: "2026-01-01", ...o }) as CrmDocument;
const pay = (status: string): Payment => ({ status }) as Payment;
const input = (o: Partial<ClassifyInput> = {}): ClassifyInput => ({ docs: [doc({})], payments: [], todayMs: NOW, ...o });

// curat → ok
assert.equal(classifyCourier(row({}), input()).bucket, "ok");
// pauză/oprit nu sunt probleme, chiar cu document expirat
assert.equal(classifyCourier(row({ status: "paused" }), input({ docs: [doc({ status: "expired" })] })).bucket, "inactive");
// expirare după dată, nu doar după status
assert.equal(classifyCourier(row({}), input({ docs: [doc({ expiryIso: "2026-09-01" })] })).bucket, "error");
// permis expirat ÎNLOCUIT de unul valid nu mai e eroare
assert.equal(
  classifyCourier(row({}), input({ docs: [doc({ expiryIso: "2026-01-01", createdAtIso: "2025-01-01" }), doc({ expiryIso: "2027-01-01", createdAtIso: "2026-06-01" })] })).bucket,
  "ok",
);
// plăți: blocat și problemă = eroare; în proces nu
assert.equal(classifyCourier(row({}), input({ payments: [pay("blocked")] })).bucket, "error");
assert.equal(classifyCourier(row({}), input({ payments: [pay("issue")] })).bucket, "error");
assert.equal(classifyCourier(row({}), input({ payments: [pay("partial")] })).bucket, "ok");
// activare blocată de date lipsă = eroare, cu câmpurile în motiv
const blocked = classifyCourier(row({ status: "in_activation", incompleteFields: ["phone", "city"] }), input());
assert.equal(blocked.bucket, "error");
assert.match(blocked.reasons[0], /Telefon, Oraș activare/);
// în activare fără probleme = de activat; fără documente apare ca motiv
const toAct = classifyCourier(row({ status: "in_activation" }), input({ docs: [] }));
assert.equal(toAct.bucket, "to_activate");
assert.deepEqual(toAct.reasons, ["Fără documente încărcate"]);
// activ dar așteaptă Wolt = pending
const waiting = classifyCourier(row({ waitlistedPlatforms: ["wolt"] }), input());
assert.equal(waiting.bucket, "pending");
assert.deepEqual(waiting.reasons, ["Așteaptă Wolt"]);
// eroarea bate pending, dar motivul pending rămâne vizibil
const both = classifyCourier(row({ waitlistedPlatforms: ["glovo"] }), input({ payments: [pay("blocked")] }));
assert.equal(both.bucket, "error");
assert.deepEqual(both.reasons, ["Plată blocată", "Așteaptă Glovo"]);

// echipe: suma găleților = total, sortare cu erori întâi, echipă goală rămâne
const rows = [
  row({ id: "1", createdBy: "a" }),
  row({ id: "2", createdBy: "b", waitlistedPlatforms: ["bolt"] }),
  row({ id: "3", createdBy: "b", status: "stopped" }),
];
const teams = buildTeams(
  rows,
  (r) => ({ key: r.createdBy, label: r.createdBy.toUpperCase(), kind: "subcontractor" }),
  () => input(),
  [{ key: "z", label: "Z", kind: "subcontractor" }],
);
assert.deepEqual(teams.map((t) => t.key), ["b", "a", "z"]);
const b = teams[0];
assert.equal(b.total, 2);
assert.equal(Object.values(b.counts).reduce((x, y) => x + y, 0), b.total);
assert.deepEqual([b.counts.pending, b.counts.inactive], [1, 1]);
assert.equal(teams[2].total, 0);

console.log("team-status: OK");
