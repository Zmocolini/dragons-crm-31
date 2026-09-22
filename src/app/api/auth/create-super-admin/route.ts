import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { hashPassword, newUserId, createSession, SESSION_COOKIE } from "@/lib/auth/core";

// Emailul intern al Super Admin-ului — nu-l setează user-ul, e fix pe sistem.
export const SUPER_ADMIN_EMAIL = "super-admin@dragons.system";

/** POST /api/auth/create-super-admin — creează contul Super Admin (unic).
 *  Primește: name, password, hint (opțional). Emailul e fix intern. */
export async function POST(req: NextRequest) {
  const [existing] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "super_admin"))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "Există deja un Super Admin. Rotirea se face doar prin contul curent." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const hint = String(body?.hint ?? "").trim() || null;
  if (!password) return NextResponse.json({ error: "parola obligatorie" }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ error: "parola min. 10 caractere pentru Super Admin" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "numele obligatoriu" }, { status: 400 });

  const id = newUserId();
  const passwordHash = await hashPassword(password);
  await db.insert(schema.users).values({
    id, email: SUPER_ADMIN_EMAIL, passwordHash,
    name, role: "super_admin", active: true,
    passwordHint: hint,
  });

  const token = await createSession(id, req.headers.get("user-agent") ?? undefined);
  (await cookies()).set({
    name: SESSION_COOKIE, value: token,
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return NextResponse.json({ ok: true, user: { id, name, role: "super_admin" } });
}

/** GET /api/auth/create-super-admin — verifică existența + returnează hint-ul dacă există. */
export async function GET() {
  const [existing] = await db.select({
    id: schema.users.id,
    name: schema.users.name,
    hint: schema.users.passwordHint,
  })
    .from(schema.users)
    .where(eq(schema.users.role, "super_admin"))
    .limit(1);
  return NextResponse.json({
    exists: !!existing,
    name: existing?.name ?? null,
    hint: existing?.hint ?? null,
  });
}
