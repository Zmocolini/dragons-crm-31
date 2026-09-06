import type { DateFormat, Language, TimeFormat } from "@/lib/profile/types";

export type OrganizationInfo = {
  name: string;
  cui: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoDataUrl: string | null;
  faviconDataUrl: string | null;
};

export type PlatformDefaults = {
  language: Language;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  maintenanceMode: boolean;
  showAnnouncements: boolean;
  allowPublicSignup: boolean;
  autoValidateDocuments: boolean;
};

export type ModuleKey =
  | "vehicles"
  | "accommodations"
  | "equipment"
  | "bags"
  | "subcontractors"
  | "issues";

export type ModuleFlags = Record<ModuleKey, boolean>;

export type VehicleType = "bike" | "e_bike" | "scooter" | "car";
export const VEHICLE_TYPES: VehicleType[] = ["bike", "e_bike", "scooter", "car"];

export type FleetConfig = {
  vehicleTypesAllowed: Record<VehicleType, boolean>;
  allowOwnVehicle: boolean;
  allowRentedVehicle: boolean;
};

export type CityStatus = "active" | "waitlist" | "unavailable";
export type City = {
  id: string;
  name: string;
  status: CityStatus;
};

export type PlatformKey = "bolt" | "wolt" | "glovo";
export type PlatformStatus = "active" | "inactive";
export type PlatformActive = Record<PlatformKey, PlatformStatus>;

export type IntegrationStatus = "connected" | "verifying" | "disconnected";

export type IntegrationPlatform = {
  key: PlatformKey;
  status: IntegrationStatus;
  lastSyncIso: string | null;
  account: string | null; // ex: "office@dragondelivery.ro" (afișare, fără tokens)
};

export type CalendarConfig = {
  internalEnabled: boolean;
  googleConnected: boolean;
  googleAccount: string | null;
};

export type NotificationChannelKey = "in_app" | "email" | "whatsapp";
export type NotificationChannels = Record<NotificationChannelKey, boolean>;

export type IntegrationsState = {
  platforms: IntegrationPlatform[];
  calendar: CalendarConfig;
  channels: NotificationChannels;
};

export const DEFAULT_INTEGRATIONS: IntegrationsState = {
  platforms: [
    { key: "bolt",  status: "connected",    lastSyncIso: new Date().toISOString(),                            account: "fleet@dragondelivery.ro" },
    { key: "wolt",  status: "verifying",    lastSyncIso: new Date(Date.now() - 27 * 3600e3).toISOString(),    account: "fleet@dragondelivery.ro" },
    { key: "glovo", status: "disconnected", lastSyncIso: null,                                                account: null },
  ],
  calendar: {
    internalEnabled: true,
    googleConnected: false,
    googleAccount: null,
  },
  channels: {
    in_app:   true,
    email:    true,
    whatsapp: false,
  },
};

export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  connected:    "Conectat",
  verifying:    "În verificare",
  disconnected: "Neconectat",
};

export const CHANNEL_LABEL: Record<NotificationChannelKey, string> = {
  in_app:   "Notificări în aplicație",
  email:    "E-mail",
  whatsapp: "WhatsApp",
};

export const CHANNEL_DESC: Record<NotificationChannelKey, string> = {
  in_app:   "Primește notificări în CRM.",
  email:    "Primește detalii pe e-mail.",
  whatsapp: "Primește notificări pe WhatsApp.",
};

/* ─── TEAM & ACCESS ─── */
export type TeamRoleKey =
  | "global_owner"
  | "fleet_admin"
  | "subcontractor_admin"
  | "hr"
  | "payments"
  | "viewer";

export const TEAM_ROLE_LABEL: Record<TeamRoleKey, string> = {
  global_owner:         "Global Owner",
  fleet_admin:          "Admin flotă",
  subcontractor_admin:  "Subcontractor Admin",
  hr:                   "HR / Recrutare",
  payments:             "Operator plăți",
  viewer:               "Viewer",
};

