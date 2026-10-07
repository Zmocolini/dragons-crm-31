import assert from "node:assert/strict";
import { planActivation } from "../src/lib/couriers/activation";
import { needsConfirm } from "../src/lib/ai/tools";

const c = (id: string, o: object = {}) => ({ id, fullName: id.toUpperCase(), status: "pending", platforms: ["bolt"], waitlistedPlatforms: [], incompleteFields: [], ...o }) as never;
const rows = [
  c("p1"),
  c("p2", { status: "in_activation", incompleteFields: ["phone"] }),
  c("a1", { status: "active", waitlistedPlatforms: ["wolt"] }),
  c("r1", { status: "rejected" }),
  c("seed", { status: "pending" }),
];
const editable = (id: string) => id !== "seed";
const OWNER = { isGlobalOwner: true, editable };
const SUB = { isGlobalOwner: false, editable };

// activare de status: pending + în activare → active; activ sărit; seed sărit; id necunoscut sărit
let p = planActivation(rows, ["p1", "p2", "a1", "seed", "zz", "p1"], { action: "activate", ...OWNER });
assert.deepEqual(p.patches, [{ id: "p1", patch: { status: "active" } }, { id: "p2", patch: { status: "active" } }]);
assert.deepEqual(p.done.map((d) => d.id), ["p1", "p2"]);
assert.equal(p.done[1].warning, "date lipsă: phone");
assert.deepEqual(p.skipped.map((x) => [x.id, x.reason]), [["a1", "deja activ"], ["seed", "curier demo (seed), nu se editează"], ["zz", "nu e în flota ta"]]);

// activare pe platforma pe care așteaptă
p = planActivation(rows, ["a1", "p1"], { action: "activate", platform: "wolt", ...OWNER });
assert.deepEqual(p.patches, [{ id: "a1", patch: { waitlistedPlatforms: [], platforms: ["bolt", "wolt"] } }]);
assert.deepEqual(p.skipped.map((x) => x.reason), ["nu așteaptă loc pe wolt"]);
// subcontractorul poate activa pe platformă (nu e schimbare de status)…
assert.equal(planActivation(rows, ["a1"], { action: "activate", platform: "wolt", ...SUB }).patches.length, 1);
// …dar nu poate schimba statusul și nici respinge
assert.throws(() => planActivation(rows, ["p1"], { action: "activate", ...SUB }), /Doar flota/);
assert.throws(() => planActivation(rows, ["p1"], { action: "reject", ...SUB }), /Doar flota/);

// respingere: nu pe activi, nu de două ori
p = planActivation(rows, ["p1", "a1", "r1"], { action: "reject", ...OWNER });
assert.deepEqual(p.patches, [{ id: "p1", patch: { status: "rejected" } }]);
assert.deepEqual(p.skipped.map((x) => x.id), ["a1", "r1"]);

// poarta de confirmare a AI-ului: orice schimbare de status cere click
for (const t of ["activate_couriers", "reject_couriers", "remove_from_waitlist", "delete_courier"]) assert.equal(needsConfirm(t, {}), true, t);
assert.equal(needsConfirm("update_courier", { id: "x", patch: { status: "active" } }), true);
assert.equal(needsConfirm("update_courier", { id: "x", patch: { phone: "07" } }), false);
assert.equal(needsConfirm("update_courier", { id: "x", patch: { status: " " } }), false);
assert.equal(needsConfirm("find_couriers", {}), false);
// crearea cu status explicit (ex. direct „active") cere click; fără status nu
assert.equal(needsConfirm("create_courier", { fullName: "X", city: "Iasi", status: "active" }), true);
assert.equal(needsConfirm("create_courier", { fullName: "X", city: "Iasi" }), false);

console.log("activation: OK");
