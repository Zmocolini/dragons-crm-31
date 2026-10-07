import assert from "node:assert/strict";
import { childKeysOf, decideOwner } from "../src/lib/sync/ownership";
import { SYNC_BY_KEY, type SyncOp } from "../src/lib/sync/config";

const OWNER = { emailLc: "owner@x.ro", isGlobal: true };
const AHSAL = { emailLc: "ahsal@x.ro", isGlobal: false };
const couriers = SYNC_BY_KEY.get("crm31-couriers")!;
const patches = SYNC_BY_KEY.get("crm31-payment-patches")!;
const docs = SYNC_BY_KEY.get("crm31-documents")!;
const op = (createdBy: string, o: Partial<SyncOp> = {}): SyncOp =>
  ({ k: "crm31-couriers", id: "c1", kind: "list", data: JSON.stringify({ createdBy }), del: false, ...o });

// ── creare (comportament vechi, neschimbat) ──
assert.deepEqual(decideOwner(op("ahsal@x.ro"), couriers, OWNER, undefined, undefined), { kind: "write", owner: "ahsal@x.ro", transferred: false });
assert.deepEqual(decideOwner(op("Owner Nume"), couriers, OWNER, undefined, undefined), { kind: "write", owner: "owner@x.ro", transferred: false });
assert.deepEqual(decideOwner(op("ahsal@x.ro"), couriers, AHSAL, undefined, undefined), { kind: "write", owner: "ahsal@x.ro", transferred: false });
assert.equal(decideOwner(op("altul@x.ro"), couriers, AHSAL, undefined, undefined).kind, "reject");
assert.equal(decideOwner(op("", { del: true }), couriers, OWNER, undefined, undefined).kind, "skip");

// ── transfer: DOAR Global Owner, DOAR spre un email, DOAR pe colecții createdBy ──
assert.deepEqual(decideOwner(op("ahsal@x.ro"), couriers, OWNER, "owner@x.ro", undefined), { kind: "write", owner: "ahsal@x.ro", transferred: true });
assert.deepEqual(decideOwner(op("AHSAL@x.ro "), couriers, OWNER, "owner@x.ro", undefined), { kind: "write", owner: "ahsal@x.ro", transferred: true });
// și înapoi
assert.deepEqual(decideOwner(op("owner@x.ro"), couriers, OWNER, "ahsal@x.ro", undefined), { kind: "write", owner: "owner@x.ro", transferred: true });
// un nume (fără @) nu mută nimic: plățile vechi cu createdBy = „Sistem" rămân unde sunt
assert.deepEqual(decideOwner(op("Sistem"), couriers, OWNER, "ahsal@x.ro", undefined), { kind: "write", owner: "ahsal@x.ro", transferred: false });
// același proprietar = nu e transfer
assert.deepEqual(decideOwner(op("ahsal@x.ro"), couriers, OWNER, "ahsal@x.ro", undefined), { kind: "write", owner: "ahsal@x.ro", transferred: false });
// subcontractorul NU poate dărui înregistrarea lui altcuiva
assert.equal(decideOwner(op("hussein@x.ro"), couriers, AHSAL, "ahsal@x.ro", undefined).kind, "reject");
// și nu poate atinge înregistrarea altcuiva
assert.equal(decideOwner(op("ahsal@x.ro"), couriers, AHSAL, "owner@x.ro", undefined).kind, "reject");
// …nici păstrând createdBy-ul original (editare a înregistrării altcuiva)
assert.equal(decideOwner(op("owner@x.ro"), couriers, AHSAL, "owner@x.ro", undefined).kind, "reject");
// …nici ștergând-o
assert.equal(decideOwner(op("", { del: true, data: null }), couriers, AHSAL, "owner@x.ro", undefined).kind, "reject");
// colecțiile „writer" nu se transferă prin createdBy
const docOp = { ...op("ahsal@x.ro"), k: "crm31-documents" };
assert.deepEqual(decideOwner(docOp, docs, OWNER, "owner@x.ro", undefined), { kind: "write", owner: "owner@x.ro", transferred: false });
// ștergerea nu transferă
assert.deepEqual(decideOwner(op("", { del: true, data: null }), couriers, OWNER, "ahsal@x.ro", undefined), { kind: "write", owner: "ahsal@x.ro", transferred: false });

// ── copiii urmează părintele ──
assert.deepEqual(decideOwner({ ...op("x"), k: "crm31-payment-patches" }, patches, AHSAL, undefined, "owner@x.ro").kind, "reject");
assert.deepEqual(decideOwner({ ...op("x"), k: "crm31-payment-patches" }, patches, OWNER, undefined, "ahsal@x.ro"), { kind: "write", owner: "ahsal@x.ro", transferred: false });
assert.deepEqual([...childKeysOf("crm31-payments")].sort(), [
  "crm31-payment-activities", "crm31-payment-deleted", "crm31-payment-documents", "crm31-payment-notes", "crm31-payment-patches",
]);
assert.deepEqual(childKeysOf("crm31-couriers"), ["crm31-couriers-deleted"]);

console.log("sync-ownership: OK");
