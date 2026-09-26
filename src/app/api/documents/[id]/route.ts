import { NextResponse } from "next/server";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { r2, R2_BUCKET } from "@/lib/r2/client";
import { canAccessCourier, currentSyncUser } from "@/lib/sync/server";

/** GET /api/documents/:id — întoarce un URL semnat pentru download/view (valid 15 min). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const [doc] = await db.select().from(schema.courierDocuments).where(eq(schema.courierDocuments.id, n)).limit(1);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  const user = await currentSyncUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await canAccessCourier(user, doc.courierId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: doc.r2Key, ResponseContentType: doc.contentType }),
    { expiresIn: 900 }, // 15 min
  );
  return NextResponse.json({ url, filename: doc.filename, contentType: doc.contentType, sizeBytes: doc.sizeBytes });
}

/** DELETE /api/documents/:id — șterge din R2 + DB. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const [doc] = await db.select().from(schema.courierDocuments).where(eq(schema.courierDocuments.id, n)).limit(1);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  const user = await currentSyncUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await canAccessCourier(user, doc.courierId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: doc.r2Key }));
  } catch {}
  await db.delete(schema.courierDocuments).where(eq(schema.courierDocuments.id, n));
  return NextResponse.json({ ok: true });
}
