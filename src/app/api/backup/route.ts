import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

const TENANT = "fleet_dragons";
const MAX_KEEP = 50;

function estimateVolume(keys: Record<string, string>): { items: number; sizeBytes: number } {
  let items = 0, sizeBytes = 0;
  for (const [, v] of Object.entries(keys)) {
    sizeBytes += v.length;
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) items += p.length;
      else if (p && typeof p === "object") items += Object.keys(p).length;
    } catch {}
  }
  return { items, sizeBytes };
}

/** POST /api/backup — salvează un snapshot în DB. Safeguard: dacă payload-ul e mult mai mic
 *  decât ultimul snapshot (>40% pierdere), marchez `is_shrunk=1` și NU-l consider drept "latest bun". */
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const keys = body as Record<string, string>;
  const incoming = estimateVolume(keys);

  // Compară cu ultimul snapshot NON-shrunk (adică ultimul „bun")
  const [latestGood] = await db
    .select()
    .from(schema.backupSnapshots)
    .where(eq(schema.backupSnapshots.isShrunk, false))
    .orderBy(desc(schema.backupSnapshots.id))
    .limit(1);

  const latestVolume = latestGood
    ? { items: latestGood.itemCount, sizeBytes: latestGood.sizeBytes }
    : null;
  const shrunk = !!(
    latestVolume &&
    latestVolume.items > 5 &&
    incoming.items < latestVolume.items * 0.6
  );

  await db.insert(schema.backupSnapshots).values({
    tenantId: TENANT,
    keys: JSON.stringify(keys),
    itemCount: incoming.items,
    sizeBytes: incoming.sizeBytes,
    isShrunk: shrunk,
  });

  // Cleanup: păstrez ultimele MAX_KEEP snapshot-uri + mereu cel mai mare snapshot bun
  // (ca un device gol să nu poată roti afară singura copie cu date reale).
  const all = await db
    .select({ id: schema.backupSnapshots.id })
    .from(schema.backupSnapshots)
    .orderBy(desc(schema.backupSnapshots.id));
  if (all.length > MAX_KEEP) {
    const [biggest] = await db
      .select({ id: schema.backupSnapshots.id })
      .from(schema.backupSnapshots)
      .where(eq(schema.backupSnapshots.isShrunk, false))
      .orderBy(desc(schema.backupSnapshots.itemCount), desc(schema.backupSnapshots.id))
      .limit(1);
    const toDelete = all.slice(MAX_KEEP).map((r) => r.id).filter((id) => id !== biggest?.id);
    for (const id of toDelete) {
      await db.delete(schema.backupSnapshots).where(eq(schema.backupSnapshots.id, id));
    }
  }

  return NextResponse.json({ ok: true, shrunk, volume: incoming, previousVolume: latestVolume });
}

/** GET /api/backup — listează ultimele snapshot-uri (metadata, fără date). */
export async function GET() {
  const rows = await db
    .select({
      id: schema.backupSnapshots.id,
      createdAtIso: schema.backupSnapshots.createdAtIso,
      itemCount: schema.backupSnapshots.itemCount,
      sizeBytes: schema.backupSnapshots.sizeBytes,
      isShrunk: schema.backupSnapshots.isShrunk,
    })
    .from(schema.backupSnapshots)
    .orderBy(desc(schema.backupSnapshots.id))
    .limit(MAX_KEEP);
  const backups = rows.map((r) => ({
    filename: String(r.id),
    size: r.sizeBytes,
    mtime: r.createdAtIso,
    items: r.itemCount,
    shrunk: !!r.isShrunk,
  }));
  return NextResponse.json({ backups });
}
