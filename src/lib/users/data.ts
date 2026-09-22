import { ROLE_LABELS, type Role } from "@/lib/rbac/roles";
import type { TeamMember, TeamRoleKey } from "@/lib/settings/types";

// Modul Utilizatori — seed determinist conectat la RBAC-ul real (roles/ACCESS_MATRIX).
// TODO(real-users): tabel `users` + `user_roles` din Better-Auth.

export type UserStatus = "active" | "inactive" | "invited";
export const USER_STATUS_LABEL: Record<UserStatus, string> = { active: "Activ", inactive: "Inactiv", invited: "Invitat" };

export const ROLE_BADGE_STYLE: Record<Role, string> = {
  global_owner: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  subcontractor_owner: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  operator_recruitment: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25",
  operator_payments: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  viewer: "bg-slate-500/15 text-slate-300 border-slate-500/25",
};
export const ROLE_SUBTITLE: Record<Role, string> = {
  global_owner: "Global Owner", subcontractor_owner: "Owner flotă", operator_recruitment: "Recrutare",
  operator_payments: "Operator plăți", viewer: "Doar vizualizare",
};

export type AppUser = {
  id: string; name: string; email: string; role: Role; department: string;
  status: UserStatus; lastLoginLabel: string; phone: string; location: string; memberSince: string;
};

// TODO(real-users): SELECT * FROM users JOIN user_roles WHERE tenant_id = $1.
export function buildUsers(_fleetId: string): AppUser[] {
  return [];
}

// Mapare rol Team → rol RBAC (pentru afișare în UsersPage cu permission checks).
const TEAM_TO_RBAC_ROLE: Record<TeamRoleKey, Role> = {
  global_owner:        "global_owner",
  fleet_admin:         "subcontractor_owner",
  subcontractor_admin: "subcontractor_owner",
  hr:                  "operator_recruitment",
  payments:            "operator_payments",
  viewer:              "viewer",
};

function relativeLabel(iso: string | null): string {
  if (!iso) return "Niciodată";
  const diff = Date.now() - Date.parse(iso);
  const min = Math.floor(diff / 60_000);
  if (min < 1)      return "acum";
  if (min < 60)     return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)       return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30)       return `${d} zile`;
  return new Date(iso).toLocaleDateString("ro-RO");
}

/** Adapter: TeamMember (din settings) → AppUser (pt UsersPage). Sursa unică de adevăr. */
export function teamMembersToAppUsers(members: TeamMember[]): AppUser[] {
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    role: TEAM_TO_RBAC_ROLE[m.role],
    department: m.workspaceAll ? "Toate flotele" : m.workspace,
    status:
      m.status === "active"    ? "active" as const :
      m.status === "invited"   ? "invited" as const :
      "inactive" as const,
    lastLoginLabel: relativeLabel(m.lastActiveIso),
    phone: "—",
    location: "—",
    memberSince: m.invitedAtIso ? new Date(m.invitedAtIso).toLocaleDateString("ro-RO") : "—",
  }));
}

// Grupări KPI (mapate pe rolurile reale)
export const ROLE_GROUPS: Array<{ key: string; label: string; roles: Role[] }> = [
  { key: "admin", label: "Administratori", roles: ["global_owner"] },
  { key: "operators", label: "Operatori", roles: ["operator_payments"] },
  { key: "hr", label: "HR Manageri", roles: ["operator_recruitment"] },
  { key: "fleet", label: "Manageri flotă", roles: ["subcontractor_owner"] },
  { key: "viewer", label: "Viewer", roles: ["viewer"] },
];

export { ROLE_LABELS };
