import type { CourierStatus } from "@/lib/couriers/types";

export type Trend = {
  direction: "up" | "down" | "flat";
  value: string;
};

export type StatKey =
  | "active_couriers"
  | "new_candidates"
  | "processed_payments"
  | "completed_activations"
  | "open_issues";

export type Stat = {
  key: StatKey;
  label: string;
  value: string;
  subtext: string;
  trend?: Trend;
  tone: "success" | "info" | "warn" | "indigo" | "danger";
};

export type PlatformKey = "bolt" | "wolt" | "glovo";

/** Un punct = un raport săptămânal (S40 …); valorile = curieri activi distincți pe platformă în acel raport. */
export type CourierActivityPoint = {
  label: string;
  bolt: number;
  wolt: number;
  glovo: number;
};

/** Venitul brut al unui raport săptămânal, total + pe platforme. Ordine crescătoare în timp. */
export type WeeklyRevenue = {
  label: string;     // "S40"
  startIso: string;  // luni, YYYY-MM-DD
  total: number;     // RON
  byPlatform: { bolt: number; wolt: number; glovo: number; other: number };
};

export type RevenuePoint = {
  label: string;
  amount: number;
};

export type Platform = {
  key: PlatformKey;
  name: string;
  couriers: number;
  active: boolean;
};

export type RecentCourier = {
  id: string;
  name: string;
  phone: string;
  city: string;
  platform: PlatformKey;
  /** Statusul real al curierului, 1:1 cu pagina Curieri. */
  status: CourierStatus;
  /** Zile în pending (draft / în activare); null dacă nu e pending. */
  pendingDays: number | null;
  registeredAt: string;
  avatarUrl: string | null;
  /** Intern (al flotei noastre) sau al unui subcontractor. Lipsește pentru conturile care nu văd toate conturile. */
  owner?: { kind: "internal" | "subcontractor"; label: string };
};

export type RecentCandidate = {
  id: string;
  name: string;
  phone: string;
  city: string;
  source: string;
  stage: "nou" | "sunat" | "interviu" | "documente";
  createdAt: string;
  avatarUrl: string | null;
};

export type RecentActivation = {
  id: string;
  courierName: string;
  platform: PlatformKey;
  city: string;
  status: "finalizat" | "in_proces" | "blocat";
  completedAt: string;
};

export type RecentPayment = {
  id: string;
  courierName: string;
  amount: number;
  method: "card" | "cash" | "transfer";
  status: "platit" | "pending" | "esuat";
  paidAt: string;
};

export type RecentIssue = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  courierName: string;
  createdAt: string;
};

export type ActivationStats = {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  completionRate: number;
};

export type ExpiringDocument = {
  id: string;
  label: string;
  count: number;
  daysUntil: number;
  category: "passport" | "residence" | "contract" | "other";
};

export type TaskDue = "azi" | "maine" | "vineri" | string;

export type UpcomingTask = {
  id: string;
  title: string;
  due: TaskDue;
  done: boolean;
};

export type DashboardData = {
  stats: Stat[];
  courierActivity: CourierActivityPoint[];
  courierActivityTrend: Trend;
  revenue: RevenuePoint[];
  revenueTrend: Trend;
  platforms: Platform[];
  recentCouriers: RecentCourier[];
  recentCandidates: RecentCandidate[];
  recentActivations: RecentActivation[];
  recentPayments: RecentPayment[];
  recentIssues: RecentIssue[];
  activationStats: ActivationStats;
  expiringDocuments: ExpiringDocument[];
  tasks: UpcomingTask[];
};
