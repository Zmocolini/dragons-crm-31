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
  announcementText: string;
  allowPublicSignup: boolean;
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
  /** Versiunea default-urilor de vehicul deja aplicate setărilor salvate (2 = „Mașină" pornită). */
  vehicleDefaultsV?: number;
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
  hr:                   "Acces la candidați și documente HR.",
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
    // Doar userul curent (Global Owner). Restul se adaugă real din /setari sau /utilizatori.
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
    /* SEED_MEMBERS_REMOVED_START
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
    SEED_MEMBERS_REMOVED_END */
  ],
  invitations: [],
  access: {
    allowedDomains: ["dragondelivery.ro"],
    disableOnLeave: true,
  },
};

/* ─── SECURITY ALERTS ─── */
export type SecurityAlerts = {
  newLogins: boolean;
  passwordChanges: boolean;
  unusualActivity: boolean;
};

export const DEFAULT_SECURITY_ALERTS: SecurityAlerts = {
  newLogins:        true,
  passwordChanges:  true,
  unusualActivity:  true,
};

/* ─── NOTIFICATIONS ORG (nivel organizație — distinct de profil user) ─── */
export type OrgChannelKey = "in_app" | "email" | "push_browser";
export type OrgChannels = Record<OrgChannelKey, boolean>;

export type OrgCategoryKey =
  | "payments_couriers"
  | "docs_expired"
  | "tasks_followup"
  | "issues_urgent"
  | "weekly_reports";

export type OrgCategory = {
  key: OrgCategoryKey;
  in_app: boolean;
  email:  boolean;
  recipients: string[]; // labels de roluri destinatari
};

export type PaymentSchedule = {
  wednesday: boolean; // Încep plățile
  thursday:  boolean; // Reminder plăți
  friday:    boolean; // Plăți rămase
};

export type NotifExtras = {
  dailyDigest:      boolean;
  importantOnly:    boolean;
  urgentSound:      boolean;
};

export type NotificationsOrg = {
  channels:   OrgChannels;
  categories: OrgCategory[];
  schedule:   PaymentSchedule;
  extras:     NotifExtras;
};

export const ORG_CATEGORY_LABEL: Record<OrgCategoryKey, string> = {
  payments_couriers:    "Plăți curieri",
  docs_expired:         "Documente expirate",
  tasks_followup:       "Task-uri și follow-up",
  issues_urgent:        "Probleme urgente",
  weekly_reports:       "Rapoarte săptămânale",
};

export const DEFAULT_NOTIFICATIONS_ORG: NotificationsOrg = {
  channels: {
    in_app:        true,
    email:         true,
    push_browser:  false,
  },
  categories: [
    { key: "payments_couriers",    in_app: true,  email: true,  recipients: ["Admin", "Operator plăți", "Subcontractor"] },
    { key: "docs_expired",         in_app: true,  email: true,  recipients: ["HR", "Manager flotă"] },
    { key: "tasks_followup",       in_app: true,  email: false, recipients: ["Utilizator asignat"] },
    { key: "issues_urgent",        in_app: true,  email: true,  recipients: ["Manager flotă", "Owner"] },
    { key: "weekly_reports",       in_app: false, email: true,  recipients: ["Owner", "Manager flotă"] },
  ],
  schedule: {
    wednesday: true,
    thursday:  true,
    friday:    true,
  },
  extras: {
    dailyDigest:    true,
    importantOnly:  true,
    urgentSound:    true,
  },
};

/* ─── BILLING ─── */
export type Invoice = {
  id: string;
  number: string;
  dateIso: string;
  amountRon: number;
  status: "paid" | "pending" | "overdue";
};

export type PaymentMethod = {
  brand: "mastercard" | "visa" | "amex";
  last4: string;
  expiresMonth: number;
  expiresYear: number;
  holder: string;
};

export type BillingInfo = {
  planKey: "starter" | "business" | "enterprise";
  planLabel: string;
  planLimit: number;
  nextBillingIso: string;
  billingName: string;
  billingCui: string;
  billingEmail: string;
  billingAddress: string;
  paymentMethod: PaymentMethod;
  invoices: Invoice[];
};

export const DEFAULT_BILLING: BillingInfo = {
  planKey: "business",
  planLabel: "Plan Business",
  planLimit: 500,
  nextBillingIso: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
  billingName: "Dragon Delivery",
  billingCui: "RO12345678",
  billingEmail: "office@dragondelivery.ro",
  billingAddress: "București, România",
  paymentMethod: {
    brand: "mastercard",
    last4: "4242",
    expiresMonth: 12,
    expiresYear: 2028,
    holder: "Dragon Delivery SRL",
  },
  invoices: [
    { id: "inv_2026_09", number: "DD-2026-09", dateIso: "2026-09-01T09:00:00Z", amountRon: 1990, status: "paid" },
    { id: "inv_2026_08", number: "DD-2026-08", dateIso: "2026-08-01T09:00:00Z", amountRon: 1990, status: "paid" },
    { id: "inv_2026_07", number: "DD-2026-07", dateIso: "2026-07-01T09:00:00Z", amountRon: 1990, status: "paid" },
  ],
};

/* ─── BRANDING ─── */
export type BrandingConfig = {
  primaryColor: string;      // hex
  accentColor: string;       // hex
  displayName: string;
  slogan: string;
  showSloganInFooter: boolean;
  sidebarExpandedByDefault: boolean;
};

