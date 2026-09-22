import type { Role } from "@/lib/rbac/roles";
import type { TeamRoleKey } from "@/lib/settings/types";

// Rolurile RBAC (viewer, global_owner, subcontractor_owner, operator_payments,
// operator_recruitment) NU se suprapun 1:1 cu rolurile Team (fleet_admin,
// subcontractor_admin, hr, payments etc.). Când salvăm un cont creat cu rol RBAC
// în tabela team.members, îl mapăm aici la un TeamRoleKey valid, altfel tabelul din
// Setări > Utilizatori crashează la ROLE_ICON[undefined].

const RBAC_TO_TEAM: Record<Role, TeamRoleKey> = {
  global_owner:         "global_owner",
  subcontractor_owner:  "subcontractor_admin",
  operator_payments:    "payments",
  operator_recruitment: "hr",
  viewer:               "viewer",
};

export function rbacRoleToTeamRole(role: Role): TeamRoleKey {
  return RBAC_TO_TEAM[role] ?? "viewer";
}
