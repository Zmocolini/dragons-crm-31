import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";
import { createInvitation, INVITE_DAYS, listInvitations, markEmailSent } from "@/lib/auth/invitations";
import { inviteEmail, mailConfigured, sendMail } from "@/lib/mail";
import { db, schema } from "@/lib/db/client";
import { eq } from "drizzle-orm";

async function requireGlobalOwner() {
  const user = await getSessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  return user && user.role === "global_owner" ? user : null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET — invitațiile (fără tokenuri) + dacă emailul e configurat. */
export async function GET() {
  if (!(await requireGlobalOwner())) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  return NextResponse.json({ invitations: await listInvitations(), mailConfigured: mailConfigured() });
}

/** POST {email, name} — creează invitația și încearcă trimiterea pe email.
 *  Linkul în clar se întoarce doar aici (tokenul nu se păstrează), ca ownerul să-l poată copia dacă emailul nu pleacă. */
export async function POST(req: NextRequest) {
  const owner = await requireGlobalOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const name = String(body?.name ?? "").trim().slice(0, 120);
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "email invalid" }, { status: 400 });
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (exists) return NextResponse.json({ error: "există deja un cont cu acest email" }, { status: 409 });

  const inv = await createInvitation({ email, name, invitedBy: owner.id });
  const base = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");
  const link = `${base}/invite?token=${inv.token}`;
  const mail = await sendMail({ to: email, ...inviteEmail({ name, link, days: INVITE_DAYS, inviter: owner.name || owner.email }) });
  if (mail.ok) await markEmailSent(inv.id);
  return NextResponse.json({ ok: true, id: inv.id, link, emailSent: mail.ok, emailError: mail.ok ? null : mail.error });
}
