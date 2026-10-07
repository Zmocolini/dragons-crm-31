import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { hashPassword, newUserId } from "@/lib/auth/core";
import { applyOps, currentSyncUser, ensureSyncTable } from "@/lib/sync/server";
import { CANONICAL_FLEET_ID } from "@/lib/sync/config";
import { buildTestCouriers, TEST_SUBCONTRACTORS } from "@/lib/test-data/subcontractors";

const EMAILS = TEST_SUBCONTRACTORS.map((s) => s.email);

async function requireOwner() {
  const user = await currentSyncUser();
  return user?.isGlobal ? user : null;
}

/** POST — creează (idempotent) conturile de test Ahsal + Hossein și curierii lor (5 + 3).
 *  Parola unui cont NOU se întoarce o singură dată, doar aici, ca owner-ul să poată testa vederea de subcontractor. */
export async function POST() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  const existing = new Set((await db.select({ email: schema.users.email }).from(schema.users).where(inArray(schema.users.email, EMAILS))).map((r) => r.email));
  const created: { name: string; email: string; password: string }[] = [];
  for (const sub of TEST_SUBCONTRACTORS) {
    if (existing.has(sub.email)) continue;
    const password = randomBytes(9).toString("base64url");
    await db.insert(schema.users).values({ id: newUserId(), email: sub.email, passwordHash: await hashPassword(password), name: sub.name, role: "subcontractor_owner", active: true });
    created.push({ name: sub.name, email: sub.email, password });
  }

  await ensureSyncTable();
  const couriers = buildTestCouriers(Date.now(), CANONICAL_FLEET_ID);
  const { rejected } = await applyOps(owner, couriers.map((c) => ({ k: "crm31-couriers", id: c.id, kind: "list", data: JSON.stringify(c), del: false })));
  return NextResponse.json({ ok: rejected.length === 0, created, couriers: couriers.length - rejected.length, rejected: rejected.length });
}

/** DELETE — scoate datele de test: tombstone pe curierii `courier_test_*`, apoi conturile și sesiunile lor. */
export async function DELETE() {
  const owner = await requireOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

  await ensureSyncTable();
  const ids = buildTestCouriers(0, CANONICAL_FLEET_ID).map((c) => c.id);
  await applyOps(owner, ids.map((id) => ({ k: "crm31-couriers", id, kind: "list", data: null, del: true })));

  const users = await db.select({ id: schema.users.id }).from(schema.users).where(inArray(schema.users.email, EMAILS));
  if (users.length > 0) {
    const userIds = users.map((u) => u.id);
    await db.delete(schema.sessions).where(inArray(schema.sessions.userId, userIds));
    await db.delete(schema.users).where(inArray(schema.users.id, userIds));
  }
  return NextResponse.json({ ok: true, removedCouriers: ids.length, removedAccounts: users.length });
}
