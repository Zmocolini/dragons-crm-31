import { rawDb } from "@/lib/db/client";
import { REF_RE, extractBlobs, referencedHashes, restoreBlobs } from "./blobs";

let ready: Promise<unknown> | null = null;
const ensure = () => (ready ??= rawDb.execute("CREATE TABLE IF NOT EXISTS backup_blobs (hash TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL)"));

/** Scoate documentele din snapshot, le salvează o singură dată și întoarce snapshot-ul subțire. */
export async function slimAndStore(keys: Record<string, string>): Promise<Record<string, string>> {
  const { slim, blobs } = extractBlobs(keys);
  if (blobs.size === 0) return slim;
  await ensure();
  for (const [hash, data] of blobs) {
    await rawDb.execute({ sql: "INSERT OR IGNORE INTO backup_blobs (hash, data) VALUES (?, ?)", args: [hash, data] });
  }
  return slim;
}

/** Reface snapshot-ul întreg din cel subțire. */
export async function loadFull(slim: Record<string, string>): Promise<Record<string, string>> {
  const hashes = referencedHashes(slim);
  if (hashes.length === 0) return slim;
  await ensure();
  const res = await rawDb.execute({ sql: `SELECT hash, data FROM backup_blobs WHERE hash IN (${hashes.map(() => "?").join(",")})`, args: hashes });
  const map = new Map(res.rows.map((r) => [String(r.hash), String(r.data)]));
  return restoreBlobs(slim, map);
}

/** Șterge documentele pe care nu le mai referă niciun snapshot. */
export async function gcBlobs(): Promise<void> {
  await ensure();
  const snaps = await rawDb.execute("SELECT keys FROM backup_snapshots");
  const used = new Set<string>();
  for (const r of snaps.rows) for (const m of String(r.keys).matchAll(REF_RE)) used.add(m[1]);
  const all = await rawDb.execute("SELECT hash FROM backup_blobs");
  for (const r of all.rows) {
    const h = String(r.hash);
    if (!used.has(h)) await rawDb.execute({ sql: "DELETE FROM backup_blobs WHERE hash = ?", args: [h] });
  }
}

/** Subțiază snapshot-urile vechi (cu documente inline), câteva pe apel, ca baza să scadă fără migrare separată. */
export async function compactLegacy(limit = 5): Promise<number> {
  const res = await rawDb.execute({ sql: "SELECT id, keys FROM backup_snapshots WHERE length(keys) > 300000 AND keys NOT LIKE '%@@blob:sha256:%' LIMIT ?", args: [limit] });
  let n = 0;
  for (const r of res.rows) {
    let keys: Record<string, string>;
    try { keys = JSON.parse(String(r.keys)); } catch { continue; }
    const slim = await slimAndStore(keys);
    await rawDb.execute({ sql: "UPDATE backup_snapshots SET keys = ? WHERE id = ?", args: [JSON.stringify(slim), Number(r.id)] });
    n++;
  }
  return n;
}
