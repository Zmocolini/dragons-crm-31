import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db/client";
import { createSession, hashPassword, newUserId, SESSION_COOKIE } from "@/lib/auth/core";
import { consumeInvitation, findPendingByToken } from "@/lib/auth/invitations";

/** POST {name, password} — public, dar cere un token valid. Creează contul de subcontractor și îl loghează. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { row, status } = await findPendingByToken((await params).token);
  if (!row || status !== "pending") return NextResponse.json({ error: "invitație invalidă, expirată sau deja folosită" }, { status: 410 });
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 120) || row.name || row.email.split("@")[0];
  const password = String(body?.password ?? "");
  if (password.length < 8) return NextResponse.json({ error: "parola min. 8 caractere" }, { status: 400 });

  // Consumă întâi (atomic) — două cereri simultane nu pot crea două conturi din același link.
  if (!(await consumeInvitation(row.id))) return NextResponse.json({ error: "invitația a fost deja folosită" }, { status: 410 });
  const id = newUserId();
  try {
    await db.insert(schema.users).values({
      id, email: row.email, passwordHash: await hashPassword(password), name, role: "subcontractor_owner", active: true,
    });
  } catch {
    return NextResponse.json({ error: "există deja un cont cu acest email" }, { status: 409 });
  }
  const token = await createSession(id, req.headers.get("user-agent") ?? undefined);
  (await cookies()).set({
    name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production", path: "/",
  });
  return NextResponse.json({ ok: true });
}
