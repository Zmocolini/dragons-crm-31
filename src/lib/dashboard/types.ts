export type Trend = {
  direction: "up" | "down" | "flat";
  value: string;
};

export type StatKey =
  | "active_couriers"
  | "processed_payments"
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

export type CourierActivityPoint = {
  label: string;
  bolt: number;
  wolt: number;
  glovo: number;
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

export type CourierStatus = "activ" | "in_proces" | "documente" | "asteptare";

export type RecentCourier = {
  id: string;
  name: string;
  phone: string;
  city: string;
  platform: PlatformKey;
  status: CourierStatus;
  registeredAt: string;
  avatarUrl: string | null;
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
