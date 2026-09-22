import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

/** GET /api/backup/:id — returnează un snapshot din DB. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const [row] = await db.select().from(schema.backupSnapshots).where(eq(schema.backupSnapshots.id, n)).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const keys = JSON.parse(row.keys);
    return NextResponse.json({ createdAt: row.createdAtIso, keys });
  } catch {
    return NextResponse.json({ error: "corrupt data" }, { status: 500 });
  }
}

/** DELETE /api/backup/:id — șterge un snapshot. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  await db.delete(schema.backupSnapshots).where(eq(schema.backupSnapshots.id, n));
  return NextResponse.json({ ok: true });
}