export const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: "#7c3aed",  // violet-600
  accentColor:  "#2563eb",  // blue-600
  displayName:  "Dragon Delivery",
  slogan:       "MORE THAN DELIVERY",
  showSloganInFooter: true,
  sidebarExpandedByDefault: true,
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
  securityAlerts: SecurityAlerts;
  billing: BillingInfo;
  branding: BrandingConfig;
  notificationsOrg: NotificationsOrg;
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
  showAnnouncements: false,
  announcementText: "",
  allowPublicSignup: true,
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
    car:     true,
  },
  allowOwnVehicle:    true,
  allowRentedVehicle: true,
  vehicleDefaultsV:   2,
};

// Cele 63 de orașe din Prezența Națională Dragon Delivery (dragondelivery.ro).
export const DEFAULT_CITIES: City[] = [
  { id: "c_alba_iulia", name: "Alba Iulia", status: "active" },
  { id: "c_alexandria", name: "Alexandria", status: "active" },
  { id: "c_arad", name: "Arad", status: "active" },
  { id: "c_bacau", name: "Bacău", status: "active" },
  { id: "c_baia_mare", name: "Baia Mare", status: "active" },
  { id: "c_barlad", name: "Bârlad", status: "active" },
  { id: "c_bistrita", name: "Bistrița", status: "active" },
  { id: "c_botosani", name: "Botoșani", status: "active" },
  { id: "c_braila", name: "Brăila", status: "active" },
  { id: "c_brasov", name: "Brașov", status: "active" },
  { id: "c_buc", name: "București", status: "active" },
  { id: "c_buftea", name: "Buftea", status: "active" },
  { id: "c_busteni", name: "Bușteni", status: "active" },
  { id: "c_buzau", name: "Buzău", status: "active" },
  { id: "c_calarasi", name: "Călărași", status: "active" },
  { id: "c_campina", name: "Câmpina", status: "active" },
  { id: "c_campulung", name: "Câmpulung", status: "active" },
  { id: "c_caracal", name: "Caracal", status: "active" },
  { id: "c_cluj", name: "Cluj-Napoca", status: "active" },
  { id: "c_constanta", name: "Constanța", status: "active" },
  { id: "c_corbeanca", name: "Corbeanca", status: "active" },
  { id: "c_craiova", name: "Craiova", status: "active" },
  { id: "c_dej", name: "Dej", status: "active" },
  { id: "c_deva", name: "Deva", status: "active" },
  { id: "c_drobeta", name: "Drobeta-Turnu Severin", status: "active" },
  { id: "c_focsani", name: "Focșani", status: "active" },
  { id: "c_galati", name: "Galați", status: "active" },
  { id: "c_giurgiu", name: "Giurgiu", status: "active" },
  { id: "c_hunedoara", name: "Hunedoara", status: "active" },
  { id: "c_husi", name: "Huși", status: "active" },
  { id: "c_iasi", name: "Iași", status: "active" },
  { id: "c_mamaia", name: "Mamaia", status: "active" },
  { id: "c_mangalia", name: "Mangalia", status: "active" },
  { id: "c_medias", name: "Mediaș", status: "active" },
  { id: "c_miercurea", name: "Miercurea Ciuc", status: "active" },
  { id: "c_onesti", name: "Onești", status: "active" },
  { id: "c_oradea", name: "Oradea", status: "active" },
  { id: "c_pascani", name: "Pașcani", status: "active" },
  { id: "c_petrosani", name: "Petroșani", status: "active" },
  { id: "c_piatra_neamt", name: "Piatra Neamț", status: "active" },
  { id: "c_pitesti", name: "Pitești", status: "active" },
  { id: "c_ploiesti", name: "Ploiești", status: "active" },
  { id: "c_radauti", name: "Rădăuți", status: "active" },
  { id: "c_ramnicu_valcea", name: "Râmnicu Vâlcea", status: "active" },
  { id: "c_resita", name: "Reșița", status: "active" },
  { id: "c_roman", name: "Roman", status: "active" },
  { id: "c_satu_mare", name: "Satu Mare", status: "active" },
  { id: "c_sfantu_gheorghe", name: "Sfântu Gheorghe", status: "active" },
  { id: "c_sibiu", name: "Sibiu", status: "active" },
  { id: "c_sighisoara", name: "Sighișoara", status: "active" },
  { id: "c_sinaia", name: "Sinaia", status: "active" },
  { id: "c_slatina", name: "Slatina", status: "active" },
  { id: "c_slobozia", name: "Slobozia", status: "active" },
  { id: "c_suceava", name: "Suceava", status: "active" },
  { id: "c_targoviste", name: "Târgoviște", status: "active" },
  { id: "c_targu_jiu", name: "Târgu Jiu", status: "active" },
  { id: "c_targu_mures", name: "Târgu Mureș", status: "active" },
  { id: "c_timisoara", name: "Timișoara", status: "active" },
  { id: "c_tulcea", name: "Tulcea", status: "active" },
  { id: "c_turda", name: "Turda", status: "active" },
  { id: "c_valea_prahovei", name: "Valea Prahovei", status: "active" },
  { id: "c_vaslui", name: "Vaslui", status: "active" },
  { id: "c_zalau", name: "Zalău", status: "active" },
  // Republica Moldova
  { id: "c_chisinau", name: "Chișinău", status: "active" },
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
  securityAlerts: DEFAULT_SECURITY_ALERTS,
  billing: DEFAULT_BILLING,
  branding: DEFAULT_BRANDING,
  notificationsOrg: DEFAULT_NOTIFICATIONS_ORG,
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
