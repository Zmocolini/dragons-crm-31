"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type AccessConfig,
  type City,
  type IntegrationStatus,
  type IntegrationsState,
  type Invitation,
  type ModuleKey,
  type NotificationChannelKey,
  type PlatformKey,
  type SettingsState,
  type TeamMember,
  type TeamRoleKey,
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
  // Team
  addTeamMember: (data: { name: string; email: string; role: TeamRoleKey; workspace: string; sendInvite: boolean }) => void;
  updateTeamMember: (id: string, patch: Partial<Pick<TeamMember, "role" | "workspace" | "status">>) => void;
  removeTeamMember: (id: string) => void;
  resendInvitation: (id: string) => void;
  cancelInvitation: (id: string) => void;
  updateAccessConfig: (patch: Partial<AccessConfig>) => void;
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
      team: {
        members:     parsed.team?.members     ?? DEFAULT_SETTINGS.team.members,
        invitations: parsed.team?.invitations ?? DEFAULT_SETTINGS.team.invitations,
        access:      { ...DEFAULT_SETTINGS.team.access, ...(parsed.team?.access ?? {}) },
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

  const addTeamMember = useCallback(
    (data: { name: string; email: string; role: TeamRoleKey; workspace: string; sendInvite: boolean }) => {
      const id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nowIso = new Date().toISOString();
      const member: TeamMember = {
        id,
        name: data.name,
        email: data.email,
        avatarUrl: null,
        role: data.role,
        workspace: data.workspace,
        workspaceAll: data.role === "global_owner",
        lastActiveIso: null,
        status: data.sendInvite ? "invited" : "active",
        invitedAtIso: data.sendInvite ? nowIso : null,
      };
      const invitation: Invitation | null = data.sendInvite
        ? { id: `inv_${Date.now()}`, email: data.email, role: data.role, workspace: data.workspace, sentAtIso: nowIso, status: "sent" }
        : null;
      setSettings((prev) => ({
        ...prev,
        team: {
          ...prev.team,
          members: [member, ...prev.team.members],
          invitations: invitation ? [invitation, ...prev.team.invitations] : prev.team.invitations,
        },
      }));
    },
    [],
  );

  const updateTeamMember = useCallback((id: string, patch: Partial<Pick<TeamMember, "role" | "workspace" | "status">>) =>
    setSettings((prev) => ({
      ...prev,
      team: { ...prev.team, members: prev.team.members.map((m) => m.id === id ? { ...m, ...patch, workspaceAll: (patch.role ?? m.role) === "global_owner" || m.workspaceAll } : m) },
    })), []);

  const removeTeamMember = useCallback((id: string) =>
    setSettings((prev) => ({
      ...prev,
      team: { ...prev.team, members: prev.team.members.filter((m) => m.id !== id) },
    })), []);

  const resendInvitation = useCallback((invId: string) =>
    setSettings((prev) => ({
      ...prev,
      team: {
        ...prev.team,
        invitations: prev.team.invitations.map((i) => i.id === invId ? { ...i, sentAtIso: new Date().toISOString(), status: "sent" as const } : i),
      },
    })), []);

  const cancelInvitation = useCallback((invId: string) =>
    setSettings((prev) => {
      const inv = prev.team.invitations.find((i) => i.id === invId);
      return {
        ...prev,
        team: {
          ...prev.team,
          invitations: prev.team.invitations.map((i) => i.id === invId ? { ...i, status: "cancelled" as const } : i),
          members:     inv ? prev.team.members.filter((m) => !(m.email === inv.email && m.status === "invited")) : prev.team.members,
        },
      };
    }), []);

  const updateAccessConfig = useCallback((patch: Partial<AccessConfig>) =>
    setSettings((prev) => ({ ...prev, team: { ...prev.team, access: { ...prev.team.access, ...patch } } })), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings, updateSettings, updateOrganization, updatePlatform,
      toggleModule, updateFleet, toggleVehicleType,
      addCity, removeCity, updateCityStatus, togglePlatform,
      isModuleEnabled,
      updateIntegrationPlatform, updateCalendar, toggleNotificationChannel,
      addTeamMember, updateTeamMember, removeTeamMember,
      resendInvitation, cancelInvitation, updateAccessConfig,
      hydrated,
    }),
    [
      settings, hydrated,
      updateSettings, updateOrganization, updatePlatform,
      toggleModule, updateFleet, toggleVehicleType,
      addCity, removeCity, updateCityStatus, togglePlatform,
      isModuleEnabled,
      updateIntegrationPlatform, updateCalendar, toggleNotificationChannel,
      addTeamMember, updateTeamMember, removeTeamMember,
      resendInvitation, cancelInvitation, updateAccessConfig,
    ],
  );


  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}
