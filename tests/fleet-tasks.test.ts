import assert from "node:assert/strict";
import { normalizeTask, rankUrgent, type FleetTask } from "../src/lib/tasks/types";
import { mutateStored, STORAGE_KEY } from "../src/lib/tasks/store";

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
// Vechimea contează: la aceeași prioritate, task-ul mai vechi e mai urgent.
assert.deepEqual(rankUrgent([task("nou", "normal", "2026-10-06T12:00:00Z"), task("vechi", "normal", "2026-10-01T12:00:00Z")], [], now).map((r) => r.id), ["vechi", "nou"]);

// Granița JSON: alt client (subcontractor, versiune veche) poate scrie kind/priority necunoscute.
const weird = normalizeTask({ id: "w", createdBy: "b@x.ro", kind: "zzz", priority: "critical", status: "??", title: 5, createdAtIso: "2026-10-07T00:00:00Z" })!;
assert.equal(weird.kind, "other");
assert.equal(weird.priority, "normal");
assert.equal(weird.status, "open");
assert.equal(weird.title, "(fără titlu)");
assert.equal(normalizeTask({ id: "fara-owner" }), null, "fără createdBy nu intră");
assert.equal(normalizeTask({ id: "x", createdBy: "a@x.ro", kind: "__proto__" })!.kind, "other");
// Chiar și fără normalizare, o prioritate necunoscută nu dă NaN.
const raw = { ...task("raw", "normal", "2026-10-07T12:00:00Z"), priority: "critical" } as unknown as FleetTask;
assert.ok(Number.isFinite(rankUrgent([raw], [], now)[0].score));

// Pierdere de date: sync-ul a adus T2 în localStorage cât UI-ul ținea o stare veche fără el.
// O mutație trebuie să pornească din localStorage, nu din starea veche — altfel engine-ul trimite ștergerea lui T2.
const mem = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
mem.set(STORAGE_KEY, JSON.stringify([task("T1", "normal", "2026-10-07T10:00:00Z"), task("T2", "urgent", "2026-10-07T11:00:00Z")]));
const after = mutateStored((cur) => [task("T3", "high", "2026-10-07T12:00:00Z"), ...cur]);
assert.deepEqual(after.map((t) => t.id), ["T3", "T1", "T2"]);
assert.deepEqual((JSON.parse(mem.get(STORAGE_KEY)!) as FleetTask[]).map((t) => t.id), ["T3", "T1", "T2"]);
console.log("fleet-tasks ok");
