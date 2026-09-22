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
import { useAuth } from "@/lib/auth/context";
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

function detectOS(): string {
  if (typeof navigator === "undefined") return "—";
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows/.test(ua))       return "Windows";
  if (/iPhone/.test(ua))        return "iPhone";
  if (/iPad/.test(ua))          return "iPad";
  if (/Android/.test(ua))       return "Android";
  if (/Mac/.test(ua))           return "Mac";
  if (/Linux/.test(ua))         return "Linux";
  return "Necunoscut";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "—";
  const ua = navigator.userAgent;
  let m: RegExpMatchArray | null;
  if ((m = ua.match(/Edg\/(\d+)/)))                          return `Edge ${m[1]}`;
  if ((m = ua.match(/OPR\/(\d+)/)))                          return `Opera ${m[1]}`;
  if ((m = ua.match(/Chrome\/(\d+)/)))                       return `Chrome ${m[1]}`;
  if ((m = ua.match(/Firefox\/(\d+)/)))                      return `Firefox ${m[1]}`;
  if ((m = ua.match(/Version\/(\d+)[.\d]*\s+Safari/)))       return `Safari ${m[1]}`;
  return "Browser";
}

function detectDevice(): string {
  return `${detectOS()} · ${detectBrowser()}`;
}



export function ProfileProvider({ children }: { children: ReactNode }) {
  const { current } = useAuth();
  // Cheia per-user pentru profil — dacă schimbi contul, profilul se schimbă cu el
  // (nu mai vezi datele contului anterior salvate global).
  const profileKey = current ? `${KEY_PROFILE}-${current.id}` : KEY_PROFILE;

  const [profile, setProfile]                     = useState<ProfileData>(DEFAULT_PROFILE);
  const [activity, setActivity]                   = useState<ActivityEvent[]>([]);
  const [sessions, setSessions]                   = useState<SessionRecord[]>(DEFAULT_SESSIONS);
  const [securityEvents, setSecurityEvents]       = useState<SecurityEvent[]>(DEFAULT_SECURITY_EVENTS);
  const [recycle, setRecycle]                     = useState<RecycleItem[]>(DEFAULT_RECYCLE);
  const [hydrated, setHydrated]                   = useState(false);

  // Re-încarcă profilul când user-ul curent se schimbă (login pe alt cont).
  useEffect(() => {
    const stored = safeRead<Partial<ProfileData>>(profileKey, {});
    setProfile({
      ...DEFAULT_PROFILE,
      // Dacă user-ul e autentificat, seed nume + email din auth.
      ...(current ? { displayName: current.name, email: current.email } : {}),
      // Apoi suprapunem preferințele salvate (dacă există)
      ...stored,
      notifications: {
        ...DEFAULT_PROFILE.notifications,
        ...(stored.notifications ?? {}),
      },
    });
    setActivity(safeRead<ActivityEvent[]>(KEY_ACTIVITY, []));
    setSessions(safeRead<SessionRecord[]>(KEY_SESSIONS, DEFAULT_SESSIONS));
    setSecurityEvents(safeRead<SecurityEvent[]>(KEY_SECURITY, DEFAULT_SECURITY_EVENTS));
    setRecycle(safeRead<RecycleItem[]>(KEY_RECYCLE, DEFAULT_RECYCLE));
    setHydrated(true);
  }, [profileKey, current]);

  // Sesiune curentă + login event (real, din browser).
  useEffect(() => {
    if (!hydrated) return;
    const os = detectOS();
    const browser = detectBrowser();
    const nowIso = new Date().toISOString();

    setSessions((prev) => {
      const others = prev.filter((s) => s.id !== "s_current" && !s.current);
      return [
        {
          id: "s_current",
          device: os,
          browser,
          location: "Această sesiune",
          lastActive: nowIso,
          current: true,
        },
        ...others,
      ];
    });

    setSecurityEvents((prev) => {
      const lastLogin = prev.find((e) => e.kind === "login.success");
      const stale = !lastLogin || (Date.now() - Date.parse(lastLogin.createdAt) > 30 * 60_000);
      if (!stale) return prev;
      return [{
        id: `se_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: "login.success" as SecurityEvent["kind"],
        createdAt: nowIso,
        ip: "—",
        details: `${os} · ${browser}`,
      } as SecurityEvent, ...prev].slice(0, 200);
    });

    // Update lastActive când tab-ul devine vizibil sau la 5 min.
    const bump = () => {
      setSessions((prev) => prev.map((s) => s.current
        ? { ...s, lastActive: new Date().toISOString() }
        : s));
    };
    const onVisibility = () => { if (document.visibilityState === "visible") bump(); };
    document.addEventListener("visibilitychange", onVisibility);
    const id = window.setInterval(bump, 5 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(id);
    };
  }, [hydrated]);

  useEffect(() => { if (hydrated) try { localStorage.setItem(profileKey,  JSON.stringify(profile)); } catch {} }, [profile, hydrated, profileKey]);
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
