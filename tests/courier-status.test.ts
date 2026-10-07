import assert from "node:assert/strict";
import { pendingDays } from "../src/lib/couriers/types";

const now = Date.parse("2026-10-07T12:00:00Z");
const base = { createdAtIso: "2026-09-01T12:00:00Z" };

// Pending numără din statusSinceIso, nu de la înregistrare.
assert.equal(pendingDays({ ...base, status: "in_activation", statusSinceIso: "2026-10-01T12:00:00Z" }, now), 6);
assert.equal(pendingDays({ ...base, status: "draft", statusSinceIso: "2026-10-03T13:00:00Z" }, now), 3);
// Date vechi fără statusSinceIso → de la înregistrare.
assert.equal(pendingDays({ ...base, status: "in_activation" }, now), 36);
// Activ / pauză / oprit nu sunt pending.
for (const status of ["active", "paused", "stopped"] as const) assert.equal(pendingDays({ ...base, status }, now), null);
// Dată coruptă nu dă NaN zile.
assert.equal(pendingDays({ status: "draft", createdAtIso: "nu-e-data" }, now), null);
console.log("courier-status ok");
