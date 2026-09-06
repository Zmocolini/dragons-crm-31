"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PROFILE,
  DEFAULT_RECYCLE,
  DEFAULT_SECURITY_EVENTS,
  DEFAULT_SESSIONS,
  type ActivityEvent,
  type ActivityEventKind,
  type NotificationPrefKey,
  type NotificationChannel,
  type ProfileData,
  type RecycleItem,
  type SecurityEvent,
  type SessionRecord,
} from "./types";

// TODO(real-users): înlocuiește localStorage cu Server Actions + DB (user_profile,
// user_preferences, user_notification_preferences, activity_log, sessions,
// security_events, deleted_items). Aici e placeholder local.

const KEY_PROFILE  = "crm31-profile";
const KEY_ACTIVITY = "crm31-activity";
const KEY_SESSIONS = "crm31-sessions";
const KEY_SECURITY = "crm31-security";
const KEY_RECYCLE  = "crm31-recycle";
const MAX_ACTIVITY = 500;

type ProfileContextValue = {
  profile: ProfileData;
  updateProfile: (patch: Partial<ProfileData>) => void;
  setAvatar: (dataUrl: string | null) => void;
  setNotification: (key: NotificationPrefKey, channel: NotificationChannel, value: boolean) => void;
  logActivity: (
    kind: ActivityEventKind,
    details?: string,
    module?: string,
    extra?: { ip?: string; device?: string },
  ) => void;
  activity: ActivityEvent[];
  sessions: SessionRecord[];
  revokeSession: (id: string) => void;
  revokeAllOtherSessions: () => void;
  securityEvents: SecurityEvent[];
  addSecurityEvent: (kind: SecurityEvent["kind"], details: string, ip?: string) => void;
  recycle: RecycleItem[];
  restoreRecycle: (id: string) => void;
  purgeRecycle: (id: string) => void;
  reset: () => void;
  hydrated: boolean;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const MODULE_FOR_KIND: Record<ActivityEventKind, string> = {
  "profile.update":                    "Profil",
  "avatar.update":                     "Profil",
  "password.change":                   "Securitate",
  "preferences.update":                "Preferințe",
  "notification_preferences.update":   "Notificări",
  "session.revoke":                    "Securitate",
  "account.delete_requested":          "Cont",
  "tenant.switch":                     "Flotă",
  "login":                             "Autentificare",
  "logout":                            "Autentificare",
  "report.view":                       "Rapoarte",
  "document.download":                 "Documente",
  "candidate.create":                  "Candidați",
  "document.activate":                 "Documente",
  "payment.create":                    "Plăți",
  "payment.draft":                     "Plăți",
};

function detectDevice(): string {
  if (typeof navigator === "undefined") return "—";
  const ua = navigator.userAgent;
  let os = "Windows";
  if (/Mac/.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";

  let br = "Browser";
  if (/Edg\//.test(ua))         br = "Edge";
  else if (/Chrome\//.test(ua)) br = "Chrome";
  else if (/Firefox\//.test(ua)) br = "Firefox";
  else if (/Safari\//.test(ua)) br = "Safari";

  return `${os} · ${br}`;
}

function seedActivity(): ActivityEvent[] {
  // Seed câteva evenimente ca screenshot-ul să aibă conținut. TODO(real-users): drop.
  const now = Date.now();
  const day = 86_400_000;
  const ip  = "79.112.45.210";
  const device = detectDevice();
  const seed: Omit<ActivityEvent, "id">[] = [
    { kind: "login",                   module: "Autentificare", createdAt: new Date(now).toISOString(),              details: "Sesiune nouă",             ip, device },
    { kind: "report.view",             module: "Rapoarte",      createdAt: new Date(now - 2 * 3600e3).toISOString(),   details: "Raport curieri",           ip, device },
    { kind: "profile.update",          module: "Profil",        createdAt: new Date(now - 2 * day).toISOString(),      details: "Informații personale",     ip, device },
    { kind: "tenant.switch",           module: "Flotă",         createdAt: new Date(now - 3 * day).toISOString(),      details: "Dragon Delivery",          ip, device },
    { kind: "document.download",       module: "Documente",     createdAt: new Date(now - 4 * day).toISOString(),      details: "Contract colaborare",      ip, device },
    { kind: "preferences.update",      module: "Preferințe",    createdAt: new Date(now - 6 * day).toISOString(),      details: "Preferințe notificări",    ip, device },
    { kind: "logout",                  module: "Autentificare", createdAt: new Date(now - 8 * day).toISOString(),      details: "Sesiune închisă",          ip, device },
    { kind: "login",                   module: "Autentificare", createdAt: new Date(now - 8 * day - 2 * 3600e3).toISOString(), details: "Sesiune nouă",       ip, device: "iPhone · Safari" },
    { kind: "candidate.create",        module: "Candidați",     createdAt: new Date(now - 9 * day).toISOString(),      details: "Candidat nou adăugat",     ip, device },
    { kind: "document.activate",       module: "Documente",     createdAt: new Date(now - 10 * day).toISOString(),     details: "Document verificat",       ip, device },
  ];
  return seed.map((e, i) => ({ id: `seed_${i}`, ...e }));
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile]                     = useState<ProfileData>(DEFAULT_PROFILE);
  const [activity, setActivity]                   = useState<ActivityEvent[]>([]);
  const [sessions, setSessions]                   = useState<SessionRecord[]>(DEFAULT_SESSIONS);
  const [securityEvents, setSecurityEvents]       = useState<SecurityEvent[]>(DEFAULT_SECURITY_EVENTS);
  const [recycle, setRecycle]                     = useState<RecycleItem[]>(DEFAULT_RECYCLE);
  const [hydrated, setHydrated]                   = useState(false);

  useEffect(() => {
    const savedActivity = safeRead<ActivityEvent[]>(KEY_ACTIVITY, []);
    setProfile({
      ...DEFAULT_PROFILE,
      ...safeRead<Partial<ProfileData>>(KEY_PROFILE, {}),
      notifications: {
        ...DEFAULT_PROFILE.notifications,
        ...(safeRead<Partial<ProfileData>>(KEY_PROFILE, {}).notifications ?? {}),
      },
    });
    setActivity(savedActivity.length ? savedActivity : seedActivity());
    setSessions(safeRead<SessionRecord[]>(KEY_SESSIONS, DEFAULT_SESSIONS));
    setSecurityEvents(safeRead<SecurityEvent[]>(KEY_SECURITY, DEFAULT_SECURITY_EVENTS));
    setRecycle(safeRead<RecycleItem[]>(KEY_RECYCLE, DEFAULT_RECYCLE));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_PROFILE,  JSON.stringify(profile)); } catch {} }, [profile, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_ACTIVITY, JSON.stringify(activity.slice(0, MAX_ACTIVITY))); } catch {} }, [activity, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_SESSIONS, JSON.stringify(sessions)); } catch {} }, [sessions, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_SECURITY, JSON.stringify(securityEvents)); } catch {} }, [securityEvents, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_RECYCLE,  JSON.stringify(recycle)); } catch {} }, [recycle, hydrated]);

  const logActivity = useCallback((
    kind: ActivityEventKind,
    details?: string,
    module?: string,
    extra?: { ip?: string; device?: string },
  ) => {
    const event: ActivityEvent = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      module: module ?? MODULE_FOR_KIND[kind],
      createdAt: new Date().toISOString(),
      details,
      ip: extra?.ip ?? "79.112.45.210",
      device: extra?.device ?? detectDevice(),
    };
    setActivity((prev) => [event, ...prev].slice(0, MAX_ACTIVITY));
  }, []);

  const addSecurityEvent = useCallback(
    (kind: SecurityEvent["kind"], details: string, ip = "79.112.45.210") => {
      setSecurityEvents((prev) => [
        {
          id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          kind,
          createdAt: new Date().toISOString(),
          ip,
          details,
        },
        ...prev,
      ].slice(0, 200));
    },
    [],
  );

  const updateProfile = useCallback((patch: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const setAvatar = useCallback((dataUrl: string | null) => {
    setProfile((prev) => ({ ...prev, avatarDataUrl: dataUrl }));
  }, []);

  const setNotification = useCallback(
    (key: NotificationPrefKey, channel: NotificationChannel, value: boolean) => {
      setProfile((prev) => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: { ...prev.notifications[key], [channel]: value },
        },
      }));
    },
    [],
  );

  const revokeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id || s.current));
  }, []);

  const revokeAllOtherSessions = useCallback(() => {
    setSessions((prev) => prev.filter((s) => s.current));
  }, []);

  const restoreRecycle = useCallback((id: string) => {
    setRecycle((prev) => prev.filter((i) => i.id !== id));
  }, []);
  const purgeRecycle = useCallback((id: string) => {
    setRecycle((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setActivity([]);
    setSessions(DEFAULT_SESSIONS);
    setSecurityEvents(DEFAULT_SECURITY_EVENTS);
    setRecycle(DEFAULT_RECYCLE);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      updateProfile,
      setAvatar,
      setNotification,
      logActivity,
      activity,
      sessions,
      revokeSession,
      revokeAllOtherSessions,
      securityEvents,
      addSecurityEvent,
      recycle,
      restoreRecycle,
      purgeRecycle,
      reset,
      hydrated,
    }),
    [profile, activity, sessions, securityEvents, recycle, hydrated, updateProfile, setAvatar, setNotification, logActivity, revokeSession, revokeAllOtherSessions, addSecurityEvent, restoreRecycle, purgeRecycle, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within <ProfileProvider>");
  return ctx;
}
