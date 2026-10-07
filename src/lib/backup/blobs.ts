import { createHash } from "node:crypto";

// Snapshot-urile conțin documente încărcate (data URL, ~0,8 MB bucata) repetate identic în
// fiecare copie. Le scot din snapshot, o singură dată per conținut (sha256), și las în loc o referință.

const MIN_BLOB_CHARS = 20_000;
const REF = "@@blob:sha256:";
export const REF_RE = /@@blob:sha256:([0-9a-f]{64})/g;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

function mapStrings(node: unknown, fn: (s: string) => string): unknown {
  if (typeof node === "string") return fn(node);
  if (Array.isArray(node)) return node.map((x) => mapStrings(x, fn));
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return node;
}

/** Înlocuiește șirurile mari cu referințe. Valorile fără șiruri mari rămân neatinse (byte cu byte). */
export function extractBlobs(keys: Record<string, string>): { slim: Record<string, string>; blobs: Map<string, string> } {
  const blobs = new Map<string, string>();
  const slim: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys)) {
    if (v.length < MIN_BLOB_CHARS) { slim[k] = v; continue; }
    let parsed: unknown;
    try { parsed = JSON.parse(v); } catch { slim[k] = v; continue; }
    let changed = false;
    const out = mapStrings(parsed, (s) => {
      if (s.length < MIN_BLOB_CHARS) return s;
      const h = sha(s);
      blobs.set(h, s);
      changed = true;
      return REF + h;
    });
    slim[k] = changed ? JSON.stringify(out) : v;
  }
  return { slim, blobs };
}

export function referencedHashes(keys: Record<string, string>): string[] {
  const found = new Set<string>();
  for (const v of Object.values(keys)) for (const m of v.matchAll(REF_RE)) found.add(m[1]);
  return [...found];
}

/** Inversul lui extractBlobs; `blobs` trebuie să conțină toate hash-urile referite. */
export function restoreBlobs(slim: Record<string, string>, blobs: ReadonlyMap<string, string>): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const [k, v] of Object.entries(slim)) {
    if (!v.includes(REF)) { keys[k] = v; continue; }
    const out = mapStrings(JSON.parse(v), (s) => {
      if (!s.startsWith(REF)) return s;
      const b = blobs.get(s.slice(REF.length));
      if (b === undefined) throw new Error(`blob lipsă: ${s.slice(REF.length, REF.length + 8)}`);
      return b;
    });
    keys[k] = JSON.stringify(out);
  }
  return keys;
}
