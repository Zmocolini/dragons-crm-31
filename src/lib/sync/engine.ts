"use client";

import {
  CANONICAL_FLEET_ID, MAX_OPS_PER_REQUEST, SYNC_BY_KEY, SYNC_COLLECTIONS,
  type SyncKind, type SyncOp, type SyncRow,
} from "./config";

// Starea motorului stă sub prefixul `crm31sync:` (NU `crm31-`) ca să nu intre în backup-uri.
const K_USER = "crm31sync:user";
const K_PENDING = "crm31sync:pending";

type Recs = Map<string, string>; // id → JSON
type Exploded = { kind: SyncKind | null; recs: Recs; order: string[] };
type PendingOp = SyncOp & { seq: number };

export type InitResult = "ok" | "offline" | "unauthorized";

// ── (de)serializare cheie localStorage ↔ înregistrări ──────────────────────

function explode(raw: string | null): Exploded {
  const empty: Exploded = { kind: null, recs: new Map(), order: [] };
  if (raw == null) return empty;
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return empty; }
  const recs: Recs = new Map();
  const order: string[] = [];
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every((x) => typeof x === "string")) {
      for (const id of v as string[]) { recs.set(id, "true"); order.push(id); }
      return { kind: "set", recs, order };
    }
    for (const item of v) {
      const id = (item as { id?: unknown } | null)?.id;
      if (typeof id !== "string" && typeof id !== "number") return empty; // formă necunoscută → nu sincronizăm
      recs.set(String(id), JSON.stringify(item));
      order.push(String(id));
    }
    return { kind: "list", recs, order };
  }
  if (v && typeof v === "object") {
    for (const [id, val] of Object.entries(v as Record<string, unknown>)) {
      recs.set(id, JSON.stringify(val));
      order.push(id);
    }
    return { kind: "map", recs, order };
  }
  return empty;
}

function createdAtOf(json: string): string {
  try { return String((JSON.parse(json) as { createdAtIso?: unknown }).createdAtIso ?? ""); } catch { return ""; }
}

function implode(kind: SyncKind, recs: Recs, localOrder: string[]): string {
  // Ordine: păstrez ordinea locală existentă; înregistrările noi (de pe server) intră în față,
  // cele mai recente primele.
  const known = new Set(localOrder);
  const fresh = [...recs.keys()].filter((id) => !known.has(id))
    .sort((a, b) => createdAtOf(recs.get(b)!).localeCompare(createdAtOf(recs.get(a)!)));
  const ids = [...fresh, ...localOrder.filter((id) => recs.has(id))];
  if (kind === "set") return JSON.stringify(ids);
  if (kind === "map") {
    const o: Record<string, unknown> = {};
    for (const id of ids) o[id] = JSON.parse(recs.get(id)!);
    return JSON.stringify(o);
  }
  return `[${ids.map((id) => recs.get(id)!).join(",")}]`;
}

/** Aduce `tenantId` / `fleetId` la ID-ul canonic (altfel device-urile cu alt ID de flotă
 *  ar filtra înregistrarea din listă). */
function normalizeFleet(json: string): string {
  if (!json.includes("tenantId") && !json.includes("fleetId")) return json;
  try {
    const v = JSON.parse(json) as Record<string, unknown>;
    if (!v || typeof v !== "object" || Array.isArray(v)) return json;
    let changed = false;
    for (const f of ["tenantId", "fleetId"]) {
      if (typeof v[f] === "string" && v[f] !== CANONICAL_FLEET_ID) { v[f] = CANONICAL_FLEET_ID; changed = true; }
    }
    return changed ? JSON.stringify(v) : json;
  } catch { return json; }
}

function normalizeRecs(recs: Recs): Recs {
  for (const [id, val] of recs) recs.set(id, normalizeFleet(val));
  return recs;
}

function createdByOf(json: string): string {
  try {
    const v = JSON.parse(json) as { createdBy?: unknown };
    return typeof v.createdBy === "string" ? v.createdBy.trim().toLowerCase() : "";
  } catch { return ""; }
}