export const TEAM_ROLE_DESC: Record<TeamRoleKey, string> = {
  global_owner:         "Acces complet la toate modulele și setările.",
  fleet_admin:          "Gestionează flota, utilizatorii și operațiunile.",
  subcontractor_admin:  "Gestionează subcontractorii și colaboratorii proprii.",
  hr:                   "Acces la candidați, interviuri și activări.",
  payments:             "Acces la plăți, facturi și documente financiare.",
  viewer:               "Acces doar în citire la datele permise.",
};

export type TeamMemberStatus = "active" | "invited" | "suspended" | "expired";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: TeamRoleKey;
  workspace: string;     // "Toate flotele" sau nume flotă
  workspaceAll: boolean; // true pentru Global Owner
  lastActiveIso: string | null;
  status: TeamMemberStatus;
  invitedAtIso: string | null;
};

export type InvitationStatus = "sent" | "accepted" | "expired" | "cancelled";

export type Invitation = {
  id: string;
  email: string;
  role: TeamRoleKey;
  workspace: string;
  sentAtIso: string;
  status: InvitationStatus;
};

export type AccessConfig = {
  allowedDomains: string[];
  disableOnLeave: boolean;
};

export type TeamState = {
  members: TeamMember[];
  invitations: Invitation[];
  access: AccessConfig;
};

export const DEFAULT_TEAM: TeamState = {
  members: [
    {
      id: "u_ioan",
      name: "Ioan Varga",
      email: "ioan.varga@dragondelivery.ro",
      avatarUrl: null,
      role: "global_owner",
      workspace: "Toate flotele",
      workspaceAll: true,
      lastActiveIso: new Date().toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_andrei",
      name: "Andrei Manea",
      email: "andrei.manea@dragondelivery.ro",
      avatarUrl: null,
      role: "fleet_admin",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 45 * 60_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_maria",
      name: "Maria Popescu",
      email: "maria.popescu@dragondelivery.ro",
      avatarUrl: null,
      role: "hr",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 3 * 3600_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_stefan",
      name: "Ștefan Ionescu",
      email: "stefan.ionescu@dragondelivery.ro",
      avatarUrl: null,
      role: "payments",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: null,
      status: "invited",
      invitedAtIso: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    },
    {
      id: "u_alex",
      name: "Alexandra Radu",
      email: "alex.radu@dragondelivery.ro",
      avatarUrl: null,
      role: "fleet_admin",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 26 * 3600_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_cristi",
      name: "Cristian Ene",
      email: "cristian.ene@dragondelivery.ro",
      avatarUrl: null,
      role: "hr",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_dana",
      name: "Dana Voicu",
      email: "dana.voicu@dragondelivery.ro",
      avatarUrl: null,
      role: "payments",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 12 * 3600_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_george",
      name: "George Dumitru",
      email: "george.dumitru@dragondelivery.ro",
      avatarUrl: null,
      role: "subcontractor_admin",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_laura",
      name: "Laura Pop",
      email: "laura.pop@dragondelivery.ro",
      avatarUrl: null,
      role: "viewer",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 60 * 60_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
    {
      id: "u_mihai",
      name: "Mihai Constantin",
      email: "mihai.constantin@dragondelivery.ro",
      avatarUrl: null,
      role: "viewer",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 8 * 86_400_000).toISOString(),
      status: "suspended",
      invitedAtIso: null,
    },
    {
      id: "u_raluca",
      name: "Raluca Ștefănescu",
      email: "raluca.stefanescu@dragondelivery.ro",
      avatarUrl: null,
      role: "hr",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: null,
      status: "invited",
      invitedAtIso: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    },
    {
      id: "u_bogdan",
      name: "Bogdan Marin",
      email: "bogdan.marin@dragondelivery.ro",
      avatarUrl: null,
      role: "fleet_admin",
      workspace: "Dragon Delivery",
      workspaceAll: false,
      lastActiveIso: new Date(Date.now() - 90 * 60_000).toISOString(),
      status: "active",
      invitedAtIso: null,
    },
  ],
  invitations: [
    { id: "inv_1", email: "stefan.ionescu@dragondelivery.ro", role: "payments", workspace: "Dragon Delivery", sentAtIso: new Date(Date.now() - 2 * 86_400_000).toISOString(), status: "sent" },
    { id: "inv_2", email: "raluca.stefanescu@dragondelivery.ro", role: "hr",       workspace: "Dragon Delivery", sentAtIso: new Date(Date.now() - 5 * 86_400_000).toISOString(), status: "sent" },
  ],
  access: {
    allowedDomains: ["dragondelivery.ro"],
    disableOnLeave: true,
  },
};

