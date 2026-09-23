import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, hashPassword, newUserId, SESSION_COOKIE } from "@/lib/auth/core";

const ALLOWED_ROLES = new Set(["global_owner", "subcontractor_owner"]);

async function requireGlobalOwner() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user || user.role !== "global_owner") return null;
  return user;
}

/** GET /api/admin/users — listează toate conturile (doar Global Owner). */
export async function GET() {
  const owner = await requireGlobalOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const rows = await db.select({
    id: schema.users.id,
    email: schema.users.email,
    name: schema.users.name,
    role: schema.users.role,
    active: schema.users.active,
    createdAtIso: schema.users.createdAtIso,
    lastLoginIso: schema.users.lastLoginIso,
  }).from(schema.users).orderBy(desc(schema.users.createdAtIso));
  return NextResponse.json({ users: rows });
}

/** POST /api/admin/users — creează un cont nou (Global Owner sau Subcontractor). */
export async function POST(req: NextRequest) {
  const owner = await requireGlobalOwner();
  if (!owner) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const role = String(body?.role ?? "subcontractor_owner").trim();
  if (!email || !password) return NextResponse.json({ error: "email + parolă obligatorii" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "parola min. 8 caractere" }, { status: 400 });
  if (!ALLOWED_ROLES.has(role)) return NextResponse.json({ error: "rol invalid" }, { status: 400 });

  const id = newUserId();
  const passwordHash = await hashPassword(password);
  try {
    await db.insert(schema.users).values({
      id, email, passwordHash,
      name: name || email.split("@")[0],
      role, active: true,
    });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    if (msg.includes("UNIQUE")) return NextResponse.json({ error: "email deja folosit" }, { status: 409 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true, user: { id, email, name, role } });
}
