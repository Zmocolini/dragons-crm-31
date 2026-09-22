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
  | "document.activate"
  | "payment.create"
  | "payment.draft";

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

// Reale, populate din browser în ProfileProvider după hydration.
export const DEFAULT_SESSIONS: SessionRecord[] = [];
export const DEFAULT_SECURITY_EVENTS: SecurityEvent[] = [];

export const DEFAULT_RECYCLE: RecycleItem[] = [];
