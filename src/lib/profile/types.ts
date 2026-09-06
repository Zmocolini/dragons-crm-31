export type Language = "ro" | "en";
export type Theme = "dark" | "light" | "system";
export type DateFormat = "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
export type TimeFormat = "24h" | "12h";
export type Density = "compact" | "comfortable" | "aerisit";

export type NotificationChannel = "in_app" | "email";

export type NotificationPrefKey =
  | "payments"
  | "documents_expired"
  | "activations_blocked"
  | "issues_urgent"
  | "tasks"
  | "interviews"
  | "subcontractors"
  | "announcements";

export type NotificationPrefs = Record<NotificationPrefKey, Record<NotificationChannel, boolean>>;

export type ProfileData = {
  displayName: string | null; // override peste session.user.name (mock/demo)
  phone: string;
  location: string;
  bio: string;
  joinedAt: string; // ISO date
  language: Language;
  theme: Theme;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  density: Density;
  avatarDataUrl: string | null;
  notifications: NotificationPrefs;
  twoFactorEnabled: boolean; // read-only in fresh project
  // Alte preferințe
  reduceMotion: boolean;   // true = animații reduse
  focusMode: boolean;
  showTips: boolean;
  alwaysDashboard: boolean;
};

export type ActivityEventKind =
  | "profile.update"
  | "avatar.update"
  | "password.change"
  | "preferences.update"
  | "notification_preferences.update"
  | "session.revoke"
  | "account.delete_requested"
  | "tenant.switch"
  | "login"
  | "logout"
  | "report.view"
  | "document.download"
  | "candidate.create"
  | "document.activate";

export type ActivityEvent = {
  id: string;
  kind: ActivityEventKind;
  module: string;
  createdAt: string; // ISO
  details?: string;
  ip?: string;
  device?: string; // ex: "Windows · Chrome"
};

export type SessionRecord = {
  id: string;
  device: string;         // ex "Windows 11"
  browser: string;        // ex "Chrome 128"
  location: string;       // ex "București, RO"
  lastActive: string;     // ISO
  current: boolean;
};

export type SecurityEvent = {
  id: string;
  kind: "login.success" | "login.failed" | "password.change" | "2fa.enabled" | "2fa.disabled" | "session.revoke" | "email.change";
  createdAt: string;
  ip: string;
  details: string;
};

export type RecycleItem = {
  id: string;
  entityType: "courier" | "document" | "candidate" | "task" | "note" | "vehicle";
  name: string;
  deletedBy: string;
  deletedAt: string;
  expiresAt: string;
};

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  payments:              { in_app: true,  email: true  },
  documents_expired:     { in_app: true,  email: true  },
  activations_blocked:   { in_app: true,  email: true  },
  issues_urgent:         { in_app: true,  email: true  },
  tasks:                 { in_app: true,  email: false },
  interviews:            { in_app: false, email: false },
  subcontractors:        { in_app: true,  email: false },
  announcements:         { in_app: true,  email: true  },
};

export const DEFAULT_PROFILE: ProfileData = {
  displayName: null,
  phone: "+40 722 123 456",
  location: "București, România",
  bio: "Coordonez operațiunile Dragon Delivery și mă asigur că echipa noastră crește sustenabil.\nFocus pe oameni, procese și performanță.",
  joinedAt: "2024-01-12",
  language: "ro",
  theme: "dark",
  timezone: "Europe/Bucharest",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
  density: "comfortable",
  avatarDataUrl: null,
  notifications: DEFAULT_NOTIFICATIONS,
  twoFactorEnabled: false,
  reduceMotion: false,
  focusMode: false,
  showTips: true,
  alwaysDashboard: true,
};

export const DEFAULT_SESSIONS: SessionRecord[] = [
  {
    id: "s_current",
    device: "Windows 11",
    browser: "Chrome 128",
    location: "București, RO",
    lastActive: new Date().toISOString(),
    current: true,
  },
  {
    id: "s_iphone",
    device: "iPhone 14",
    browser: "Safari 17",
    location: "Cluj-Napoca, RO",
    lastActive: new Date(Date.now() - 86_400_000).toISOString(),
    current: false,
  },
  {
    id: "s_macbook",
    device: "MacBook Pro",
    browser: "Safari 17",
    location: "Timișoara, RO",
    lastActive: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    current: false,
  },
  {
    id: "s_android",
    device: "Android",
    browser: "Chrome 127",
    location: "Iași, RO",
    lastActive: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    current: false,
  },
];

export const DEFAULT_SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: "se_1",
    kind: "login.success",
    createdAt: new Date().toISOString(),
    ip: "79.112.45.210",
    details: "Windows · Chrome",
  },
  {
    id: "se_2",
    kind: "profile.change" as SecurityEvent["kind"],
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    ip: "79.112.45.210",
    details: "Informații personale",
  } as SecurityEvent,
  {
    id: "se_3",
    kind: "password.change",
    createdAt: new Date(Date.now() - 8 * 86_400_000).toISOString(),
    ip: "79.112.45.210",
    details: "Parolă actualizată",
  },
];

export const DEFAULT_RECYCLE: RecycleItem[] = [];
