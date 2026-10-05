import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { verifyPassword, createSession, SESSION_COOKIE, SESSION_DAYS, cleanExpiredSessions } from "@/lib/auth/core";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  // Acceptăm fie email, fie nume (case-insensitive). Câmpul se numește tot „email" în request
  // pentru compat cu form-ul existent, dar tratăm ca „identifier".
  const identifier = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  if (!identifier || !password) return NextResponse.json({ error: "user + parolă obligatorii" }, { status: 400 });

  const idLower = identifier.toLowerCase();
  // Match pe email (lowercase) SAU nume (case-insensitive)
  const [u] = await db.select().from(schema.users).where(
    or(
      eq(schema.users.email, idLower),
      sql`lower(${schema.users.name}) = ${idLower}`,
    ),
  ).limit(1);
  if (!u || !u.active) return NextResponse.json({ error: "credențiale invalide" }, { status: 401 });
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return NextResponse.json({ error: "credențiale invalide" }, { status: 401 });

  const token = await createSession(u.id, req.headers.get("user-agent") ?? undefined);
  // „Ține-mă conectat" (implicit): cookie persistent cât sesiunea din DB. Debifat → cookie de sesiune
  // (șters la închiderea browserului), pentru calculatoare folosite în comun.
  const remember = body?.remember !== false;
  (await cookies()).set({
    name: SESSION_COOKIE, value: token,
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: SESSION_DAYS * 86400 } : {}),
  });
  // best-effort cleanup — nu blochează răspunsul
  cleanExpiredSessions().catch(() => {});
  return NextResponse.json({ ok: true, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
}
