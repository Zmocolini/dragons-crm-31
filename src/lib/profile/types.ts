export type Language = "ro" | "en";
export type Theme = "dark" | "light" | "system";
export type DateFormat = "DD.MM.YYYY" | "YYYY-MM-DD" | "MM/DD/YYYY";
export type TimeFormat = "24h" | "12h";
export type Density = "compact" | "comfortable";

export type NotificationChannel = "in_app" | "email";

export type NotificationPrefKey =
  | "payments"
  | "documents_expired"
  | "activations_blocked"
  | "issues_urgent"
  | "tasks"
  | "interviews"
  | "subcontractors";

export type NotificationPrefs = Record<NotificationPrefKey, Record<NotificationChannel, boolean>>;

export type ProfileData = {
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
  | "logout";

export type ActivityEvent = {
  id: string;
  kind: ActivityEventKind;
  module: string;
  createdAt: string; // ISO
  details?: string;
};

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  payments:              { in_app: true,  email: true  },
  documents_expired:     { in_app: true,  email: true  },
  activations_blocked:   { in_app: true,  email: false },
  issues_urgent:         { in_app: true,  email: true  },
  tasks:                 { in_app: true,  email: false },
  interviews:            { in_app: false, email: false },
  subcontractors:        { in_app: false, email: false },
};

export const DEFAULT_PROFILE: ProfileData = {
  phone: "+40 722 123 456",
  location: "București, România",
  bio: "Coordonez operațiunile Dragon Delivery și mă asigur că echipa noastră crește sustenabil. Focus pe oameni, procese și performanță.",
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
};
