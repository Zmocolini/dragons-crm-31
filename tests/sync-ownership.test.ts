import assert from "node:assert/strict";
import { childKeysOf, decideOwner, enforceCourierStatus, LEGACY_OWNER, type AccountCheck } from "../src/lib/sync/ownership";
import { SYNC_BY_KEY, type SyncOp } from "../src/lib/sync/config";

const OWNER = { emailLc: "owner@x.ro", isGlobal: true };
const AHSAL = { emailLc: "ahsal@x.ro", isGlobal: false };
const couriers = SYNC_BY_KEY.get("crm31-couriers")!;
const patches = SYNC_BY_KEY.get("crm31-payment-patches")!;
const docs = SYNC_BY_KEY.get("crm31-documents")!;
// Conturi existente pe server: owner (global), ahsal, hussein.
const ACC: AccountCheck = {
  exists: (e) => ["owner@x.ro", "ahsal@x.ro", "hussein@x.ro"].includes(e),
  isGlobal: (e) => e === "owner@x.ro",
};
const op = (data: object | null, o: Partial<SyncOp> = {}): SyncOp =>
  ({ k: "crm31-couriers", id: "c1", kind: "list", data: data === null ? null : JSON.stringify(data), del: false, ...o });
const decide = (o: SyncOp, user: typeof OWNER, existing?: string, parent?: string, coll = couriers) => decideOwner(o, coll, user, existing, parent, ACC);
const ownerOf = (d: ReturnType<typeof decide>) => (d.kind === "write" ? d.owner : d.kind);
const dataOf = (d: ReturnType<typeof decide>) => (d.kind === "write" && d.data ? JSON.parse(d.data) : null);

// ── creare (comportament vechi, neschimbat) ──
assert.equal(ownerOf(decide(op({ createdBy: "ahsal@x.ro" }), OWNER)), "ahsal@x.ro");
assert.equal(ownerOf(decide(op({ createdBy: "Owner Nume" }), OWNER)), "owner@x.ro");
assert.equal(ownerOf(decide(op({ createdBy: "ahsal@x.ro" }), AHSAL)), "ahsal@x.ro");
assert.equal(ownerOf(decide(op({ createdBy: "altul@x.ro" }), AHSAL)), "reject");
assert.equal(ownerOf(decide(op(null, { del: true }), OWNER)), "skip");

// ── transfer: DOAR cu intenție explicită (transferFrom = proprietarul curent), DOAR Global Owner, DOAR spre un cont existent ──
let d = decide(op({ createdBy: "ahsal@x.ro", transferFrom: "owner@x.ro" }), OWNER, "owner@x.ro");
assert.deepEqual([ownerOf(d), d.kind === "write" && d.transferred], ["ahsal@x.ro", true]);
assert.equal(dataOf(d).transferFrom, undefined, "marcajul nu se stochează");
assert.equal(ownerOf(decide(op({ createdBy: " AHSAL@x.ro ", transferFrom: "OWNER@x.ro" }), OWNER, "owner@x.ro")), "ahsal@x.ro");
// înapoi
assert.equal(ownerOf(decide(op({ createdBy: "owner@x.ro", transferFrom: "ahsal@x.ro" }), OWNER, "ahsal@x.ro")), "owner@x.ro");
// STALE: alt dispozitiv al owner-ului trimite createdBy vechi FĂRĂ intenție → proprietarul rămâne, createdBy se corectează
d = decide(op({ createdBy: "ahsal@x.ro", phone: "07" }), OWNER, "hussein@x.ro");
assert.deepEqual([ownerOf(d), dataOf(d).createdBy, dataOf(d).phone], ["hussein@x.ro", "hussein@x.ro", "07"]);
// STALE cu marcaj vechi (transferFrom nu mai e proprietarul curent) → nimic nu se mută
assert.equal(ownerOf(decide(op({ createdBy: "ahsal@x.ro", transferFrom: "owner@x.ro" }), OWNER, "hussein@x.ro")), "hussein@x.ro");
// destinație inexistentă / „@" / email invalid → nu se mută
assert.equal(ownerOf(decide(op({ createdBy: "fantoma@x.ro", transferFrom: "owner@x.ro" }), OWNER, "owner@x.ro")), "owner@x.ro");
assert.equal(ownerOf(decide(op({ createdBy: "@", transferFrom: "owner@x.ro" }), OWNER, "owner@x.ro")), "owner@x.ro");
// plăți vechi cu createdBy = nume: marcajul LEGACY merge doar dacă proprietarul curent e un cont global
assert.equal(ownerOf(decide(op({ createdBy: "ahsal@x.ro", transferFrom: LEGACY_OWNER }), OWNER, "owner@x.ro")), "ahsal@x.ro");
assert.equal(ownerOf(decide(op({ createdBy: "ahsal@x.ro", transferFrom: LEGACY_OWNER }), OWNER, "hussein@x.ro")), "hussein@x.ro");
// un nume (fără @) nu mută, dar e aliniat la proprietar (altfel editările lui Ahsal ar fi respinse)
d = decide(op({ createdBy: "Sistem" }), OWNER, "ahsal@x.ro");
assert.deepEqual([ownerOf(d), dataOf(d).createdBy], ["ahsal@x.ro", "ahsal@x.ro"]);
// același proprietar = nu e transfer
assert.equal(decide(op({ createdBy: "ahsal@x.ro", transferFrom: "ahsal@x.ro" }), OWNER, "ahsal@x.ro").kind === "write", true);
// subcontractorul NU poate dărui / prelua / edita / șterge ce nu e al lui, nici cu marcaj
assert.equal(ownerOf(decide(op({ createdBy: "hussein@x.ro", transferFrom: "ahsal@x.ro" }), AHSAL, "ahsal@x.ro")), "reject");
assert.equal(ownerOf(decide(op({ createdBy: "ahsal@x.ro", transferFrom: "owner@x.ro" }), AHSAL, "owner@x.ro")), "reject");
assert.equal(ownerOf(decide(op({ createdBy: "owner@x.ro" }), AHSAL, "owner@x.ro")), "reject");
assert.equal(ownerOf(decide(op(null, { del: true }), AHSAL, "owner@x.ro")), "reject");
// marcajul trimis de subcontractor pe înregistrarea lui e ignorat și curățat
d = decide(op({ createdBy: "ahsal@x.ro", transferFrom: "x" }), AHSAL, "ahsal@x.ro");
assert.deepEqual([ownerOf(d), dataOf(d).transferFrom], ["ahsal@x.ro", undefined]);
// colecțiile „writer" nu se transferă prin createdBy
assert.equal(ownerOf(decide({ ...op({ createdBy: "ahsal@x.ro", transferFrom: "owner@x.ro" }), k: "crm31-documents" }, OWNER, "owner@x.ro", undefined, docs)), "owner@x.ro");
// ștergerea nu transferă
assert.equal(ownerOf(decide(op(null, { del: true }), OWNER, "ahsal@x.ro")), "ahsal@x.ro");

