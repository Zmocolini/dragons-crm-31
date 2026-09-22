"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SETTINGS,
  type AccessConfig,
  type BillingInfo,
  type BrandingConfig,
  type City,
  type IntegrationStatus,
  type IntegrationsState,
  type Invitation,
  type ModuleKey,
  type NotificationChannelKey,
  type NotificationsOrg,
  type OrgCategoryKey,
  type PlatformKey,
  type PaymentMethod,
  type SecurityAlerts,
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
  updateTeamMember: (id: string, patch: Partial<Pick<TeamMember, "name" | "email" | "role" | "workspace" | "status">>) => void;
  removeTeamMember: (id: string) => void;
  resendInvitation: (id: string) => void;
  cancelInvitation: (id: string) => void;
  updateAccessConfig: (patch: Partial<AccessConfig>) => void;
  // Security alerts
  updateSecurityAlerts: (patch: Partial<SecurityAlerts>) => void;
  // Billing
  updateBilling: (patch: Partial<BillingInfo>) => void;
  updatePaymentMethod: (patch: Partial<PaymentMethod>) => void;
  // Branding
  updateBranding: (patch: Partial<BrandingConfig>) => void;
  // Notifications org
  updateNotificationsOrg: (patch: Partial<NotificationsOrg>) => void;
  updateOrgChannel: (key: keyof NotificationsOrg["channels"], next: boolean) => void;
  updateOrgCategory: (key: OrgCategoryKey, patch: { in_app?: boolean; email?: boolean; recipients?: string[] }) => void;
  updateOrgSchedule: (patch: Partial<NotificationsOrg["schedule"]>) => void;
  updateOrgExtras: (patch: Partial<NotificationsOrg["extras"]>) => void;
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
      // Auto-migrate: dacă user-ul are lista veche (<10 orașe), forțăm defaultul cu toate cele 63.
      cities:    (parsed.cities && parsed.cities.length >= 10) ? parsed.cities : DEFAULT_SETTINGS.cities,
      platforms: { ...DEFAULT_SETTINGS.platforms, ...(parsed.platforms ?? {}) },
      integrations: {
        platforms: parsed.integrations?.platforms ?? DEFAULT_SETTINGS.integrations.platforms,
        calendar:  { ...DEFAULT_SETTINGS.integrations.calendar,  ...(parsed.integrations?.calendar ?? {}) },
        channels:  { ...DEFAULT_SETTINGS.integrations.channels,  ...(parsed.integrations?.channels ?? {}) },
      },
      team: {
        // Auto-migrate: dacă există seed members vechi (u_andrei, u_maria etc.), forțăm defaultul.
        // + sanitize role: convertim rolurile RBAC salvate greșit la TeamRoleKey valid.
        members: (() => {
          const raw = parsed.team?.members;
          if (!raw || raw.some((m) => ["u_andrei","u_maria","u_stefan","u_alex","u_cristi","u_dana","u_george","u_laura","u_mihai","u_raluca","u_bogdan"].includes(m.id))) {
            return DEFAULT_SETTINGS.team.members;
          }
          const VALID_TEAM_ROLES = ["global_owner","fleet_admin","subcontractor_admin","hr","payments","viewer"];
          const RBAC_FIX: Record<string, string> = {
            subcontractor_owner: "subcontractor_admin",
            operator_payments:   "payments",
            operator_recruitment:"hr",
          };
          return raw.map((m) => {
            if (VALID_TEAM_ROLES.includes(m.role)) return m;
            const fixed = RBAC_FIX[m.role] ?? "viewer";
            return { ...m, role: fixed };
          });
        })(),
        invitations: (parsed.team?.invitations && !parsed.team.invitations.some((i) => ["inv_1","inv_2"].includes(i.id))) ? parsed.team.invitations : DEFAULT_SETTINGS.team.invitations,
        access:      { ...DEFAULT_SETTINGS.team.access, ...(parsed.team?.access ?? {}) },
      },
      securityAlerts: { ...DEFAULT_SETTINGS.securityAlerts, ...(parsed.securityAlerts ?? {}) },
      billing:        {
        ...DEFAULT_SETTINGS.billing,
        ...(parsed.billing ?? {}),
        paymentMethod: { ...DEFAULT_SETTINGS.billing.paymentMethod, ...(parsed.billing?.paymentMethod ?? {}) },
        invoices:      parsed.billing?.invoices ?? DEFAULT_SETTINGS.billing.invoices,
      },
      branding:       { ...DEFAULT_SETTINGS.branding, ...(parsed.branding ?? {}) },
      notificationsOrg: {
        channels:   { ...DEFAULT_SETTINGS.notificationsOrg.channels,   ...(parsed.notificationsOrg?.channels ?? {}) },
        // Merge inteligent: pornim de la DEFAULT (sursa completă de chei) și suprapunem valorile
        // salvate. Dacă localStorage-ul e vechi/corupt, cade grațios pe defaults.
        categories: DEFAULT_SETTINGS.notificationsOrg.categories.map((defCat) => {
          const stored = parsed.notificationsOrg?.categories?.find((c) => c?.key === defCat.key);
          return stored ? { ...defCat, ...stored } : defCat;
        }),
        schedule:   { ...DEFAULT_SETTINGS.notificationsOrg.schedule,   ...(parsed.notificationsOrg?.schedule ?? {}) },
        extras:     { ...DEFAULT_SETTINGS.notificationsOrg.extras,     ...(parsed.notificationsOrg?.extras ?? {}) },
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
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[settings] localStorage save failed:", err);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("crm31:settings-save-failed"));
      }
    }
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

  const updateTeamMember = useCallback((id: string, patch: Partial<Pick<TeamMember, "name" | "email" | "role" | "workspace" | "status">>) =>
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

  const updateSecurityAlerts = useCallback((patch: Partial<SecurityAlerts>) =>
    setSettings((prev) => ({ ...prev, securityAlerts: { ...prev.securityAlerts, ...patch } })), []);

  const updateBilling = useCallback((patch: Partial<BillingInfo>) =>
    setSettings((prev) => ({ ...prev, billing: { ...prev.billing, ...patch } })), []);

  const updatePaymentMethod = useCallback((patch: Partial<PaymentMethod>) =>
    setSettings((prev) => ({ ...prev, billing: { ...prev.billing, paymentMethod: { ...prev.billing.paymentMethod, ...patch } } })), []);

  const updateBranding = useCallback((patch: Partial<BrandingConfig>) =>
    setSettings((prev) => ({ ...prev, branding: { ...prev.branding, ...patch } })), []);

  const updateNotificationsOrg = useCallback((patch: Partial<NotificationsOrg>) =>
    setSettings((prev) => ({ ...prev, notificationsOrg: { ...prev.notificationsOrg, ...patch } })), []);
  const updateOrgChannel = useCallback((key: keyof NotificationsOrg["channels"], next: boolean) =>
    setSettings((prev) => ({ ...prev, notificationsOrg: { ...prev.notificationsOrg, channels: { ...prev.notificationsOrg.channels, [key]: next } } })), []);
  const updateOrgCategory = useCallback((key: OrgCategoryKey, patch: { in_app?: boolean; email?: boolean; recipients?: string[] }) =>
    setSettings((prev) => ({
      ...prev,
      notificationsOrg: {
        ...prev.notificationsOrg,
        categories: prev.notificationsOrg.categories.map((c) => c.key === key ? { ...c, ...patch } : c),
      },
    })), []);
  const updateOrgSchedule = useCallback((patch: Partial<NotificationsOrg["schedule"]>) =>
    setSettings((prev) => ({ ...prev, notificationsOrg: { ...prev.notificationsOrg, schedule: { ...prev.notificationsOrg.schedule, ...patch } } })), []);
  const updateOrgExtras = useCallback((patch: Partial<NotificationsOrg["extras"]>) =>
    setSettings((prev) => ({ ...prev, notificationsOrg: { ...prev.notificationsOrg, extras: { ...prev.notificationsOrg.extras, ...patch } } })), []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings, updateSettings, updateOrganization, updatePlatform,
      toggleModule, updateFleet, toggleVehicleType,
      addCity, removeCity, updateCityStatus, togglePlatform,
      isModuleEnabled,
      updateIntegrationPlatform, updateCalendar, toggleNotificationChannel,
      addTeamMember, updateTeamMember, removeTeamMember,
      resendInvitation, cancelInvitation, updateAccessConfig,
      updateSecurityAlerts, updateBilling, updatePaymentMethod, updateBranding,
      updateNotificationsOrg, updateOrgChannel, updateOrgCategory, updateOrgSchedule, updateOrgExtras,
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
      updateSecurityAlerts, updateBilling, updatePaymentMethod, updateBranding,
      updateNotificationsOrg, updateOrgChannel, updateOrgCategory, updateOrgSchedule, updateOrgExtras,
    ],
  );


  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}
