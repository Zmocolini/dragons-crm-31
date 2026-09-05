import "server-only";

import type {
  ActivationStats,
  CourierActivityPoint,
  DashboardData,
  ExpiringDocument,
  Platform,
  RecentActivation,
  RecentCandidate,
  RecentCourier,
  RecentIssue,
  RecentPayment,
  RevenuePoint,
  Stat,
  UpcomingTask,
} from "./types";
import type { Role } from "@/lib/rbac/roles";

// TODO(real-users): înlocuiește toți getterii cu queries pe Drizzle/Turso.
// Fiecare query trebuie să filtreze după activeTenantId din session
// și să respecte permissions din ACCESS_MATRIX server-side.
// Nu doar frontend-ul: backend authorization e obligatoriu.

function baseStats(): Stat[] {
  return [
    {
      key: "active_couriers",
      label: "Curieri activi",
      value: "324",
      subtext: "din 500 total",
      trend: { direction: "up", value: "+12%" },
      tone: "success",
    },
    {
      key: "new_candidates",
      label: "Candidați noi",
      value: "48",
      subtext: "săptămâna aceasta",
      trend: { direction: "up", value: "+25%" },
      tone: "info",
    },
    {
      key: "processed_payments",
      label: "Plăți procesate",
      value: "186.420 RON",
      subtext: "săptămâna aceasta",
      tone: "warn",
    },
    {
      key: "completed_activations",
      label: "Activări finalizate",
      value: "37",
      subtext: "luna aceasta",
      trend: { direction: "up", value: "+32%" },
      tone: "indigo",
    },
    {
      key: "open_issues",
      label: "Probleme deschise",
      value: "12",
      subtext: "necesită atenție",
      trend: { direction: "up", value: "+3" },
      tone: "danger",
    },
  ];
}

function baseCourierActivity(): CourierActivityPoint[] {
  return [
    { label: "7 Aug", bolt: 120, wolt: 85, glovo: 60 },
    { label: "10 Aug", bolt: 132, wolt: 92, glovo: 70 },
    { label: "14 Aug", bolt: 118, wolt: 88, glovo: 74 },
    { label: "18 Aug", bolt: 145, wolt: 96, glovo: 82 },
    { label: "21 Aug", bolt: 140, wolt: 102, glovo: 88 },
    { label: "24 Aug", bolt: 156, wolt: 110, glovo: 95 },
    { label: "28 Aug", bolt: 162, wolt: 118, glovo: 102 },
    { label: "2 Sep", bolt: 153, wolt: 126, glovo: 108 },
    { label: "5 Sep", bolt: 168, wolt: 132, glovo: 115 },
  ];
}

function baseRevenue(): RevenuePoint[] {
  return [
    { label: "S1", amount: 92_000 },
    { label: "S2", amount: 118_000 },
    { label: "S3", amount: 132_000 },
    { label: "S4", amount: 156_000 },
    { label: "S5", amount: 178_000 },
    { label: "S6", amount: 165_000 },
    { label: "S7", amount: 172_000 },
    { label: "S8", amount: 186_420 },
  ];
}

function basePlatforms(): Platform[] {
  return [
    { key: "bolt", name: "Bolt Food", couriers: 324, active: true },
    { key: "wolt", name: "Wolt", couriers: 210, active: true },
    { key: "glovo", name: "Glovo", couriers: 178, active: true },
  ];
}

function baseRecentCouriers(): RecentCourier[] {
  return [
    {
      id: "c_001",
      name: "Andrei Popescu",
      phone: "+40 722 123 456",
      city: "București",
      platform: "bolt",
      status: "activ",
      registeredAt: "2026-09-05",
      avatarUrl: null,
    },
    {
      id: "c_002",
      name: "Mihai Ionescu",
      phone: "+40 731 987 654",
      city: "Cluj-Napoca",
      platform: "wolt",
      status: "in_proces",
      registeredAt: "2026-09-05",
      avatarUrl: null,
    },
    {
      id: "c_003",
      name: "Ravi Kumar",
      phone: "+40 745 111 222",
      city: "Timișoara",
      platform: "glovo",
      status: "documente",
      registeredAt: "2026-09-04",
      avatarUrl: null,
    },
    {
      id: "c_004",
      name: "Fatima Ali",
      phone: "+40 756 333 444",
      city: "Constanța",
      platform: "bolt",
      status: "activ",
      registeredAt: "2026-09-04",
      avatarUrl: null,
    },
    {
      id: "c_005",
      name: "Carlos Mendes",
      phone: "+40 768 555 666",
      city: "Iași",
      platform: "wolt",
      status: "asteptare",
      registeredAt: "2026-09-03",
      avatarUrl: null,
    },
  ];
}

function baseRecentCandidates(): RecentCandidate[] {
  return [
    {
      id: "l_001",
      name: "Elena Marinescu",
      phone: "+40 733 220 145",
      city: "București",
      source: "Facebook Ads",
      stage: "nou",
      createdAt: "2026-09-05",
      avatarUrl: null,
    },
    {
      id: "l_002",
      name: "Vlad Georgescu",
      phone: "+40 741 900 320",
      city: "Brașov",
      source: "Recomandare",
      stage: "sunat",
      createdAt: "2026-09-05",
      avatarUrl: null,
    },
    {
      id: "l_003",
      name: "Adnan Farooq",
      phone: "+40 762 118 903",
      city: "București",
      source: "TikTok",
      stage: "interviu",
      createdAt: "2026-09-04",
      avatarUrl: null,
    },
    {
      id: "l_004",
      name: "Ionuț Radu",
      phone: "+40 728 442 671",
      city: "Cluj-Napoca",
      source: "Google Ads",
      stage: "documente",
      createdAt: "2026-09-04",
      avatarUrl: null,
    },
    {
      id: "l_005",
      name: "Maria Petcu",
      phone: "+40 730 015 882",
      city: "Timișoara",
      source: "OLX",
      stage: "nou",
      createdAt: "2026-09-03",
      avatarUrl: null,
    },
  ];
}

