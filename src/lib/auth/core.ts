import "server-only";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const SESSION_COOKIE = "crm31_session";
export const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function newUserId(): string {
  return `usr_${randomBytes(8).toString("hex")}`;
}

/** Verifică dacă există DEJA cel puțin un utilizator în DB. Folosit ca să afișăm Setup vs Login. */
export async function anyUserExists(): Promise<boolean> {
  const [row] = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  return !!row;
}

/** Verifică dacă există un Global Owner (unic în sistem). */
export async function globalOwnerExists(): Promise<boolean> {
  const [row] = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "global_owner"))
    .limit(1);
  return !!row;
}

/** Găsește sesiunea + user-ul asociat, dacă e validă și neexpirată. */
export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const now = new Date().toISOString();
  const [row] = await db.select({
    userId: schema.sessions.userId,
    email:  schema.users.email,
    name:   schema.users.name,
    role:   schema.users.role,
    active: schema.users.active,
  })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.token, token))
    .limit(1);
  if (!row) return null;
  // check expiry
  const [expiryRow] = await db.select({ expiresAtIso: schema.sessions.expiresAtIso })
    .from(schema.sessions)
    .where(eq(schema.sessions.token, token))
    .limit(1);
  if (!expiryRow || expiryRow.expiresAtIso < now) return null;
  if (!row.active) return null;
  return { id: row.userId, email: row.email, name: row.name, role: row.role };
}

/** Creează sesiune nouă în DB, cu expirare la SESSION_DAYS. */
export async function createSession(userId: string, userAgent?: string, ip?: string): Promise<string> {
  const token = newSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await db.insert(schema.sessions).values({
    token, userId,
    expiresAtIso: expiresAt.toISOString(),
    userAgent: userAgent ?? null,
    ip: ip ?? null,
  });
  await db.update(schema.users)
    .set({ lastLoginIso: new Date().toISOString() })
    .where(eq(schema.users.id, userId));
  return token;
}

/** Șterge sesiunea (logout). */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
}

/** Cleanup periodic: șterge sesiunile expirate (best-effort, la fiecare login).
 *  FIX: era `gt` (ștergea sesiunile VALIDE) → acum `lt` (șterge doar cele expirate). */
export async function cleanExpiredSessions(): Promise<void> {
  const now = new Date().toISOString();
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAtIso, now));
}
