"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import type { FleetTenant } from "@/lib/rbac/session";
import {
  sha256, type AccountUser, type ActiveSessionUser,
  type AcceptInvitationInput, type AuthContextValue, type CreateInvitationInput,
  type CreateUserDirectInput, type Invitation, type LoginInput, type RegisterInput, type Session,
} from "./types";

const USERS_KEY       = "crm31-auth-users";
const FLEETS_KEY      = "crm31-auth-fleets";
const SESSION_KEY     = "crm31-auth-session";
const INVITATIONS_KEY = "crm31-auth-invitations";
const SESSION_TTL_MS  = 30 * 24 * 60 * 60 * 1000; // 30 zile
const INVITE_TTL_MS   = 7  * 24 * 60 * 60 * 1000; // 7 zile

const AuthContext = createContext<AuthContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function safeWrite<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Sync cross-context: după acceptarea invitației, trec team-member-ul cu același email
 * de la status="invited" la "active" prin scriere directă în localStorage.
 * Settings-provider îl re-citește la reload.
 */
function activateTeamMemberByEmail(email: string): void {
  try {
    const raw = localStorage.getItem("crm31-settings");
    if (!raw) return;
    const parsed = JSON.parse(raw) as { team?: { members?: Array<Record<string, unknown>> } };
    const members = parsed?.team?.members;
    if (!Array.isArray(members)) return;
    const target = email.toLowerCase();
    let changed = false;
    for (const m of members) {
      if (typeof m.email === "string" && m.email.toLowerCase() === target && m.status === "invited") {
        m.status = "active";
        m.lastActiveIso = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) localStorage.setItem("crm31-settings", JSON.stringify(parsed));
  } catch {}
}

/** Seed: primul owner Dragon Delivery pentru login rapid demo. */
async function seedDemoIfEmpty(users: AccountUser[], fleets: FleetTenant[]): Promise<{ users: AccountUser[]; fleets: FleetTenant[] }> {
  if (users.length > 0) return { users, fleets };
  const demoFleet: FleetTenant = {
    id:            "t_dragon",
    name:          "Dragon Delivery",
    slug:          "dragon-delivery",
    city:          "București",
    country:       "România",
    cui:           "RO12345678",
    planLabel:     "Plan Business",
    planTier:      "business",
    planUsage:     { used: 0, total: 500 },
    logoDataUrl:   null,
    flagEmoji:     "🐉",
    brandColor:    "#f97316",
  };
  const demoUser: AccountUser = {
    id:            "u_demo",
    name:          "Demo Owner",
    email:         "demo@dragondelivery.ro",
    passwordHash:  await sha256("demo1234"),
    role:          "global_owner",
    fleetId:       demoFleet.id,
    avatarDataUrl: null,
    createdAtIso:  new Date().toISOString(),
    lastLoginIso:  null,
  };
  return { users: [demoUser], fleets: [demoFleet] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [fleets, setFleets] = useState<FleetTenant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const loadedUsers = safeRead<AccountUser[]>(USERS_KEY, []);
      const loadedFleets = safeRead<FleetTenant[]>(FLEETS_KEY, []);
      const seeded = await seedDemoIfEmpty(loadedUsers, loadedFleets);
      setUsers(seeded.users);
      setFleets(seeded.fleets);
      setInvitations(safeRead<Invitation[]>(INVITATIONS_KEY, []));
      if (seeded.users !== loadedUsers) safeWrite(USERS_KEY, seeded.users);
      if (seeded.fleets !== loadedFleets) safeWrite(FLEETS_KEY, seeded.fleets);

      const s = safeRead<Session | null>(SESSION_KEY, null);
      if (s && new Date(s.expiresAtIso).getTime() > Date.now()) {
        setSession(s);
      } else if (s) {
        safeWrite(SESSION_KEY, null);
      }
      setHydrated(true);
    })();
  }, []);

  const current = useMemo<ActiveSessionUser | null>(() => {
    if (!session) return null;
    const u = users.find((x) => x.id === session.userId);
    if (!u) return null;
    const f = fleets.find((x) => x.id === u.fleetId);
    if (!f) return null;
    return { ...u, fleet: f };
  }, [session, users, fleets]);

  const persistUsers       = useCallback((next: AccountUser[]) => { setUsers(next);        safeWrite(USERS_KEY, next); }, []);
  const persistFleets      = useCallback((next: FleetTenant[]) => { setFleets(next);       safeWrite(FLEETS_KEY, next); }, []);
  const persistInvitations = useCallback((next: Invitation[])  => { setInvitations(next);  safeWrite(INVITATIONS_KEY, next); }, []);

  const login = useCallback(async (input: LoginInput): Promise<{ ok: true } | { ok: false; error: string }> => {
    const email = input.email.trim().toLowerCase();
    const u = users.find((x) => x.email.toLowerCase() === email);
    if (!u) return { ok: false, error: "Email inexistent." };
    const hash = await sha256(input.password);
    if (hash !== u.passwordHash) return { ok: false, error: "Parolă greșită." };
    const now = new Date();
    const newSession: Session = {
      userId: u.id,
      createdAtIso: now.toISOString(),
      expiresAtIso: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    };
    setSession(newSession);
    safeWrite(SESSION_KEY, newSession);
    persistUsers(users.map((x) => x.id === u.id ? { ...x, lastLoginIso: now.toISOString() } : x));
    return { ok: true };
  }, [users, persistUsers]);

  const register = useCallback(async (input: RegisterInput): Promise<{ ok: true } | { ok: false; error: string }> => {
    const email = input.email.trim().toLowerCase();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, error: "Există deja un cont cu acest email." };
    }
    if (input.password.length < 6) return { ok: false, error: "Parola trebuie să aibă min. 6 caractere." };
    if (!input.fleetName.trim()) return { ok: false, error: "Numele flotei e obligatoriu." };

    const fleet: FleetTenant = {
      id:            uid("t"),
      name:          input.fleetName.trim(),
      slug:          input.fleetName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      city:          input.fleetCity.trim() || "—",
      country:       input.fleetCountry.trim() || "România",
      cui:           input.fleetCui?.trim() || "",
      planLabel:     "Trial 14 zile",
      planTier:      "trial",
      planUsage:     { used: 0, total: 50 },
      logoDataUrl:   input.logoDataUrl,
      flagEmoji:     input.flagEmoji,
      brandColor:    input.brandColor,
    };
    const user: AccountUser = {
      id:            uid("u"),
      name:          input.name.trim(),
      email:         email,
      passwordHash:  await sha256(input.password),
      role:          "global_owner",
      fleetId:       fleet.id,
      avatarDataUrl: null,
      createdAtIso:  new Date().toISOString(),
      lastLoginIso:  new Date().toISOString(),
    };

    persistUsers([...users, user]);
    persistFleets([...fleets, fleet]);

    const newSession: Session = {
      userId: user.id,
      createdAtIso: new Date().toISOString(),
      expiresAtIso: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    setSession(newSession);
    safeWrite(SESSION_KEY, newSession);
    return { ok: true };
  }, [users, fleets, persistUsers, persistFleets]);

  const logout = useCallback(() => {
    setSession(null);
    safeWrite(SESSION_KEY, null);
  }, []);

  // ── Invitații ──────────────────────────────────────────────────────────────

  const createInvitation = useCallback((input: CreateInvitationInput) => {
    if (!current) return { ok: false as const, error: "Trebuie să fii autentificat." };
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false as const, error: "Email invalid." };
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false as const, error: "Există deja un cont cu acest email." };
    }
    if (invitations.some((i) => i.email.toLowerCase() === email && !i.acceptedAtIso && new Date(i.expiresAtIso).getTime() > Date.now())) {
      return { ok: false as const, error: "Există deja o invitație activă pentru acest email." };
    }
    const now = new Date();
    const invitation: Invitation = {
      token:           uid("inv"),
      email,
      name:            input.name?.trim() || null,
      role:            input.role,
      fleetId:         current.fleetId,
      invitedByUserId: current.id,
      createdAtIso:    now.toISOString(),
      expiresAtIso:    new Date(now.getTime() + INVITE_TTL_MS).toISOString(),
      acceptedAtIso:   null,
    };
    persistInvitations([invitation, ...invitations]);
    const link = typeof window !== "undefined"
      ? `${window.location.origin}/invite?token=${invitation.token}`
      : `/invite?token=${invitation.token}`;
    // TODO(real-users): trimite email real cu link-ul (SendGrid / Postmark / Resend).
    return { ok: true as const, invitation, link };
  }, [current, users, invitations, persistInvitations]);

  const revokeInvitation = useCallback((token: string) => {
    persistInvitations(invitations.filter((i) => i.token !== token));
  }, [invitations, persistInvitations]);

  const findInvitation = useCallback((token: string): Invitation | null => {
    const inv = invitations.find((i) => i.token === token);
    if (!inv) return null;
    return inv;
  }, [invitations]);

  const acceptInvitation = useCallback(async (input: AcceptInvitationInput): Promise<{ ok: true } | { ok: false; error: string }> => {
    const inv = invitations.find((i) => i.token === input.token);
    if (!inv) return { ok: false as const, error: "Invitație inexistentă sau revocată." };
    if (inv.acceptedAtIso) return { ok: false as const, error: "Această invitație a fost deja folosită." };
    if (new Date(inv.expiresAtIso).getTime() < Date.now()) return { ok: false as const, error: "Invitația a expirat." };
    if (input.password.length < 6) return { ok: false as const, error: "Parola trebuie să aibă min. 6 caractere." };
    if (users.some((u) => u.email.toLowerCase() === inv.email.toLowerCase())) {
      return { ok: false as const, error: "Există deja un cont cu acest email." };
    }
    const user: AccountUser = {
      id:            uid("u"),
      name:          input.name.trim() || inv.name || inv.email.split("@")[0],
      email:         inv.email,
      passwordHash:  await sha256(input.password),
      role:          inv.role,
      fleetId:       inv.fleetId,
      avatarDataUrl: null,
      createdAtIso:  new Date().toISOString(),
      lastLoginIso:  new Date().toISOString(),
    };
    persistUsers([...users, user]);
    persistInvitations(invitations.map((i) => i.token === inv.token ? { ...i, acceptedAtIso: new Date().toISOString() } : i));
    activateTeamMemberByEmail(inv.email);
    // Auto-login: creează sesiune direct
    const newSession: Session = {
      userId: user.id,
      createdAtIso: new Date().toISOString(),
      expiresAtIso: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    setSession(newSession);
    safeWrite(SESSION_KEY, newSession);
    return { ok: true as const };
  }, [invitations, users, persistUsers, persistInvitations]);

  // ── Cont direct (fără email) ───────────────────────────────────────────────
  const createUserDirect = useCallback(async (input: CreateUserDirectInput): Promise<{ ok: true; user: AccountUser } | { ok: false; error: string }> => {
    if (!current) return { ok: false as const, error: "Trebuie să fii autentificat." };
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false as const, error: "Email invalid." };
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false as const, error: "Există deja un cont cu acest email." };
    }
    if (input.password.length < 6) return { ok: false as const, error: "Parola trebuie să aibă min. 6 caractere." };
    if (!input.name.trim()) return { ok: false as const, error: "Numele e obligatoriu." };

    const user: AccountUser = {
      id:            uid("u"),
      name:          input.name.trim(),
      email,
      passwordHash:  await sha256(input.password),
      role:          input.role,
      fleetId:       current.fleetId,
      avatarDataUrl: null,
      createdAtIso:  new Date().toISOString(),
      lastLoginIso:  null,
    };
    persistUsers([...users, user]);
    return { ok: true as const, user };
  }, [current, users, persistUsers]);

  // ── Management users (editează / resetează parolă / șterge) ────────────────

  const findUserByEmail = useCallback((email: string): AccountUser | null => {
    const q = email.trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === q) ?? null;
  }, [users]);

  const updateUser = useCallback((id: string, patch: Partial<Pick<AccountUser, "name" | "email" | "role">>) => {
    const target = users.find((u) => u.id === id);
    if (!target) return { ok: false as const, error: "Utilizator inexistent." };
    if (patch.email) {
      const nextEmail = patch.email.trim().toLowerCase();
      if (users.some((u) => u.id !== id && u.email.toLowerCase() === nextEmail)) {
        return { ok: false as const, error: "Există deja alt cont cu acest email." };
      }
      patch.email = nextEmail;
    }
    if (patch.role && target.role === "global_owner" && patch.role !== "global_owner") {
      const owners = users.filter((u) => u.fleetId === target.fleetId && u.role === "global_owner");
      if (owners.length <= 1) return { ok: false as const, error: "Nu poți retrograda ultimul Global Owner al flotei." };
    }
    persistUsers(users.map((u) => u.id === id ? { ...u, ...patch } : u));
    return { ok: true as const };
  }, [users, persistUsers]);

  const resetUserPassword = useCallback(async (id: string, newPassword: string) => {
    if (newPassword.length < 6) return { ok: false as const, error: "Parola trebuie să aibă min. 6 caractere." };
    const target = users.find((u) => u.id === id);
    if (!target) return { ok: false as const, error: "Utilizator inexistent." };
    const passwordHash = await sha256(newPassword);
    persistUsers(users.map((u) => u.id === id ? { ...u, passwordHash } : u));
    return { ok: true as const };
  }, [users, persistUsers]);

  const deleteUser = useCallback((id: string) => {
    if (current && current.id === id) return { ok: false as const, error: "Nu-ți poți șterge propriul cont." };
    const target = users.find((u) => u.id === id);
    if (!target) return { ok: false as const, error: "Utilizator inexistent." };
    if (target.role === "global_owner") {
      const owners = users.filter((u) => u.fleetId === target.fleetId && u.role === "global_owner");
      if (owners.length <= 1) return { ok: false as const, error: "Nu poți șterge ultimul Global Owner al flotei." };
    }
    persistUsers(users.filter((u) => u.id !== id));
    return { ok: true as const };
  }, [current, users, persistUsers]);

  const updateProfile = useCallback((patch: Partial<Pick<AccountUser, "name" | "avatarDataUrl">>) => {
    if (!current) return;
    persistUsers(users.map((u) => u.id === current.id ? { ...u, ...patch } : u));
  }, [current, users, persistUsers]);

  const updateMyFleet = useCallback((patch: Partial<Pick<FleetTenant, "name" | "city" | "cui" | "logoDataUrl" | "flagEmoji" | "brandColor">>) => {
    if (!current) return;
    persistFleets(fleets.map((f) => f.id === current.fleetId ? { ...f, ...patch } : f));
  }, [current, fleets, persistFleets]);

  // Doar invitațiile flotei curente (filtrate pentru afișare)
  const myFleetInvitations = useMemo<Invitation[]>(() => {
    if (!current) return [];
    return invitations.filter((i) => i.fleetId === current.fleetId);
  }, [invitations, current]);

  const value = useMemo<AuthContextValue>(() => ({
    hydrated,
    current,
    login, register, logout,
    updateProfile, updateMyFleet,
    invitations: myFleetInvitations,
    createInvitation, revokeInvitation, findInvitation, acceptInvitation,
    createUserDirect,
    findUserByEmail, updateUser, resetUserPassword, deleteUser,
  }), [
    hydrated, current, login, register, logout, updateProfile, updateMyFleet,
    myFleetInvitations, createInvitation, revokeInvitation, findInvitation, acceptInvitation,
    createUserDirect,
    findUserByEmail, updateUser, resetUserPassword, deleteUser,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
