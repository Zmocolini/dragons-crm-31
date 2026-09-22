import "server-only";

import type { DashboardData, Stat } from "./types";
import type { Role } from "@/lib/rbac/roles";

// TODO(real-users): înlocuiește toți getterii cu queries pe Drizzle/Turso.
// Fiecare query trebuie să filtreze după activeTenantId din session
// și să respecte permissions din ACCESS_MATRIX server-side.

function baseStats(): Stat[] {
  return [
    { key: "active_couriers",       label: "Curieri activi",        value: "0", subtext: "din 0 total",         tone: "success" },
    { key: "new_candidates",        label: "Candidați noi",         value: "0", subtext: "săptămâna aceasta",   tone: "info" },
    { key: "processed_payments",    label: "Plăți procesate",       value: "0 RON", subtext: "săptămâna aceasta", tone: "warn" },
    { key: "completed_activations", label: "Activări finalizate",   value: "0", subtext: "luna aceasta",        tone: "indigo" },
    { key: "open_issues",           label: "Probleme deschise",     value: "0", subtext: "necesită atenție",    tone: "danger" },
  ];
}

export type DashboardContext = {
  tenantId: string;
  role: Role;
};

/**
 * getDashboardData — unicul entry point pentru dashboard.
 * TODO(real-users): implementează cu query batched Drizzle + tenant filter obligatoriu.
 */
export async function getDashboardData(ctx: DashboardContext): Promise<DashboardData> {
  // TODO(real-users): filter every query by ctx.tenantId + gate by ctx.role.
  void ctx;
  return {
    stats: baseStats(),
    courierActivity: [],
    courierActivityTrend: { direction: "flat", value: "0%" },
    revenue: [],
    revenueTrend: { direction: "flat", value: "0%" },
    platforms: [
      { key: "bolt",  name: "Bolt Food", couriers: 0, active: false },
      { key: "wolt",  name: "Wolt",      couriers: 0, active: false },
      { key: "glovo", name: "Glovo",     couriers: 0, active: false },
    ],
    recentCouriers: [],
    recentCandidates: [],
    recentActivations: [],
    recentPayments: [],
    recentIssues: [],
    activationStats: { total: 0, completed: 0, inProgress: 0, blocked: 0, completionRate: 0 },
    expiringDocuments: [],
    tasks: [],
  };
}