// ── motorul ────────────────────────────────────────────────────────────────

class SyncEngine {
  private nativeSet: ((k: string, v: string) => void) | null = null;
  private nativeGet: ((k: string) => string | null) | null = null;
  private nativeRemove: ((k: string) => void) | null = null;
  private base = new Map<string, Recs>();
  private kinds = new Map<string, SyncKind>();
  private pending: PendingOp[] = [];
  private seq = 0;
  private dirtyKeys = new Set<string>();
  private diffTimer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  private lastPull = 0;
  private installed = false;
  private stopped = false;
  /** Apelat când datele locale au fost schimbate din exterior (pull / refuz server). */
  onExternalChange: (() => void) | null = null;

  private get(k: string) { return this.nativeGet ? this.nativeGet(k) : localStorage.getItem(k); }
  private set(k: string, v: string) { (this.nativeSet ?? localStorage.setItem.bind(localStorage))(k, v); }

  private install() {
    if (this.installed) return;
    this.installed = true;
    this.nativeSet = localStorage.setItem.bind(localStorage);
    this.nativeGet = localStorage.getItem.bind(localStorage);
    this.nativeRemove = localStorage.removeItem.bind(localStorage);
    const nativeSet = this.nativeSet;
    // Interceptez scrierile providerilor → calculez diferențele per înregistrare.
    localStorage.setItem = (k: string, v: string) => {
      nativeSet(k, v);
      if (!this.stopped && SYNC_BY_KEY.has(k)) this.markDirty(k);
    };
    window.addEventListener("online", () => this.scheduleFlush(0));
    window.addEventListener("pagehide", () => this.diffNow());
  }

  private loadPending(): PendingOp[] {
    try {
      const v = JSON.parse(this.get(K_PENDING) ?? "[]") as PendingOp[];
      return Array.isArray(v) ? v : [];
    } catch { return []; }
  }
  private savePending() {
    try { this.set(K_PENDING, JSON.stringify(this.pending.map(({ seq: _s, ...op }) => op))); } catch {}
  }

  private enqueue(op: SyncOp) {
    this.pending = this.pending.filter((p) => !(p.k === op.k && p.id === op.id));
    this.pending.push({ ...op, seq: ++this.seq });
  }

  /** Prima sincronizare: aduce datele vizibile contului și le scrie în localStorage
   *  ÎNAINTE ca providerii să se hidrateze. */
  async init(): Promise<InitResult> {
    this.install();
    this.stopped = false;
    let payload: { me: { email: string; role: string }; now: number; rows: SyncRow[] };
    try {
      const res = await fetch("/api/sync?since=0", { cache: "no-store" });
      if (res.status === 401) return "unauthorized";
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error(String(res.status));
      payload = await res.json();
    } catch {
      // Offline: continui cu datele locale doar dacă ele aparțin ultimului cont sincronizat.
      if (!this.get(K_USER)) return "offline";
      this.pending = this.loadPending().map((p) => ({ ...p, seq: ++this.seq }));
      for (const c of SYNC_COLLECTIONS) {
        const ex = explode(this.get(c.key));
        this.base.set(c.key, ex.recs);
        if (ex.kind) this.kinds.set(c.key, ex.kind);
      }
      return "offline";
    }

    const me = payload.me;
    const isGlobal = me.role === "global_owner";
    const sameUser = this.get(K_USER) === me.email;
    const migrate = !sameUser; // prima dată acest cont pe acest device
    const pendingPrev = sameUser ? this.loadPending() : [];

    const live = new Map<string, Recs>();
    const tomb = new Map<string, Set<string>>();
    for (const r of payload.rows) {
      this.kinds.set(r.k, r.kind);
      if (r.del) {
        if (!tomb.has(r.k)) tomb.set(r.k, new Set());
        tomb.get(r.k)!.add(r.id);
      } else {
        if (!live.has(r.k)) live.set(r.k, new Map());
        live.get(r.k)!.set(r.id, normalizeFleet(r.data ?? "null"));
      }
    }

    this.pending = [];
    const uploading = new Map<string, Set<string>>();
    for (const c of SYNC_COLLECTIONS) {
      const local = explode(this.get(c.key));
      normalizeRecs(local.recs);
      const result: Recs = new Map(live.get(c.key) ?? []);
      const kind = this.kinds.get(c.key) ?? local.kind ?? "list";
      this.kinds.set(c.key, kind);

      if (migrate) {
        const up = new Set<string>();
        for (const [id, val] of local.recs) {
          if (result.has(id) || tomb.get(c.key)?.has(id)) continue;
          const allowed =
            isGlobal ||
            (c.owner === "createdBy" && createdByOf(val) === me.email) ||
            (c.owner === "parent" && !!c.parent &&
              ((live.get(c.parent)?.has(id) ?? false) || (uploading.get(c.parent)?.has(id) ?? false)));
          if (!allowed) continue; // date ale altui cont rămase pe device → nu le urc, nu le afișez
          result.set(id, val);
          up.add(id);
          this.enqueue({ k: c.key, id, kind, data: val, del: false });
        }
        uploading.set(c.key, up);
      } else {
        for (const p of pendingPrev.filter((x) => x.k === c.key)) {
          if (p.del) result.delete(p.id); else result.set(p.id, p.data ?? "null");
          this.enqueue(p);
        }
      }

      if (this.get(c.key) != null || result.size > 0) this.set(c.key, implode(kind, result, local.order));
      this.base.set(c.key, result);
    }

    this.set(K_USER, me.email);
    this.lastPull = payload.now;
    this.savePending();
    // Urc migrarea/modificările rămase ÎNAINTE de afișare, ca refuzurile să fie deja aplicate.
    await this.flush();
    return "ok";
  }

