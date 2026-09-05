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
  type ActivityEvent,
  type ActivityEventKind,
  type NotificationPrefKey,
  type NotificationChannel,
  type ProfileData,
} from "./types";

// TODO(real-users): înlocuiește localStorage cu Server Actions + DB (user_profile,
// user_preferences, user_notification_preferences, activity_log). Aici e placeholder.

const STORAGE_PROFILE  = "crm31-profile";
const STORAGE_ACTIVITY = "crm31-activity";
const MAX_ACTIVITY     = 200;

type ProfileContextValue = {
  profile: ProfileData;
  updateProfile: (patch: Partial<ProfileData>) => void;
  setAvatar: (dataUrl: string | null) => void;
  setNotification: (key: NotificationPrefKey, channel: NotificationChannel, value: boolean) => void;
  logActivity: (kind: ActivityEventKind, details?: string, module?: string) => void;
  activity: ActivityEvent[];
  reset: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function readProfile(): ProfileData {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<ProfileData>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      notifications: {
        ...DEFAULT_PROFILE.notifications,
        ...(parsed.notifications ?? {}),
      },
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function readActivity(): ActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVITY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityEvent[];
  } catch {
    return [];
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
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile]   = useState<ProfileData>(DEFAULT_PROFILE);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(readProfile());
    setActivity(readActivity());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_ACTIVITY, JSON.stringify(activity.slice(0, MAX_ACTIVITY)));
    } catch {}
  }, [activity, hydrated]);

  const logActivity = useCallback((kind: ActivityEventKind, details?: string, module?: string) => {
    const event: ActivityEvent = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      module: module ?? MODULE_FOR_KIND[kind],
      createdAt: new Date().toISOString(),
      details,
    };
    setActivity((prev) => [event, ...prev].slice(0, MAX_ACTIVITY));
  }, []);

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

  const reset = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setActivity([]);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      updateProfile,
      setAvatar,
      setNotification,
      logActivity,
      activity,
      reset,
    }),
    [profile, activity, updateProfile, setAvatar, setNotification, logActivity, reset],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within <ProfileProvider>");
  return ctx;
}
