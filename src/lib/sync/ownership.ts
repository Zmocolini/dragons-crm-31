// Regula de proprietar pentru /api/sync, ca funcție pură (testată în tests/sync-ownership.test.ts).
// server.ts o aplică pe fiecare operație; aici nu există DB, cookies sau `server-only`.
import { SYNC_COLLECTIONS, type SyncCollection, type SyncOp } from "./config";

export type SyncActor = { emailLc: string; isGlobal: boolean };

export type OwnerDecision =
  | { kind: "write"; owner: string; transferred: boolean }
  | { kind: "reject" }
  | { kind: "skip" };

export function createdByOf(data: string | null): string {
  if (!data) return "";
  try {
    const v = JSON.parse(data) as { createdBy?: unknown };
    return typeof v?.createdBy === "string" ? v.createdBy.trim().toLowerCase() : "";
  } catch { return ""; }
}

/** Colecțiile al căror proprietar e dat de înregistrarea părinte cu același id. */
export function childKeysOf(parentKey: string): string[] {
  return SYNC_COLLECTIONS.filter((c) => c.parent === parentKey).map((c) => c.key);
}

/**
 *  - un cont non-Global modifică/șterge DOAR înregistrările lui și nu le poate „dărui";
 *  - la creare, proprietarul e decis de regula colecției (createdBy / parent / writer);
 *  - TRANSFER: doar Global Owner, doar pe colecții `createdBy`, doar când `createdBy` devine
 *    un alt email. Un nume („Sistem", „Ion") nu mută nimic.
 */
export function decideOwner(
  op: SyncOp,
  coll: SyncCollection,
  user: SyncActor,
  existingOwner: string | undefined,
  parentOwner: string | undefined,
): OwnerDecision {
  let owner: string;
  let transferred = false;

  if (existingOwner !== undefined) {
    if (!user.isGlobal && existingOwner !== user.emailLc) return { kind: "reject" };
    owner = existingOwner;
    if (user.isGlobal && !op.del && coll.owner === "createdBy") {
      const cb = createdByOf(op.data);
      if (cb.includes("@") && cb !== existingOwner) { owner = cb; transferred = true; }
    }
  } else if (op.del) {
    return { kind: "skip" }; // nimic de șters
  } else if (coll.owner === "createdBy") {
    const cb = createdByOf(op.data);
    if (user.isGlobal) owner = cb.includes("@") ? cb : user.emailLc;
    else if (cb === user.emailLc) owner = user.emailLc;
    else return { kind: "reject" };
  } else if (coll.owner === "parent" && coll.parent && parentOwner !== undefined) {
    if (!user.isGlobal && parentOwner !== user.emailLc) return { kind: "reject" };
    owner = parentOwner;
  } else {
    owner = user.emailLc;
  }

  if (!op.del && coll.owner === "createdBy" && !user.isGlobal && createdByOf(op.data) !== owner) {
    return { kind: "reject" };
  }
  return { kind: "write", owner, transferred };
}
