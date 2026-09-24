import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const b = await c.execute("SELECT keys FROM backup_snapshots WHERE is_shrunk = 0 ORDER BY id DESC LIMIT 1");
const keys = JSON.parse(b.rows[0].keys);
const payments = JSON.parse(keys["crm31-payments"] ?? "[]");

const raportDir = "C:/Users/Ioan Varga/Desktop/raport";
const readX = (f) => XLSX.utils.sheet_to_json(XLSX.read(readFileSync(`${raportDir}/${f}`), { type: "buffer" }).Sheets.Sheet1, { header: 1, defval: null });
const bolt = readX("bolt gusty.xlsx"); const wolt = readX("wolt gusty.xlsx"); const glovo = readX("glovo gusty.xlsx");
const norm = (s) => (s ?? "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const r2 = (n) => Math.round(n * 100) / 100;

// BRUT în raport, per regulă:
// - Bolt Gusty: G - H (Adjusted Earnings - Tips)
// - Wolt Gusty: B + C + D (Task + Manual + Bonus, fără Tips)
// - Glovo Gusty: B (Venituri, fără Tips)
const rap = new Map();
for (const r of bolt.slice(1)) {
  const uid = r[1]; if (!uid) continue;
  const name = `${r[2] ?? ""} ${r[3] ?? ""}`.trim();
  const G = Number(r[6]) || 0, H = Number(r[7]) || 0;
  rap.set(norm(name), { plat: "bolt", brut: r2(G - H) });
}
for (const r of wolt.slice(1)) {
  const name = r[0]; if (!name) continue;
  const B = Number(r[1]) || 0, C = Number(r[2]) || 0, D = Number(r[3]) || 0;
  rap.set(norm(name), { plat: "wolt", brut: r2(B + C + D) });
}
for (const r of glovo.slice(1)) {
  const name = r[0]; if (!name) continue;
  const B = Number(r[1]) || 0;
  rap.set(norm(name), { plat: "glovo", brut: r2(B) });
}

console.log("\n=== VERIFICARE VENIT BRUT: CRM vs RAPORT ===\n");
console.log("Legenda: ✓ = identic (<1 RON diff)  |  ✗ = diferă  |  ? = curier fără corespondent în raport\n");
console.log("Curier".padEnd(32) + "Platf.".padEnd(8) + "Brut CRM".padStart(11) + "Brut raport".padStart(13) + "  Status");
console.log("─".repeat(80));

let ok = 0, diff = 0, missing = 0;
const rows = [];
for (const p of payments) {
  if (p.recipient?.kind !== "courier") continue;
  const nkey = norm(p.recipient.name);
  const exp = rap.get(nkey);
  const crmBrut = r2(p.breakdown?.grossRevenue ?? 0);
  if (!exp) { rows.push({ name: p.recipient.name, plat: "—", crm: crmBrut, rep: null, status: "?" }); missing++; continue; }
  const d = r2(crmBrut - exp.brut);
  const status = Math.abs(d) < 1 ? "✓" : "✗";
  if (status === "✓") ok++; else diff++;
  rows.push({ name: p.recipient.name, plat: exp.plat, crm: crmBrut, rep: exp.brut, status, diff: d });
}

// Sortez: diferite primele, apoi missing, apoi ok
rows.sort((a, b) => {
  const order = { "✗": 0, "?": 1, "✓": 2 };
  return order[a.status] - order[b.status];
});
for (const r of rows) {
  const line = r.name.padEnd(32) + r.plat.padEnd(8) + String(r.crm).padStart(11) + (r.rep !== null ? String(r.rep).padStart(13) : "—".padStart(13)) + "  " + r.status + (r.diff !== undefined && r.status === "✗" ? `  (diff ${r.diff > 0 ? "+" : ""}${r.diff})` : "");
  console.log(line);
}

console.log("─".repeat(80));
console.log(`\nTotal: ${rows.length}  ·  ✓ identic: ${ok}  ·  ✗ diferă: ${diff}  ·  ? fără raport: ${missing}`);
