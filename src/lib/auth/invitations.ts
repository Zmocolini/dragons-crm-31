import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, rawDb, schema } from "@/lib/db/client";

export const INVITE_DAYS = 7;

let ready: Promise<unknown> | null = null;
/** Tabela se creează la prima folosire (ca `crm_records`) — nu cere `drizzle-kit push`. */
function ensureTable() {
  ready ??= rawDb.batch([
    `CREATE TABLE IF NOT EXISTS invitations (
      id text PRIMARY KEY NOT NULL,
      token_hash text NOT NULL UNIQUE,
      email text NOT NULL,
      name text NOT NULL DEFAULT '',
      role text NOT NULL DEFAULT 'subcontractor_owner',
      invited_by text NOT NULL,
      created_at_iso text NOT NULL DEFAULT (current_timestamp),
      expires_at_iso text NOT NULL,
      accepted_at_iso text,
      revoked_at_iso text,
      email_sent_at_iso text
    )`,
    `CREATE INDEX IF NOT EXISTS invitations_email ON invitations(email)`,
  ]);
  return ready;
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export function invitationStatus(i: { acceptedAtIso: string | null; revokedAtIso: string | null; expiresAtIso: string }): InvitationStatus {
  if (i.acceptedAtIso) return "accepted";
  if (i.revokedAtIso) return "revoked";
  return i.expiresAtIso < new Date().toISOString() ? "expired" : "pending";
}

/** Creează invitația (revocă cele în așteptare pentru același email). Întoarce tokenul în clar — o singură dată. */
export async function createInvitation(p: { email: string; name: string; invitedBy: string }) {
  await ensureTable();
  const now = new Date().toISOString();
  await db.update(schema.invitations).set({ revokedAtIso: now })
    .where(and(eq(schema.invitations.email, p.email), isNull(schema.invitations.acceptedAtIso), isNull(schema.invitations.revokedAtIso)));
  const token = randomBytes(32).toString("base64url");
  const id = `inv_${randomBytes(6).toString("hex")}`;
  const expiresAtIso = new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString();
  await db.insert(schema.invitations).values({
    id, tokenHash: hashToken(token), email: p.email, name: p.name,
    role: "subcontractor_owner", invitedBy: p.invitedBy, expiresAtIso,
  });
  return { id, token, expiresAtIso };
}

export async function markEmailSent(id: string) {
  await db.update(schema.invitations).set({ emailSentAtIso: new Date().toISOString() }).where(eq(schema.invitations.id, id));
}

export async function listInvitations() {
  await ensureTable();
  const rows = await db.select().from(schema.invitations).orderBy(desc(schema.invitations.createdAtIso));
  return rows.map(({ tokenHash: _h, ...r }) => ({ ...r, status: invitationStatus(r) }));
}

export async function revokeInvitation(id: string) {
  await ensureTable();
  await db.update(schema.invitations).set({ revokedAtIso: new Date().toISOString() })
    .where(and(eq(schema.invitations.id, id), isNull(schema.invitations.acceptedAtIso)));
}

/** Invitația validă (în așteptare) pentru un token din link, sau null. */
export async function findPendingByToken(token: string) {
  await ensureTable();
  const [row] = await db.select().from(schema.invitations).where(eq(schema.invitations.tokenHash, hashToken(token))).limit(1);
  if (!row) return { row: null, status: "missing" as const };
  return { row, status: invitationStatus(row) };
}

/** Marchează folosită, atomic: întoarce false dacă altcineva a consumat-o între timp. */
export async function consumeInvitation(id: string): Promise<boolean> {
  const res = await rawDb.execute({
    sql: "UPDATE invitations SET accepted_at_iso = ? WHERE id = ? AND accepted_at_iso IS NULL AND revoked_at_iso IS NULL",
    args: [new Date().toISOString(), id],
  });
  return res.rowsAffected === 1;
}
