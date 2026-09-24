import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";

/** DELETE /api/projects/:id — proprietar sau Global Owner. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const [row] = await db.select().from(schema.entrepreneurProjects).where(eq(schema.entrepreneurProjects.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.createdByEmail !== user.email && user.role !== "global_owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await db.delete(schema.entrepreneurProjects).where(eq(schema.entrepreneurProjects.id, id));
  return NextResponse.json({ ok: true });
}
