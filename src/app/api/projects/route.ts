import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";

/** GET /api/projects — TOATE proiectele (vizibile pentru toți userii autentificați). */
export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await db.select().from(schema.entrepreneurProjects).orderBy(desc(schema.entrepreneurProjects.createdAtIso));
  return NextResponse.json({ projects: rows });
}

/** POST /api/projects — orice user autentificat poate posta un proiect. */
export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const category = String(body?.category ?? "").trim();
  const url = String(body?.url ?? "").trim();
  if (!title) return NextResponse.json({ error: "titlu obligatoriu" }, { status: 400 });
  const id = `prj_${randomBytes(6).toString("hex")}`;
  await db.insert(schema.entrepreneurProjects).values({
    id, title, description, category, url,
    createdByEmail: user.email, createdByName: user.name,
  });
  return NextResponse.json({ ok: true, id });
}
