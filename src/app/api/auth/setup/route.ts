import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db/client";
import { anyUserExists, hashPassword, newUserId, createSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/core";

/** POST /api/auth/setup — creează PRIMUL utilizator (Global Owner) dacă nu există niciunul.
 *  Refuză dacă există deja utilizatori (nu se poate face „hijack" la setup). */
export async function POST(req: NextRequest) {
  if (await anyUserExists()) {
    return NextResponse.json({ error: "Setup deja făcut. Folosește /login." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  if (!email || !password) return NextResponse.json({ error: "email + parolă obligatorii" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "parola min. 8 caractere" }, { status: 400 });

  const id = newUserId();
  const passwordHash = await hashPassword(password);
  await db.insert(schema.users).values({
    id, email, passwordHash, name: name || email.split("@")[0],
    role: "global_owner", active: true,
  });

  const token = await createSession(id, req.headers.get("user-agent") ?? undefined);
  // Cookie SESSION-ONLY: fără maxAge/expires → browser-ul îl șterge la închidere.
  (await cookies()).set({
    name: SESSION_COOKIE, value: token,
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return NextResponse.json({ ok: true, user: { id, email, name, role: "global_owner" } });
}