function baseRecentActivations(): RecentActivation[] {
  return [
    {
      id: "a_001",
      courierName: "Andrei Popescu",
      platform: "bolt",
      city: "București",
      status: "finalizat",
      completedAt: "2026-09-05",
    },
    {
      id: "a_002",
      courierName: "Fatima Ali",
      platform: "bolt",
      city: "Constanța",
      status: "finalizat",
      completedAt: "2026-09-04",
    },
    {
      id: "a_003",
      courierName: "Ravi Kumar",
      platform: "glovo",
      city: "Timișoara",
      status: "in_proces",
      completedAt: "2026-09-04",
    },
    {
      id: "a_004",
      courierName: "Mihai Ionescu",
      platform: "wolt",
      city: "Cluj-Napoca",
      status: "in_proces",
      completedAt: "2026-09-03",
    },
    {
      id: "a_005",
      courierName: "Carlos Mendes",
      platform: "wolt",
      city: "Iași",
      status: "blocat",
      completedAt: "2026-09-02",
    },
  ];
}

function baseRecentPayments(): RecentPayment[] {
  return [
    {
      id: "p_001",
      courierName: "Andrei Popescu",
      amount: 3_450,
      method: "transfer",
      status: "platit",
      paidAt: "2026-09-05",
    },
    {
      id: "p_002",
      courierName: "Fatima Ali",
      amount: 2_890,
      method: "transfer",
      status: "platit",
      paidAt: "2026-09-05",
    },
    {
      id: "p_003",
      courierName: "Ravi Kumar",
      amount: 3_120,
      method: "card",
      status: "pending",
      paidAt: "2026-09-04",
    },
    {
      id: "p_004",
      courierName: "Mihai Ionescu",
      amount: 2_780,
      method: "transfer",
      status: "platit",
      paidAt: "2026-09-04",
    },
    {
      id: "p_005",
      courierName: "Carlos Mendes",
      amount: 2_540,
      method: "cash",
      status: "esuat",
      paidAt: "2026-09-03",
    },
  ];
}

function baseRecentIssues(): RecentIssue[] {
  return [
    {
      id: "i_001",
      title: "Card blocat la Bolt",
      severity: "high",
      courierName: "Ravi Kumar",
      createdAt: "2026-09-05",
    },
    {
      id: "i_002",
      title: "Permis șofer expirat",
      severity: "high",
      courierName: "Carlos Mendes",
      createdAt: "2026-09-05",
    },
    {
      id: "i_003",
      title: "Cont Glovo neverificat",
      severity: "medium",
      courierName: "Elena Marinescu",
      createdAt: "2026-09-04",
    },
    {
      id: "i_004",
      title: "Diferență la plată săptămâna trecută",
      severity: "medium",
      courierName: "Mihai Ionescu",
      createdAt: "2026-09-04",
    },
    {
      id: "i_005",
      title: "Cazare disponibilitate",
      severity: "low",
      courierName: "Fatima Ali",
      createdAt: "2026-09-03",
    },
  ];
}

function baseActivationStats(): ActivationStats {
  const completed = 82;
  const inProgress = 26;
  const blocked = 12;
  const total = completed + inProgress + blocked;
  return {
    total,
    completed,
    inProgress,
    blocked,
    completionRate: Math.round((completed / total) * 100),
  };
}

function baseExpiringDocuments(): ExpiringDocument[] {
  return [
    { id: "d_pas", label: "pașapoarte", count: 8, daysUntil: 7, category: "passport" },
    { id: "d_res", label: "permise de ședere", count: 12, daysUntil: 14, category: "residence" },
    { id: "d_con", label: "contracte", count: 5, daysUntil: 30, category: "contract" },
  ];
}

function baseTasks(): UpcomingTask[] {
  return [
    { id: "t_001", title: "Sună 5 candidați noi", due: "azi", done: false },
    { id: "t_002", title: "Verifică documente activări", due: "azi", done: false },
    { id: "t_003", title: "Pregătește plățile săptămânale", due: "maine", done: false },
    { id: "t_004", title: "Follow-up cu subcontractori", due: "maine", done: false },
    { id: "t_005", title: "Rezolvă problemele deschise", due: "vineri", done: false },
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
  // Deliberate: no awaits — real impl will Promise.all() aici.
  return {
    stats: baseStats(),
    courierActivity: baseCourierActivity(),
    courierActivityTrend: { direction: "up", value: "+8%" },
    revenue: baseRevenue(),
    revenueTrend: { direction: "up", value: "+18%" },
    platforms: basePlatforms(),
    recentCouriers: baseRecentCouriers(),
    recentCandidates: baseRecentCandidates(),
    recentActivations: baseRecentActivations(),
    recentPayments: baseRecentPayments(),
    recentIssues: baseRecentIssues(),
    activationStats: baseActivationStats(),
    expiringDocuments: baseExpiringDocuments(),
    tasks: baseTasks(),
  };
}
