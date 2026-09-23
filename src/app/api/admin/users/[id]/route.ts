import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, hashPassword, SESSION_COOKIE } from "@/lib/auth/core";

async function requireGlobalOwner() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user || user.role !== "global_owner") return null;
  return user;
}

/** PATCH /api/admin/users/:id — modifică activ / nume / parolă / rol. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireGlobalOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string") patch.name = body.name.trim();
  if (typeof body?.active === "boolean") patch.active = body.active;
  if (typeof body?.role === "string" && ["global_owner", "subcontractor_owner"].includes(body.role)) patch.role = body.role;
  if (typeof body?.password === "string" && body.password.length >= 8) {
    patch.passwordHash = await hashPassword(body.password);
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "nimic de modificat" }, { status: 400 });
  await db.update(schema.users).set(patch).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/users/:id — șterge un cont. Nu poți șterge propriul cont. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await requireGlobalOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  if (id === owner.id) return NextResponse.json({ error: "nu-ți poți șterge propriul cont" }, { status: 400 });
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  await db.delete(schema.users).where(eq(schema.users.id, id));
  return NextResponse.json({ ok: true });
}