export type SettingsState = {
  organization: OrganizationInfo;
  platform: PlatformDefaults;
  modules: ModuleFlags;
  fleet: FleetConfig;
  cities: City[];
  platforms: PlatformActive;
  integrations: IntegrationsState;
  team: TeamState;
};

export const DEFAULT_ORG: OrganizationInfo = {
  name: "Dragon Delivery",
  cui: "RO12345678",
  email: "office@dragondelivery.ro",
  phone: "+40 721 234 567",
  address: "București, România",
  website: "www.dragondelivery.ro",
  logoDataUrl: null,
  faviconDataUrl: null,
};

export const DEFAULT_PLATFORM_DEFAULTS: PlatformDefaults = {
  language: "ro",
  timezone: "Europe/Bucharest",
  dateFormat: "DD.MM.YYYY",
  timeFormat: "24h",
  maintenanceMode: false,
  showAnnouncements: true,
  allowPublicSignup: true,
  autoValidateDocuments: false,
};

export const DEFAULT_MODULES: ModuleFlags = {
  vehicles:       true,
  accommodations: true,
  equipment:      true,
  bags:           true,
  subcontractors: true,
  issues:         true,
};

export const DEFAULT_FLEET: FleetConfig = {
  vehicleTypesAllowed: {
    bike:    true,
    e_bike:  true,
    scooter: true,
    car:     false,
  },
  allowOwnVehicle:    true,
  allowRentedVehicle: true,
};

export const DEFAULT_CITIES: City[] = [
  { id: "c_buc", name: "București",   status: "active" },
  { id: "c_cluj", name: "Cluj-Napoca", status: "active" },
  { id: "c_tm",   name: "Timișoara",   status: "active" },
  { id: "c_ct",   name: "Constanța",   status: "waitlist" },
];

export const DEFAULT_PLATFORMS: PlatformActive = {
  bolt:  "active",
  wolt:  "active",
  glovo: "active",
};

export const DEFAULT_SETTINGS: SettingsState = {
  organization: DEFAULT_ORG,
  platform: DEFAULT_PLATFORM_DEFAULTS,
  modules: DEFAULT_MODULES,
  fleet: DEFAULT_FLEET,
  cities: DEFAULT_CITIES,
  platforms: DEFAULT_PLATFORMS,
  integrations: DEFAULT_INTEGRATIONS,
  team: DEFAULT_TEAM,
};

export const MODULE_LABEL: Record<ModuleKey, string> = {
  vehicles:       "Vehicule",
  accommodations: "Cazări",
  equipment:      "Echipamente",
  bags:           "Genți",
  subcontractors: "Subcontractori",
  issues:         "Probleme / Suport",
};

export const MODULE_DESCRIPTION: Record<ModuleKey, string> = {
  vehicles:       "Gestionează vehiculele flotei.",
  accommodations: "Gestionează cazările curierilor.",
  equipment:      "Gestionează echipamentele și materialele.",
  bags:           "Gestionează gențile și accesoriile.",
  subcontractors: "Gestionează curierii subcontractori.",
  issues:         "Gestionează sesizările și suportul operațional.",
};

// Mapare href sidebar → modul care îl controlează
export const MODULE_FOR_HREF: Record<string, ModuleKey> = {
  "/vehicule":        "vehicles",
  "/cazari":          "accommodations",
  "/subcontractori":  "subcontractors",
  "/probleme":        "issues",
  // Echipamente și Genți n-au route în CRM 3.1 momentan
};

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  bike:    "Bicicletă",
  e_bike:  "Bicicletă electrică",
  scooter: "Scuter",
  car:     "Mașină",
};

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  bolt:  "Bolt Food",
  wolt:  "Wolt",
  glovo: "Glovo",
};
