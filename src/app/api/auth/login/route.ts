import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { verifyPassword, createSession, SESSION_COOKIE, SESSION_DAYS, cleanExpiredSessions } from "@/lib/auth/core";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "email + parolă obligatorii" }, { status: 400 });

  const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!u || !u.active) return NextResponse.json({ error: "credențiale invalide" }, { status: 401 });
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return NextResponse.json({ error: "credențiale invalide" }, { status: 401 });

  const token = await createSession(u.id, req.headers.get("user-agent") ?? undefined);
  // Cookie SESSION-ONLY: fără maxAge/expires → șters la închiderea browserului.
  (await cookies()).set({
    name: SESSION_COOKIE, value: token,
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  // best-effort cleanup — nu blochează răspunsul
  cleanExpiredSessions().catch(() => {});
  return NextResponse.json({ ok: true, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
}
