import assert from "node:assert/strict";
import { buildTestCouriers, TEST_EMAIL_DOMAIN, TEST_SUBCONTRACTORS } from "../src/lib/test-data/subcontractors";
import { pendingDays } from "../src/lib/couriers/types";

const now = Date.parse("2026-10-07T12:00:00Z");
const cs = buildTestCouriers(now, "t_default");
const of = (key: string) => cs.filter((c) => c.createdBy === TEST_SUBCONTRACTORS.find((s) => s.key === key)!.email);

assert.equal(of("ahsal").length, 5);
assert.equal(of("hossein").length, 3);
assert.equal(new Set(cs.map((c) => c.id)).size, cs.length, "id-uri unice");
// Marcaj exact: ștergerea atinge doar id-urile courier_test_* și emailurile din domeniul rezervat .test.
assert.ok(cs.every((c) => c.id.startsWith("courier_test_") && c.createdBy.endsWith(`@${TEST_EMAIL_DOMAIN}`) && c.fullName.endsWith("(test)")));
// Determinist: re-rularea suprascrie aceleași înregistrări, nu dublează.
assert.deepEqual(buildTestCouriers(0, "t_default").map((c) => c.id), cs.map((c) => c.id));
// Curierul în activare de 7 zile apare în Urgențe flotă (prag 5 zile).
assert.equal(pendingDays(cs.find((c) => c.id === "courier_test_ahsal_3")!, now), 7);
console.log("test-data ok");
