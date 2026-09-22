import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { hashPassword, newUserId, createSession, SESSION_COOKIE } from "@/lib/auth/core";

/** POST /api/auth/create-super-admin — creează contul Super Admin. UNIC pe sistem.
 *  Refuză dacă există deja un super_admin. Se poate crea:
 *    - liber, dacă nu există niciun super_admin (setup inițial)
 *    - din contul unui alt super_admin (viitor, pentru rotire) */
export async function POST(req: NextRequest) {
  // Verific unicitatea
  const [existing] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "super_admin"))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: "Există deja un Super Admin în sistem. Rotirea se face doar prin contul curent." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  if (!email || !password) return NextResponse.json({ error: "email + parolă obligatorii" }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ error: "parola min. 10 caractere pentru Super Admin" }, { status: 400 });

  // Refuz dacă emailul e deja folosit
  const [dup] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (dup) return NextResponse.json({ error: "Emailul e deja folosit de alt cont. Alege alt email pentru Super Admin." }, { status: 409 });

  const id = newUserId();
  const passwordHash = await hashPassword(password);
  await db.insert(schema.users).values({
    id, email, passwordHash,
    name: name || "Super Admin",
    role: "super_admin",
    active: true,
  });

  // Log in automat cu contul nou creat (cookie session-only)
  const token = await createSession(id, req.headers.get("user-agent") ?? undefined);
  (await cookies()).set({
    name: SESSION_COOKIE, value: token,
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return NextResponse.json({ ok: true, user: { id, email, name, role: "super_admin" } });
}

/** GET /api/auth/create-super-admin — verifică dacă există super_admin (pentru UI). */
export async function GET() {
  const [existing] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "super_admin"))
    .limit(1);
  return NextResponse.json({ exists: !!existing });
}
