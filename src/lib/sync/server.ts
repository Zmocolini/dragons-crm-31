import "server-only";
import { cookies } from "next/headers";
import type { InValue } from "@libsql/client";
import { rawDb } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "@/lib/auth/core";
import {
  MAX_RECORD_BYTES, SYNC_BY_KEY,
  type SyncKind, type SyncOp, type SyncRow,
} from "./config";
import { childKeysOf, decideOwner } from "./ownership";

export type SyncUser = SessionUser & { emailLc: string; isGlobal: boolean };

/** User-ul sesiunii curente (validat în DB), sau null. */
export async function currentSyncUser(): Promise<SyncUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return null;
  return { ...user, emailLc: user.email.trim().toLowerCase(), isGlobal: user.role === "global_owner" };
}

import seedRows from "./seed-data.json";
import seedBackup from "./seed-backup.json";

let tableReady: Promise<void> | null = null;

export function ensureSyncTable(): Promise<void> {
  tableReady ??= (async () => {
    await rawDb.batch([
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        name TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at_iso TEXT NOT NULL DEFAULT (current_timestamp),
        last_login_iso TEXT,
        password_hint TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        created_at_iso TEXT NOT NULL DEFAULT (current_timestamp),
        expires_at_iso TEXT NOT NULL,
        user_agent TEXT,
        ip TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS backup_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        tenant_id TEXT NOT NULL,
        created_at_iso TEXT NOT NULL DEFAULT (current_timestamp),
        keys TEXT NOT NULL,
        item_count INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        is_shrunk INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS crm_records (
        k TEXT NOT NULL,
        id TEXT NOT NULL,
        kind TEXT NOT NULL,
        owner TEXT NOT NULL,
        data TEXT,
        del INTEGER NOT NULL DEFAULT 0,
        ts INTEGER NOT NULL,
        updated_by TEXT NOT NULL DEFAULT '',
        PRIMARY KEY (k, id)
      )`,
      `CREATE INDEX IF NOT EXISTS crm_records_owner_ts ON crm_records(owner, ts)`,
      `CREATE INDEX IF NOT EXISTS crm_records_ts ON crm_records(ts)`,
    ], "write");

    try {
      const check = await rawDb.execute("SELECT count(*) as c FROM crm_records");
      const count = Number(check.rows[0]?.c ?? 0);
      if (count === 0 && Array.isArray(seedRows) && seedRows.length > 0) {
        for (let i = 0; i < seedRows.length; i += 100) {
          const chunk = seedRows.slice(i, i + 100);
          const stmts = chunk.map((r: any) => ({
            sql: "INSERT OR REPLACE INTO crm_records (k, id, kind, owner, data, del, ts, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            args: [r.k, r.id, r.kind, r.owner, r.data, r.del ? 1 : 0, r.ts, r.updated_by ?? ""]
          }));
          await rawDb.batch(stmts, "write");
        }
      }
    } catch (err) {
      console.error("[Sync] Seed crm_records error:", err);
    }

    try {
      const checkSnap = await rawDb.execute("SELECT count(*) as c FROM backup_snapshots");
      const countSnap = Number(checkSnap.rows[0]?.c ?? 0);
      if (countSnap === 0 && seedBackup && (seedBackup as any).keys) {
        const snap = seedBackup as any;
        await rawDb.execute({
          sql: "INSERT INTO backup_snapshots (tenant_id, created_at_iso, keys, item_count, size_bytes, is_shrunk) VALUES (?, ?, ?, ?, ?, ?)",
          args: [snap.tenant_id ?? "fleet_dragons", snap.created_at_iso ?? new Date().toISOString(), snap.keys, snap.item_count ?? 684, snap.size_bytes ?? 188901, 0]
        });
      }
    } catch (err) {
      console.error("[Sync] Seed backup_snapshots error:", err);
    }
  })().catch((e) => { tableReady = null; throw e; });
  return tableReady;
}

/** Înregistrările vizibile pentru user, modificate după `since` (ms). */
export async function readRows(user: SyncUser, since: number): Promise<SyncRow[]> {
  await ensureSyncTable();
  const res = user.isGlobal
    ? await rawDb.execute({ sql: "SELECT k, id, kind, data, del, ts FROM crm_records WHERE ts > ?", args: [since] })
    : await rawDb.execute({ sql: "SELECT k, id, kind, data, del, ts FROM crm_records WHERE owner = ? AND ts > ?", args: [user.emailLc, since] });
  return res.rows
    .filter((r) => SYNC_BY_KEY.has(String(r.k)))
    .map((r) => ({
      k: String(r.k),
      id: String(r.id),
      kind: String(r.kind) as SyncKind,
      data: r.data == null ? null : String(r.data),
      del: Number(r.del) === 1,
      ts: Number(r.ts),
    }));
}

type Existing = { owner: string };

async function loadOwners(pairs: { k: string; id: string }[]): Promise<Map<string, Existing>> {
  const out = new Map<string, Existing>();
  const ids = [...new Set(pairs.map((p) => p.id))];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const res = await rawDb.execute({
      sql: `SELECT k, id, owner FROM crm_records WHERE id IN (${chunk.map(() => "?").join(",")})`,
      args: chunk,
    });
    for (const r of res.rows) out.set(`${r.k}\u0000${r.id}`, { owner: String(r.owner) });
  }
  return out;
}

function isValidOp(op: unknown): op is SyncOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  if (typeof o.k !== "string" || !SYNC_BY_KEY.has(o.k)) return false;
  if (typeof o.id !== "string" || o.id.length === 0 || o.id.length > 200) return false;
  if (o.kind !== "list" && o.kind !== "set" && o.kind !== "map") return false;
  if (typeof o.del !== "boolean") return false;
  if (o.del) return true;
  if (typeof o.data !== "string" || o.data.length > MAX_RECORD_BYTES) return false;
  try { JSON.parse(o.data); } catch { return false; }
  return true;
}

/**
 * Aplică operațiile de la client. Regulile de acces sunt în `decideOwner` (ownership.ts):
 *  - un cont non-Global poate modifica/șterge DOAR înregistrări al căror proprietar e el;
 *  - proprietarul unei înregistrări existente se schimbă DOAR prin transfer de la Global Owner
 *    (createdBy rescris cu alt email); copiii (`parent`) se mută odată cu părintele;
 *  - la creare, proprietarul e decis de regula colecției (createdBy / parent / writer).
 * Returnează operațiile refuzate.
 */
export async function applyOps(user: SyncUser, rawOps: unknown[]): Promise<{ rejected: { k: string; id: string }[] }> {
  await ensureSyncTable();
  const rejected: { k: string; id: string }[] = [];
  const ops: SyncOp[] = [];
  for (const o of rawOps) {
    if (isValidOp(o)) ops.push(o);
    else if (o && typeof o === "object") {
      const x = o as { k?: unknown; id?: unknown };
      rejected.push({ k: String(x.k ?? ""), id: String(x.id ?? "") });
    }
  }

  // Proprietarii existenți: înregistrările țintă + părinții lor.
  const lookups: { k: string; id: string }[] = [];
  for (const op of ops) {
    lookups.push({ k: op.k, id: op.id });
    const parent = SYNC_BY_KEY.get(op.k)?.parent;
    if (parent) lookups.push({ k: parent, id: op.id });
  }
  const owners = await loadOwners(lookups);
  const keyOf = (k: string, id: string) => `${k}\u0000${id}`;

  const now = Date.now();
  const stmts: { sql: string; args: InValue[] }[] = [];

  for (const op of ops) {
    const coll = SYNC_BY_KEY.get(op.k)!;
    const decision = decideOwner(
      op, coll, user,
      owners.get(keyOf(op.k, op.id))?.owner,
      coll.parent ? owners.get(keyOf(coll.parent, op.id))?.owner : undefined,
    );
    if (decision.kind === "skip") continue;
    if (decision.kind === "reject") { rejected.push({ k: op.k, id: op.id }); continue; }
    const { owner, transferred } = decision;

    owners.set(keyOf(op.k, op.id), { owner });
    stmts.push({
      sql: `INSERT INTO crm_records (k, id, kind, owner, data, del, ts, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(k, id) DO UPDATE SET
              kind = excluded.kind, owner = excluded.owner, data = excluded.data, del = excluded.del,
              ts = excluded.ts, updated_by = excluded.updated_by`,
      args: [op.k, op.id, op.kind, owner, op.del ? null : op.data, op.del ? 1 : 0, now, user.emailLc],
    });
    // Transfer: copiii (note, patch-uri, activități pe același id) urmează părintele; ts nou ca
    // noul proprietar să-i tragă la următorul sync.
    const children = transferred ? childKeysOf(op.k) : [];
    if (children.length > 0) {
      stmts.push({
        sql: `UPDATE crm_records SET owner = ?, ts = ?, updated_by = ? WHERE id = ? AND k IN (${children.map(() => "?").join(",")})`,
        args: [owner, now, user.emailLc, op.id, ...children],
      });
      for (const ck of children) if (owners.has(keyOf(ck, op.id))) owners.set(keyOf(ck, op.id), { owner });
    }
  }

  if (stmts.length > 0) await rawDb.batch(stmts, "write");
  return { rejected };
}

/** Poate user-ul accesa curierul `courierId`? (pentru documentele din R2) */
export async function canAccessCourier(user: SyncUser, courierId: string): Promise<boolean> {
  if (user.isGlobal) return true;
  await ensureSyncTable();
  const res = await rawDb.execute({
    sql: "SELECT owner FROM crm_records WHERE k = 'crm31-couriers' AND id = ? AND del = 0",
    args: [courierId],
  });
  return res.rows.length > 0 && String(res.rows[0].owner) === user.emailLc;
}
