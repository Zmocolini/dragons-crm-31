// applyOps/readRows pe un SQLite temporar: transferul de proprietar și refuzurile, cu SQL-ul real.
// Rulează cu `tsx --conditions=react-server` (server.ts importă `server-only`).
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "crm31-sync-"));
process.env.TURSO_DATABASE_URL = "file:" + join(dir, "t.db");
const { applyOps, readRows } = await import("../src/lib/sync/server");

const OWNER = { id: "o", email: "owner@x.ro", name: "O", role: "global_owner", emailLc: "owner@x.ro", isGlobal: true } as never;
const AHSAL = { id: "a", email: "ahsal@x.ro", name: "A", role: "subcontractor_owner", emailLc: "ahsal@x.ro", isGlobal: false } as never;
const pay = (createdBy: string) => ({ k: "crm31-payments", id: "p1", kind: "list", data: JSON.stringify({ createdBy, amount: 1 }), del: false });
const patch = { k: "crm31-payment-patches", id: "p1", kind: "map", data: JSON.stringify({ amountPaid: 5 }), del: false };
const ahsalSees = async () => (await readRows(AHSAL, 0)).filter((x) => x.id === "p1").map((x) => x.k).sort();

try {
  assert.deepEqual((await applyOps(OWNER, [pay("Owner Nume"), patch])).rejected, []);
  assert.deepEqual(await ahsalSees(), [], "Ahsal nu vede plata owner-ului");
  assert.equal((await applyOps(AHSAL, [pay("ahsal@x.ro")])).rejected.length, 1, "subcontractorul nu își poate lua singur plata");
  assert.deepEqual((await applyOps(OWNER, [pay("ahsal@x.ro")])).rejected, [], "owner transferă");
  assert.deepEqual(await ahsalSees(), ["crm31-payment-patches", "crm31-payments"], "plata + patch-ul ajung la Ahsal");
  assert.deepEqual((await applyOps(AHSAL, [pay("ahsal@x.ro")])).rejected, [], "Ahsal o poate edita");
  assert.equal((await applyOps(AHSAL, [pay("hussein@x.ro")])).rejected.length, 1, "Ahsal nu o poate da altcuiva");
  await applyOps(OWNER, [pay("owner@x.ro")]);
  assert.deepEqual(await ahsalSees(), [], "transfer înapoi");
  console.log("sync-integration: OK");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
