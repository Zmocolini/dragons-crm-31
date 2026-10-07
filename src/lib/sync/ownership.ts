// Regula de proprietar pentru /api/sync, ca funcție pură (testată în tests/sync-ownership.test.ts).
// server.ts o aplică pe fiecare operație; aici nu există DB, cookies sau `server-only`.
import { SYNC_COLLECTIONS, type SyncCollection, type SyncOp } from "./config";

export type SyncActor = { emailLc: string; isGlobal: boolean };
/** Conturile active de pe server (emailuri lowercase). */
export type AccountCheck = { exists: (email: string) => boolean; isGlobal: (email: string) => boolean };

/**
 * Marcajul de transfer pus de client lângă noul `createdBy`: proprietarul DE LA care se mută.
 * Fără el, o scriere cu alt `createdBy` NU mută nimic — altfel un dispozitiv cu date vechi
 * (sau o restaurare de backup) ar anula tăcut un transfer. Serverul nu-l stochează.
 */
export const TRANSFER_FIELD = "transferFrom";
/** `transferFrom` pentru înregistrări vechi al căror createdBy e un nume: proprietarul curent trebuie să fie un cont global. */
export const LEGACY_OWNER = "*";

export type OwnerDecision =
  | { kind: "write"; owner: string; transferred: boolean; data: string | null }
  | { kind: "reject" }
  | { kind: "skip" };

function parse(data: string | null): Record<string, unknown> | null {
  if (!data) return null;
  try {
    const v = JSON.parse(data) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch { return null; }
}
const lc = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

export function createdByOf(data: string | null): string {
  return lc(parse(data)?.createdBy);
}

/** Colecțiile al căror proprietar e dat de înregistrarea părinte cu același id. */
export function childKeysOf(parentKey: string): string[] {
  return SYNC_COLLECTIONS.filter((c) => c.parent === parentKey).map((c) => c.key);
}

/**
 *  - un cont non-Global modifică/șterge DOAR înregistrările lui și nu le poate „dărui";
 *  - la creare, proprietarul e decis de regula colecției (createdBy / parent / writer);
 *  - TRANSFER: doar Global Owner, doar pe colecții `createdBy`, doar cu `transferFrom` = proprietarul
 *    curent, doar spre un cont activ existent. Orice altă scriere păstrează proprietarul, iar la
 *    Global un `createdBy` (email) vechi e corectat la proprietarul real.
 */
export function decideOwner(
  op: SyncOp,
  coll: SyncCollection,
  user: SyncActor,
  existingOwner: string | undefined,
  parentOwner: string | undefined,
  accounts: AccountCheck,
): OwnerDecision {
  let owner: string;
  let transferred = false;
  const obj = coll.owner === "createdBy" && !op.del ? parse(op.data) : null;
  const cb = lc(obj?.createdBy);

  if (existingOwner !== undefined) {
    if (!user.isGlobal && existingOwner !== user.emailLc) return { kind: "reject" };
    owner = existingOwner;
    if (user.isGlobal && obj) {
      const from = lc(obj[TRANSFER_FIELD]);
      const intent = from === existingOwner || (from === LEGACY_OWNER && accounts.isGlobal(existingOwner));
      if (intent && cb.includes("@") && cb !== existingOwner && accounts.exists(cb)) {
        owner = cb;
        transferred = true;
      }
    }
  } else if (op.del) {
    return { kind: "skip" }; // nimic de șters
  } else if (coll.owner === "createdBy") {
    if (user.isGlobal) owner = cb.includes("@") ? cb : user.emailLc;
    else if (cb === user.emailLc) owner = user.emailLc;
    else return { kind: "reject" };
  } else if (coll.owner === "parent" && coll.parent && parentOwner !== undefined) {
    if (!user.isGlobal && parentOwner !== user.emailLc) return { kind: "reject" };
    owner = parentOwner;
  } else {
    owner = user.emailLc;
  }

  if (!op.del && coll.owner === "createdBy" && !user.isGlobal && cb !== owner) {
    return { kind: "reject" };
  }

  // Ce se stochează: fără marcaj; createdBy aliniat mereu la proprietarul real (și un nume vechi —
  // altfel copia proprietarului ar avea alt createdBy și editările lui ar fi respinse).
  let data = op.del ? null : op.data;
  if (obj && (TRANSFER_FIELD in obj || cb !== owner)) {
    const clean = { ...obj };
    delete clean[TRANSFER_FIELD];
    if (cb !== owner) clean.createdBy = owner;
    data = JSON.stringify(clean);
  }
  return { kind: "write", owner, transferred, data };
}

/**
 * Statusul curierului îl decide flota: la un subcontractor, un curier nou intră „pending" și
 * statusul stocat nu se schimbă. Nu respinge operația (un dispozitiv cu date vechi și-ar pierde
 * editarea) — doar rescrie `status`. Până acum regula exista doar în client, ocolibilă prin POST.
 */
export function enforceCourierStatus(user: SyncActor, oldData: string | null, newData: string | null): string | null {
  if (user.isGlobal || newData === null) return newData;
  const next = parse(newData);
  if (!next) return newData;
  // Curier nou, sau stocat fără status valid (date vechi / scrise brut) → „pending".
  const stored = oldData === null ? undefined : parse(oldData)?.status;
  const want = typeof stored === "string" && stored ? stored : "pending";
  if (next.status === want) return newData;
  return JSON.stringify({ ...next, status: want });
}
