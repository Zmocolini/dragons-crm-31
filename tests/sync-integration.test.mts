// applyOps/readRows pe un SQLite temporar: transferul de proprietar, refuzurile și regula de status, cu SQL-ul real.
// Rulează cu `tsx --conditions=react-server` (server.ts importă `server-only`).
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "crm31-sync-"));
process.env.TURSO_DATABASE_URL = "file:" + join(dir, "t.db");
const { applyOps, readRows, ensureSyncTable } = await import("../src/lib/sync/server");
const { rawDb } = await import("../src/lib/db/client");

const OWNER = { id: "o", email: "owner@x.ro", name: "O", role: "global_owner", emailLc: "owner@x.ro", isGlobal: true } as never;
const AHSAL = { id: "a", email: "ahsal@x.ro", name: "A", role: "subcontractor_owner", emailLc: "ahsal@x.ro", isGlobal: false } as never;
const pay = (data: object) => ({ k: "crm31-payments", id: "p1", kind: "list", data: JSON.stringify({ amount: 1, ...data }), del: false });
const patch = { k: "crm31-payment-patches", id: "p1", kind: "map", data: JSON.stringify({ amountPaid: 5 }), del: false };
const cour = (id: string, data: object) => ({ k: "crm31-couriers", id, kind: "list", data: JSON.stringify(data), del: false });
const seen = async (who: never, id: string) => (await readRows(who, 0)).filter((x) => x.id === id).map((x) => x.k).sort();
const stored = async (k: string, id: string) => {
  const r = await rawDb.execute({ sql: "SELECT owner, data FROM crm_records WHERE k = ? AND id = ?", args: [k, id] });
  return { owner: String(r.rows[0].owner), data: JSON.parse(String(r.rows[0].data)) };
};

try {
  await ensureSyncTable();
  for (const [id, email, role] of [["o", "owner@x.ro", "global_owner"], ["a", "ahsal@x.ro", "subcontractor_owner"], ["h", "hussein@x.ro", "subcontractor_owner"]]) {
    await rawDb.execute({ sql: "INSERT OR REPLACE INTO users (id, email, password_hash, role, name, active) VALUES (?, ?, 'x', ?, ?, 1)", args: [id, email, role, id] });
  }

  // ── transfer cu intenție explicită ──
  assert.deepEqual((await applyOps(OWNER, [pay({ createdBy: "Sistem" }), patch])).rejected, []);
  assert.deepEqual(await seen(AHSAL, "p1"), [], "Ahsal nu vede plata owner-ului");
  assert.equal((await applyOps(AHSAL, [pay({ createdBy: "ahsal@x.ro" })])).rejected.length, 1, "subcontractorul nu își ia singur plata");
  assert.deepEqual((await applyOps(OWNER, [pay({ createdBy: "ahsal@x.ro", transferFrom: "*" })])).rejected, [], "owner transferă (plată veche, createdBy = nume)");
  assert.deepEqual(await seen(AHSAL, "p1"), ["crm31-payment-patches", "crm31-payments"], "plata + patch-ul ajung la Ahsal");
  assert.equal((await stored("crm31-payments", "p1")).data.transferFrom, undefined, "marcajul nu se stochează");
  assert.equal((await applyOps(AHSAL, [pay({ createdBy: "hussein@x.ro" })])).rejected.length, 1, "Ahsal nu o poate da altcuiva");

  // ── STALE: alt dispozitiv al owner-ului, cu createdBy vechi și fără marcaj, NU anulează transferul ──
  await applyOps(OWNER, [cour("c7", { createdBy: "ahsal@x.ro", status: "active", phone: "1" })]);
  await applyOps(OWNER, [cour("c7", { createdBy: "hussein@x.ro", transferFrom: "ahsal@x.ro", status: "active", phone: "1" })]);
  await applyOps(OWNER, [cour("c7", { createdBy: "ahsal@x.ro", status: "active", phone: "2" })]);
  let c7 = await stored("crm31-couriers", "c7");
  assert.deepEqual([c7.owner, c7.data.createdBy, c7.data.phone], ["hussein@x.ro", "hussein@x.ro", "2"], "editarea trece, proprietarul rămâne Hussein");
  // același lucru cu un marcaj vechi (from = fostul proprietar)
  await applyOps(OWNER, [cour("c7", { createdBy: "ahsal@x.ro", transferFrom: "owner@x.ro", status: "active" })]);
  assert.equal((await stored("crm31-couriers", "c7")).owner, "hussein@x.ro");
  // spre un cont inexistent → nu se mută
  await applyOps(OWNER, [cour("c7", { createdBy: "fantoma@x.ro", transferFrom: "hussein@x.ro", status: "active" })]);
  assert.equal((await stored("crm31-couriers", "c7")).owner, "hussein@x.ro");

  // ── statusul: subcontractorul nu se auto-activează nici prin POST direct ──
  await applyOps(AHSAL, [cour("c9", { createdBy: "ahsal@x.ro", status: "active" })]);
  assert.equal((await stored("crm31-couriers", "c9")).data.status, "pending", "creat de subcontractor = pending");
  await applyOps(AHSAL, [cour("c9", { createdBy: "ahsal@x.ro", status: "active", phone: "9" })]);
  c7 = await stored("crm31-couriers", "c9");
  assert.deepEqual([c7.data.status, c7.data.phone], ["pending", "9"], "status păstrat, editarea trece");
  await applyOps(OWNER, [cour("c9", { createdBy: "ahsal@x.ro", status: "active", phone: "9" })]);
  assert.equal((await stored("crm31-couriers", "c9")).data.status, "active", "flota activează");
  await applyOps(AHSAL, [cour("c9", { createdBy: "ahsal@x.ro", status: "pending", phone: "10" })]);
  assert.equal((await stored("crm31-couriers", "c9")).data.status, "active", "date vechi la subcontractor nu-l dezactivează");

  console.log("sync-integration: OK");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