  private markDirty(k: string) {
    this.dirtyKeys.add(k);
    if (this.diffTimer) clearTimeout(this.diffTimer);
    this.diffTimer = setTimeout(() => this.diffNow(), 250);
  }

  /** Compară valoarea curentă a cheilor modificate cu ultima stare sincronizată. */
  diffNow() {
    if (this.diffTimer) { clearTimeout(this.diffTimer); this.diffTimer = null; }
    if (this.dirtyKeys.size === 0) return;
    const keys = SYNC_COLLECTIONS.map((c) => c.key).filter((k) => this.dirtyKeys.has(k)); // părinți înaintea copiilor
    this.dirtyKeys.clear();
    let changed = false;
    for (const k of keys) {
      const cur = explode(this.get(k));
      if (!cur.kind) continue;
      const kind = cur.recs.size > 0 ? cur.kind : (this.kinds.get(k) ?? cur.kind);
      this.kinds.set(k, kind);
      const base = this.base.get(k) ?? new Map<string, string>();
      const next: Recs = new Map(cur.recs);

      for (const [id, val] of cur.recs) {
        if (base.get(id) !== val) { this.enqueue({ k, id, kind, data: val, del: false }); changed = true; }
      }
      const removed = [...base.keys()].filter((id) => !cur.recs.has(id));
      // Plasă de siguranță: o scriere care golește aproape toată colecția e tratată ca bug,
      // nu ca ștergere voită — nu propag ștergerile pe server.
      const massDelete = removed.length > 5 && cur.recs.size < base.size * 0.2;
      if (massDelete) {
        console.warn(`[sync] ${k}: ${removed.length} ștergeri blocate (scriere suspectă)`);
        for (const id of removed) next.set(id, base.get(id)!);
      } else {
        for (const id of removed) { this.enqueue({ k, id, kind, data: null, del: true }); changed = true; }
      }
      this.base.set(k, next);
    }
    if (changed) { this.savePending(); this.scheduleFlush(600); }
  }

