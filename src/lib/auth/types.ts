import type { Role } from "@/lib/rbac/roles";
import type { FleetTenant } from "@/lib/rbac/session";

// TODO(real-users): mutare la Better-Auth cu Postgres + bcrypt hash + JWT session.
// Momentan totul stă în localStorage; hash-uim parolele cu SHA-256 (nu bcrypt) — nu e sigur pentru prod.

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;         // SHA-256 hex
  role: Role;
  fleetId: string;              // flota principală (owner) sau la care aparține (membru)
  avatarDataUrl: string | null;
  createdAtIso: string;
  lastLoginIso: string | null;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  fleetName: string;            // nume flotă nouă (dacă e first owner)
  fleetCity: string;
  fleetCountry: string;
  fleetCui: string | null;
  vatPayer: boolean;
  flagEmoji: string | null;
  brandColor: string | null;
  logoDataUrl: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type Session = {
  userId: string;
  createdAtIso: string;
  expiresAtIso: string;
};

export type ActiveSessionUser = AccountUser & {
  fleet: FleetTenant;
};

export type Invitation = {
  token: string;                // ULID/random, folosit în URL
  email: string;
  name: string | null;          // opțional (pre-completat de owner)
  role: Role;
  fleetId: string;              // flota la care se alătură
  invitedByUserId: string;
  createdAtIso: string;
  expiresAtIso: string;         // 7 zile
  acceptedAtIso: string | null; // null cât timp e pending
};

export type CreateInvitationInput = {
  email: string;
  name?: string | null;
  role: Role;
};

export type CreateUserDirectInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
};

export type AcceptInvitationInput = {
  token: string;
  name: string;
  password: string;
};

export type AuthContextValue = {
  hydrated: boolean;
  current: ActiveSessionUser | null;   // null = neautentificat
  login: (input: LoginInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (input: RegisterInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  updateProfile: (patch: Partial<Pick<AccountUser, "name" | "avatarDataUrl">>) => void;
  updateMyFleet: (patch: Partial<Pick<FleetTenant, "name" | "city" | "country" | "vatPayer" | "cui" | "logoDataUrl" | "flagEmoji" | "brandColor">>) => void;

  /** Invitații emise de flota curentă. */
  invitations: Invitation[];
  createInvitation: (input: CreateInvitationInput) => { ok: true; invitation: Invitation; link: string } | { ok: false; error: string };
  revokeInvitation: (token: string) => void;
  findInvitation: (token: string) => Invitation | null;
  acceptInvitation: (input: AcceptInvitationInput) => Promise<{ ok: true } | { ok: false; error: string }>;

  /** Creează cont direct (fără email) — owner-ul setează parola pe loc. */
  createUserDirect: (input: CreateUserDirectInput) => Promise<{ ok: true; user: AccountUser } | { ok: false; error: string }>;

  /** Găsește user în auth după email (case-insensitive). Null dacă e user mock/legacy. */
  findUserByEmail: (email: string) => AccountUser | null;
  /** Actualizează nume/email/rol pentru un user din auth. */
  updateUser: (id: string, patch: Partial<Pick<AccountUser, "name" | "email" | "role">>) => { ok: true } | { ok: false; error: string };
  /** Resetează parola. Returnează parola nouă în plain (o singură dată). */
  resetUserPassword: (id: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Șterge cont din auth. Nu poți șterge propriul cont sau ultimul owner. */
  deleteUser: (id: string) => { ok: true } | { ok: false; error: string };
};

/** SHA-256 hex al unui string (folosind SubtleCrypto, disponibil în browser). */
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