// ── copiii urmează părintele ──
assert.equal(ownerOf(decide({ ...op({ x: 1 }), k: "crm31-payment-patches" }, AHSAL, undefined, "owner@x.ro", patches)), "reject");
assert.equal(ownerOf(decide({ ...op({ x: 1 }), k: "crm31-payment-patches" }, OWNER, undefined, "ahsal@x.ro", patches)), "ahsal@x.ro");
assert.deepEqual([...childKeysOf("crm31-payments")].sort(), [
  "crm31-payment-activities", "crm31-payment-deleted", "crm31-payment-documents", "crm31-payment-notes", "crm31-payment-patches",
]);
assert.deepEqual(childKeysOf("crm31-couriers"), ["crm31-couriers-deleted"]);

// ── statusul curierului: subcontractorul creează doar „pending" și nu-l schimbă (regula flotei, acum și pe server).
// Nu respinge (s-ar pierde editarea unui dispozitiv cu date vechi): păstrează statusul stocat.
const st = (status: string, extra: object = {}) => JSON.stringify({ status, ...extra });
const statusOf = (d: string | null) => (d ? JSON.parse(d).status : null);
assert.equal(statusOf(enforceCourierStatus(AHSAL, null, st("pending"))), "pending");
assert.equal(statusOf(enforceCourierStatus(AHSAL, null, st("active"))), "pending", "creare: forțat pending");
assert.equal(statusOf(enforceCourierStatus(AHSAL, st("pending"), st("active"))), "pending", "nu se auto-activează");
assert.equal(statusOf(enforceCourierStatus(AHSAL, st("active"), st("pending", { phone: "07" }))), "active", "date vechi nu dezactivează");
assert.equal(JSON.parse(enforceCourierStatus(AHSAL, st("active"), st("pending", { phone: "07" }))!).phone, "07", "editarea rămâne");
assert.equal(enforceCourierStatus(AHSAL, st("pending"), null), null, "ștergerea trece neschimbată");
assert.equal(statusOf(enforceCourierStatus(OWNER, st("pending"), st("active"))), "active");
assert.equal(statusOf(enforceCourierStatus(OWNER, null, st("active"))), "active");
// curier stocat fără status (date vechi / scrise brut): subcontractorul nu-și pune singur „active"
assert.equal(statusOf(enforceCourierStatus(AHSAL, JSON.stringify({ phone: "1" }), st("active"))), "pending");
assert.equal(statusOf(enforceCourierStatus(AHSAL, "[1]", st("active"))), "pending");

console.log("sync-ownership: OK");