  private scheduleFlush(ms: number) {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => { void this.flush(); }, ms);
  }

  /** Trimite operațiile în așteptare. Sigur de apelat oricând. */
  async flush(opts: { keepalive?: boolean } = {}): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = (async () => {
      while (this.pending.length > 0 && !this.stopped) {
        const batch = this.pending.slice(0, MAX_OPS_PER_REQUEST);
        let res: Response;
        try {
          res = await fetch("/api/sync", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ops: batch.map(({ seq: _s, ...op }) => op) }),
            keepalive: opts.keepalive,
          });
        } catch { this.scheduleFlush(30_000); return; }
        if (res.status === 401) { this.stopped = true; return; }
        if (!res.ok) { this.scheduleFlush(30_000); return; }
        const j = (await res.json().catch(() => ({}))) as { rejected?: { k: string; id: string }[] };
        const sent = new Map(batch.map((b) => [`${b.k}\u0000${b.id}`, b.seq]));
        this.pending = this.pending.filter((p) => sent.get(`${p.k}\u0000${p.id}`) !== p.seq);
        this.savePending();
        if (j.rejected?.length) this.dropRejected(j.rejected);
      }
    })().finally(() => { this.flushing = null; });
    return this.flushing;
  }

  /** Serverul a refuzat (înregistrare a altui cont) → o scot și local. */
  private dropRejected(rejected: { k: string; id: string }[]) {
    const byKey = new Map<string, string[]>();
    for (const r of rejected) {
      if (!SYNC_BY_KEY.has(r.k)) continue;
      byKey.set(r.k, [...(byKey.get(r.k) ?? []), r.id]);
    }
    for (const [k, ids] of byKey) {
      const cur = explode(this.get(k));
      if (!cur.kind) continue;
      for (const id of ids) { cur.recs.delete(id); this.base.get(k)?.delete(id); }
      this.set(k, implode(this.kinds.get(k) ?? cur.kind, cur.recs, cur.order));
    }
    if (byKey.size > 0) this.onExternalChange?.();
  }

  /** Aduce modificările făcute pe alte device-uri. Întoarce numărul de înregistrări schimbate local. */
  async pull(): Promise<number> {
    if (this.stopped) return 0;
    this.diffNow();
    let payload: { now: number; rows: SyncRow[] };
    try {
      const res = await fetch(`/api/sync?since=${Math.max(0, this.lastPull - 10_000)}`, { cache: "no-store" });
      if (!res.ok) return 0;
      payload = await res.json();
    } catch { return 0; }

    const pendingIds = new Set(this.pending.map((p) => `${p.k}\u0000${p.id}`));
    const touched = new Map<string, Exploded>();
    let changed = 0;
    for (const r of payload.rows) {
      if (pendingIds.has(`${r.k}\u0000${r.id}`)) continue; // modificarea locală e mai nouă
      const base = this.base.get(r.k) ?? new Map<string, string>();
      if (r.del ? !base.has(r.id) : base.get(r.id) === r.data) continue;
      if (!touched.has(r.k)) touched.set(r.k, explode(this.get(r.k)));
      const cur = touched.get(r.k)!;
      if (r.del) { cur.recs.delete(r.id); base.delete(r.id); }
      else { const val = normalizeFleet(r.data ?? "null"); cur.recs.set(r.id, val); base.set(r.id, val); }
      this.base.set(r.k, base);
      this.kinds.set(r.k, r.kind);
      changed++;
    }
    for (const [k, cur] of touched) this.set(k, implode(this.kinds.get(k) ?? "list", cur.recs, cur.order));
    this.lastPull = payload.now;
    return changed;
  }

  hasPending() { return this.pending.length > 0 || this.dirtyKeys.size > 0; }

  /** La logout: urcă ce a rămas, apoi șterge datele contului de pe device. */
  async flushAndClear(): Promise<void> {
    this.diffNow();
    await Promise.race([this.flush({ keepalive: true }), new Promise((r) => setTimeout(r, 4000))]);
    this.stopped = true;
    const remove = this.nativeRemove ?? localStorage.removeItem.bind(localStorage);
    for (const c of SYNC_COLLECTIONS) { try { remove(c.key); } catch {} }
    try { remove(K_USER); remove(K_PENDING); } catch {}
    this.base.clear();
    this.pending = [];
  }
}

export const syncEngine: SyncEngine =
  typeof window === "undefined" ? (null as unknown as SyncEngine) : new SyncEngine();
