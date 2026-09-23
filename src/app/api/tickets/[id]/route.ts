import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";

/** PATCH /api/tickets/:id — Global Owner modifică status / assignee / prioritate. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user || user.role !== "global_owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = { updatedAtIso: new Date().toISOString() };
  if (typeof body?.status === "string") patch.status = body.status;
  if (typeof body?.priority === "string") patch.priority = body.priority;
  if (typeof body?.assignee === "string") patch.assignee = body.assignee;
  await db.update(schema.tickets).set(patch).where(eq(schema.tickets.id, id));
  return NextResponse.json({ ok: true });
}

/** DELETE /api/tickets/:id — Global Owner șterge un tichet. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user || user.role !== "global_owner") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(schema.tickets).where(eq(schema.tickets.id, id));
  return NextResponse.json({ ok: true });
}
