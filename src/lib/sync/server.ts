import "server-only";
import { cookies } from "next/headers";
import type { InValue } from "@libsql/client";
import { rawDb } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE, type SessionUser } from "@/lib/auth/core";
import {
  MAX_RECORD_BYTES, SYNC_BY_KEY,
  type SyncKind, type SyncOp, type SyncRow,
} from "./config";

export type SyncUser = SessionUser & { emailLc: string; isGlobal: boolean };

/** User-ul sesiunii curente (validat în DB), sau null. */
export async function currentSyncUser(): Promise<SyncUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return null;
  return { ...user, emailLc: user.email.trim().toLowerCase(), isGlobal: user.role === "global_owner" };
}

let tableReady: Promise<void> | null = null;

export function ensureSyncTable(): Promise<void> {
  tableReady ??= rawDb.batch([
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
  ], "write").then(() => undefined).catch((e) => { tableReady = null; throw e; });
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

function createdByOf(data: string | null): string {
  if (!data) return "";
  try {
    const v = JSON.parse(data) as { createdBy?: unknown };
    return typeof v?.createdBy === "string" ? v.createdBy.trim().toLowerCase() : "";
  } catch { return ""; }
}

/**
 * Aplică operațiile de la client. Reguli de acces (enforce pe server):
 *  - un cont non-Global poate modifica/șterge DOAR înregistrări al căror proprietar e el;
 *  - proprietarul unei înregistrări existente nu se schimbă niciodată;
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
    const existing = owners.get(keyOf(op.k, op.id));
    let owner: string;

    if (existing) {
      if (!user.isGlobal && existing.owner !== user.emailLc) { rejected.push({ k: op.k, id: op.id }); continue; }
      owner = existing.owner;
    } else if (op.del) {
      continue; // nimic de șters
    } else if (coll.owner === "createdBy") {
      const cb = createdByOf(op.data);
      if (user.isGlobal) owner = cb.includes("@") ? cb : user.emailLc;
      else if (cb === user.emailLc) owner = user.emailLc;
      else { rejected.push({ k: op.k, id: op.id }); continue; }
    } else if (coll.owner === "parent" && coll.parent && owners.has(keyOf(coll.parent, op.id))) {
      const parentOwner = owners.get(keyOf(coll.parent, op.id))!.owner;
      if (!user.isGlobal && parentOwner !== user.emailLc) { rejected.push({ k: op.k, id: op.id }); continue; }
      owner = parentOwner;
    } else {
      owner = user.emailLc;
    }

    // Non-Global nu poate „dărui" o înregistrare altui cont schimbând createdBy.
    if (!op.del && coll.owner === "createdBy" && !user.isGlobal && createdByOf(op.data) !== owner) {
      rejected.push({ k: op.k, id: op.id });
      continue;
    }

    owners.set(keyOf(op.k, op.id), { owner });
    stmts.push({
      sql: `INSERT INTO crm_records (k, id, kind, owner, data, del, ts, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(k, id) DO UPDATE SET
              kind = excluded.kind, data = excluded.data, del = excluded.del,
              ts = excluded.ts, updated_by = excluded.updated_by`,
      args: [op.k, op.id, op.kind, owner, op.del ? null : op.data, op.del ? 1 : 0, now, user.emailLc],
    });
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
