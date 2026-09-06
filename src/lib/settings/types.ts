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

export type SettingsState = {
  organization: OrganizationInfo;
  platform: PlatformDefaults;
  modules: ModuleFlags;
  fleet: FleetConfig;
  cities: City[];
  platforms: PlatformActive;
  integrations: IntegrationsState;
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
