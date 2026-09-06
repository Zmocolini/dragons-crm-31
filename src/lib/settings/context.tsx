"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type City,
  type IntegrationStatus,
  type IntegrationsState,
  type ModuleKey,
  type NotificationChannelKey,
  type PlatformKey,
  type SettingsState,
} from "./types";

// TODO(real-users): server actions + tabelele tenant_settings, tenant_modules, tenant_fleet,
// tenant_cities, tenant_platforms. Aici localStorage per-user demo.

const STORAGE_KEY = "crm31-settings";

type SettingsContextValue = {
  settings: SettingsState;
  updateSettings: (patch: Partial<SettingsState>) => void;
  updateOrganization: (patch: Partial<SettingsState["organization"]>) => void;
  updatePlatform: (patch: Partial<SettingsState["platform"]>) => void;
  toggleModule: (key: ModuleKey, next: boolean) => void;
  updateFleet: (patch: Partial<SettingsState["fleet"]>) => void;
  toggleVehicleType: (type: keyof SettingsState["fleet"]["vehicleTypesAllowed"], next: boolean) => void;
  addCity: (name: string) => void;
  removeCity: (id: string) => void;
  updateCityStatus: (id: string, status: City["status"]) => void;
  togglePlatform: (key: keyof SettingsState["platforms"], next: boolean) => void;
  isModuleEnabled: (key: ModuleKey) => boolean;
  // Integrations
  updateIntegrationPlatform: (key: PlatformKey, patch: Partial<{ status: IntegrationStatus; lastSyncIso: string | null; account: string | null }>) => void;
  updateCalendar: (patch: Partial<IntegrationsState["calendar"]>) => void;
  toggleNotificationChannel: (key: NotificationChannelKey, next: boolean) => void;
  hydrated: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function safeRead(): SettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return {
      organization: { ...DEFAULT_SETTINGS.organization, ...(parsed.organization ?? {}) },
      platform:     { ...DEFAULT_SETTINGS.platform,     ...(parsed.platform ?? {}) },
      modules:      { ...DEFAULT_SETTINGS.modules,      ...(parsed.modules ?? {}) },
      fleet:        {
        ...DEFAULT_SETTINGS.fleet,
        ...(parsed.fleet ?? {}),
        vehicleTypesAllowed: {
          ...DEFAULT_SETTINGS.fleet.vehicleTypesAllowed,
          ...(parsed.fleet?.vehicleTypesAllowed ?? {}),
        },
      },
      cities:    parsed.cities    ?? DEFAULT_SETTINGS.cities,
      platforms: { ...DEFAULT_SETTINGS.platforms, ...(parsed.platforms ?? {}) },
      integrations: {
        platforms: parsed.integrations?.platforms ?? DEFAULT_SETTINGS.integrations.platforms,
        calendar:  { ...DEFAULT_SETTINGS.integrations.calendar,  ...(parsed.integrations?.calendar ?? {}) },
        channels:  { ...DEFAULT_SETTINGS.integrations.channels,  ...(parsed.integrations?.channels ?? {}) },
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(safeRead());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, hydrated]);

  const updateSettings       = useCallback((patch: Partial<SettingsState>) => setSettings((prev) => ({ ...prev, ...patch })), []);
  const updateOrganization   = useCallback((patch: Partial<SettingsState["organization"]>) => setSettings((prev) => ({ ...prev, organization: { ...prev.organization, ...patch } })), []);
  const updatePlatform       = useCallback((patch: Partial<SettingsState["platform"]>) => setSettings((prev) => ({ ...prev, platform: { ...prev.platform, ...patch } })), []);
  const toggleModule         = useCallback((key: ModuleKey, next: boolean) => setSettings((prev) => ({ ...prev, modules: { ...prev.modules, [key]: next } })), []);
  const updateFleet          = useCallback((patch: Partial<SettingsState["fleet"]>) => setSettings((prev) => ({ ...prev, fleet: { ...prev.fleet, ...patch } })), []);
  const toggleVehicleType    = useCallback((type: keyof SettingsState["fleet"]["vehicleTypesAllowed"], next: boolean) => setSettings((prev) => ({ ...prev, fleet: { ...prev.fleet, vehicleTypesAllowed: { ...prev.fleet.vehicleTypesAllowed, [type]: next } } })), []);
  const addCity              = useCallback((name: string) => setSettings((prev) => ({ ...prev, cities: [...prev.cities, { id: `c_${Date.now()}`, name: name.trim(), status: "active" }] })), []);
  const removeCity           = useCallback((id: string) => setSettings((prev) => ({ ...prev, cities: prev.cities.filter((c) => c.id !== id) })), []);
  const updateCityStatus     = useCallback((id: string, status: City["status"]) => setSettings((prev) => ({ ...prev, cities: prev.cities.map((c) => c.id === id ? { ...c, status } : c) })), []);
  const togglePlatform       = useCallback((key: keyof SettingsState["platforms"], next: boolean) => setSettings((prev) => ({ ...prev, platforms: { ...prev.platforms, [key]: next ? "active" : "inactive" } })), []);
  const isModuleEnabled      = useCallback((key: ModuleKey) => settings.modules[key], [settings.modules]);
  const updateIntegrationPlatform = useCallback((key: PlatformKey, patch: Partial<{ status: IntegrationStatus; lastSyncIso: string | null; account: string | null }>) =>
    setSettings((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        platforms: prev.integrations.platforms.map((p) => p.key === key ? { ...p, ...patch } : p),
      },
    })), []);
  const updateCalendar        = useCallback((patch: Partial<IntegrationsState["calendar"]>) =>
    setSettings((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, calendar: { ...prev.integrations.calendar, ...patch } },
    })), []);
  const toggleNotificationChannel = useCallback((key: NotificationChannelKey, next: boolean) =>
    setSettings((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, channels: { ...prev.integrations.channels, [key]: next } },
    })), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings, updateSettings, updateOrganization, updatePlatform,
      toggleModule, updateFleet, toggleVehicleType,
      addCity, removeCity, updateCityStatus, togglePlatform,
      isModuleEnabled,
      updateIntegrationPlatform, updateCalendar, toggleNotificationChannel,
      hydrated,
    }),
    [settings, hydrated, updateSettings, updateOrganization, updatePlatform, toggleModule, updateFleet, toggleVehicleType, addCity, removeCity, updateCityStatus, togglePlatform, isModuleEnabled, updateIntegrationPlatform, updateCalendar, toggleNotificationChannel],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}
