import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";

/** GET /api/tickets — Global Owner vede TOATE, alți useri văd doar tichetele lor. */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let rows;
  if (user.role === "global_owner") {
    rows = await db.select().from(schema.tickets).orderBy(desc(schema.tickets.createdAtIso));
  } else {
    rows = await db.select()
      .from(schema.tickets)
      .where(eq(schema.tickets.createdByEmail, user.email))
      .orderBy(desc(schema.tickets.createdAtIso));
  }
  return NextResponse.json({ tickets: rows });
}

/** POST /api/tickets — orice user autentificat creează tichet nou. */
export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const requesterName = String(body?.requesterName ?? user.name).trim();
  const category = String(body?.category ?? "admin").trim();
  const priority = String(body?.priority ?? "normal").trim();
  const platform = String(body?.platform ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const bodyText = String(body?.body ?? "").trim();
  if (!subject) return NextResponse.json({ error: "subiect obligatoriu" }, { status: 400 });

  const id = `tk_${randomBytes(6).toString("hex")}`;
  await db.insert(schema.tickets).values({
    id,
    createdByEmail: user.email,
    createdByName: user.name,
    createdByRole: user.role,
    requesterName: requesterName || user.name,
    category, priority, platform, subject, body: bodyText,
    status: "open",
    assignee: "",
  });
  const [inserted] = await db.select().from(schema.tickets).where(eq(schema.tickets.id, id)).limit(1);
  return NextResponse.json({ ok: true, ticket: inserted });
}
