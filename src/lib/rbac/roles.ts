// TODO(real-users): mutare la Better-Auth cu server-side session + permissions din DB.
// Enum-ul + access matrix aici sunt sursa de adevăr până când auth real aterizează.

export const ROLES = [
  "global_owner",
  "subcontractor_owner",
  "operator_payments",
  "operator_recruitment",
  "viewer",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  global_owner: "Global Owner",
  subcontractor_owner: "Subcontractor Owner",
  operator_payments: "Operator Payments",
  operator_recruitment: "Operator Recruitment",
  viewer: "Viewer",
};

export type Permission =
  | "dashboard.view"
  | "couriers.view"
  | "couriers.create"
  | "couriers.edit"
  | "candidates.view"
  | "candidates.create"
  | "payments.view"
  | "payments.create"
  | "reports.view"
  | "documents.view"
  | "documents.upload"
  | "vehicles.view"
  | "cazari.view"
  | "subcontractors.view"
  | "users.view"
  | "issues.view"
  | "calendar.view"
  | "ai.use"
  | "settings.view"
  | "tenant.switch";

/**
 * ACCESS_MATRIX — sursa de adevăr pentru ce vede fiecare rol.
 * Oglindită de sidebar nav și de dashboard-ul per rol.
 * TODO(real-users): oglindește în server-side authorization când Better-Auth aterizează.
 */
export const ACCESS_MATRIX: Record<Role, ReadonlySet<Permission>> = {
  global_owner: new Set<Permission>([
    "dashboard.view",
    "couriers.view",
    "couriers.create",
    "couriers.edit",
    "candidates.view",
    "candidates.create",
    "payments.view",
    "payments.create",
    "reports.view",
    "documents.view",
    "documents.upload",
    "vehicles.view",
    "cazari.view",
    "subcontractors.view",
    "users.view",
    "issues.view",
    "calendar.view",
    "ai.use",
    "settings.view",
    "tenant.switch",
  ]),
  subcontractor_owner: new Set<Permission>([
    "dashboard.view",
    "couriers.view",
    "couriers.create",
    "couriers.edit",
    "candidates.view",
    "candidates.create",
    "payments.view",
    "payments.create",
    "reports.view",
    "documents.view",
    "documents.upload",
    "vehicles.view",
    "cazari.view",
    "issues.view",
    "calendar.view",
    "ai.use",
    "settings.view",
  ]),
  operator_payments: new Set<Permission>([
    "dashboard.view",
    "couriers.view",
    "payments.view",
    "payments.create",
    "reports.view",
    "issues.view",
    "calendar.view",
  ]),
  operator_recruitment: new Set<Permission>([
    "dashboard.view",
    "candidates.view",
    "candidates.create",
    "documents.view",
    "documents.upload",
    "calendar.view",
    "ai.use",
  ]),
  viewer: new Set<Permission>([
    "dashboard.view",
    "couriers.view",
    "candidates.view",
    "reports.view",
    "documents.view",
    "vehicles.view",
    "calendar.view",
  ]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ACCESS_MATRIX[role].has(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
