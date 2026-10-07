import assert from "node:assert/strict";
import { rankUrgent, type FleetTask } from "../src/lib/tasks/types";

const now = Date.parse("2026-10-07T12:00:00Z");
const task = (id: string, priority: FleetTask["priority"], createdAtIso: string, status: FleetTask["status"] = "open"): FleetTask => ({
  id, kind: "ticket", title: id, details: "", priority, status, createdBy: "sub@x.ro", raisedBy: "Sub",
  tenantId: "t_default", createdAtIso, updatedAtIso: createdAtIso,
});

const ranked = rankUrgent(
  [
    task("normal-vechi", "normal", "2026-09-27T12:00:00Z"),   // 10 + 30 + 5 = 45
    task("urgent-azi", "urgent", "2026-10-07T10:00:00Z"),     // 100 + 0 + 5 = 105
    task("rezolvat", "urgent", "2026-09-01T12:00:00Z", "resolved"),
    task("high-in-lucru", "high", "2026-10-05T12:00:00Z", "in_progress"), // 50 + 6 = 56
  ],
  [{ courierId: "c1", courierName: "Ion", statusLabel: "În activare", days: 6 }],  // 40 + 18 = 58
  now,
);

assert.deepEqual(ranked.map((r) => r.id), ["urgent-azi", "auto_c1", "high-in-lucru", "normal-vechi"]);
assert.ok(!ranked.some((r) => r.id === "rezolvat"), "rezolvatele nu intră în urgențe");
// Dată coruptă nu dă NaN în scor.
assert.equal(rankUrgent([task("x", "normal", "nu-e-data")], [], now)[0].score, 15);
console.log("fleet-tasks ok");
