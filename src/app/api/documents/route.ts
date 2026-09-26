import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { r2, R2_BUCKET, keyForCourierDoc } from "@/lib/r2/client";
import { canAccessCourier, currentSyncUser } from "@/lib/sync/server";

const MAX_SIZE_MB = 10;

const ALLOWED_DOC_TYPES = new Set(["ci", "permis", "contract", "medical", "asigurare", "foto", "alt"]);

/** GET /api/documents?courierId=xxx — listează documentele unui curier. */
export async function GET(req: NextRequest) {
  const courierId = req.nextUrl.searchParams.get("courierId");
  if (!courierId) return NextResponse.json({ error: "courierId required" }, { status: 400 });
  const user = await currentSyncUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await canAccessCourier(user, courierId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = await db.select()
    .from(schema.courierDocuments)
    .where(eq(schema.courierDocuments.courierId, courierId))
    .orderBy(desc(schema.courierDocuments.uploadedAtIso));
  return NextResponse.json({ documents: rows });
}

/** POST /api/documents — upload fișier pentru un curier (multipart form-data). */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const courierId = String(form.get("courierId") ?? "").trim();
  const docType = String(form.get("docType") ?? "alt").trim().toLowerCase();
  const uploadedBy = String(form.get("uploadedBy") ?? "").trim();

  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });
  if (!courierId) return NextResponse.json({ error: "courierId required" }, { status: 400 });
  const user = await currentSyncUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await canAccessCourier(user, courierId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!ALLOWED_DOC_TYPES.has(docType)) {
    return NextResponse.json({ error: `docType invalid (permise: ${[...ALLOWED_DOC_TYPES].join(", ")})` }, { status: 400 });
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Fișier prea mare (max ${MAX_SIZE_MB} MB)` }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = keyForCourierDoc(courierId, docType, file.name);

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buf,
    ContentType: file.type || "application/octet-stream",
  }));

  const [inserted] = await db.insert(schema.courierDocuments).values({
    courierId,
    docType,
    filename: file.name,
    r2Key: key,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    uploadedBy: uploadedBy || null,
  }).returning();

  return NextResponse.json({ ok: true, document: inserted });
}
