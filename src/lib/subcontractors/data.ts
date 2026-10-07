import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { PlatformKey } from "@/lib/dashboard/types";

// Modul Subcontractori — derivat DETERMINIST. TODO(real-users): tabel `subcontractors`.

export type SubStatus = "active" | "evaluation" | "inactive";
export const SUB_STATUS_LABEL: Record<SubStatus, string> = { active: "Activ", evaluation: "În evaluare", inactive: "Inactiv" };
export const SUB_STATUS_STYLE: Record<SubStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  evaluation: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  inactive: "bg-rose-500/15 text-rose-300 border-rose-500/25",
};
export type SubType = "srl" | "pfa";
export const SUB_TYPE_LABEL: Record<SubType, string> = { srl: "SRL (factură)", pfa: "PFA" };

export type SubcontractorContractFile = {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;      // base64 encoded (persistă în localStorage)
  uploadedAtIso: string;
};

export type Subcontractor = {
  id: string; company: string; tagline: string; cui: string;
  contactName: string; contactPhone: string; contactEmail: string; website: string; location: string;
  cities: string[]; platforms: PlatformKey[]; couriersCount: number; commissionPct: number;
  status: SubStatus; type: SubType; startIso: string; contractEndIso: string; tenantId: string;
  revenue3m: number; commissionGenerated: number; payRate: number;
  contractFile?: SubcontractorContractFile | null;
  /** Curieri ai subcontractorului care așteaptă loc pe o platformă (vezi /curieri?segment=asteptare). */
  waitingCount?: number;
};

const TODAY = "2026-09-10"; const DAY = 86400000;
function offset(days: number): string { return new Date(new Date(TODAY + "T00:00:00Z").getTime() + days * DAY).toISOString().slice(0, 10); }
export function daysUntil(iso: string): number { return Math.round((new Date(iso + "T00:00:00Z").getTime() - new Date(TODAY + "T00:00:00Z").getTime()) / DAY); }
function hash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function rng(seed: number): () => number { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// TODO(real-users): SELECT * FROM subcontractors WHERE tenant_id = $1.
const COMPANIES: Array<[string, string, string]> = [];
const CITY_POOL = ["București", "Cluj-Napoca", "Timișoara", "Constanța", "Iași", "Arad", "Brașov"];
const PLATFORMS: PlatformKey[] = ["bolt", "wolt", "glovo"];

export function buildSubcontractors(couriers: CourierRow[], fleetId: string): Subcontractor[] {
  const totalCouriers = couriers.length;
  return COMPANIES.map(([company, tagline, contact], i) => {
    const seed = hash(`${fleetId}|sub|${i}`);
    const r = rng(seed);
    const cityCount = 1 + (seed % 3);
    const cities = Array.from({ length: cityCount }, (_, k) => CITY_POOL[(seed + k) % CITY_POOL.length]).filter((v, k, a) => a.indexOf(v) === k);
    const platCount = 1 + (seed % 3);
    const platforms = PLATFORMS.slice(0, platCount);
    const couriersCount = 8 + (seed % Math.max(4, Math.floor(totalCouriers / 2 || 40)));
    const status: SubStatus = i % 5 === 4 ? "inactive" : i % 3 === 2 ? "evaluation" : "active";
    const commissionPct = 4 + (seed % 6);
    const revenue3m = 40000 + (seed % 120) * 900;
    return {
      id: `sub_${fleetId}_${i}`,
      company, tagline,
      cui: `RO${10000000 + (seed % 89999999)}`,
      contactName: contact,
      contactPhone: `+40 7${20 + (seed % 60)} ${100 + (seed % 900)} ${100 + ((seed >> 3) % 900)}`,
      contactEmail: `${contact.split(" ")[0].toLowerCase()}@${company.split(" ")[0].toLowerCase()}.ro`,
      website: `www.${company.split(" ")[0].toLowerCase()}.ro`,
      location: cities[0],
      cities, platforms, couriersCount, commissionPct, status,
      type: company.includes("PFA") ? "pfa" : "srl",
      startIso: offset(-300 - (seed % 400)),
      contractEndIso: offset(60 + (seed % 400)),
      tenantId: fleetId,
      revenue3m,
      commissionGenerated: Math.round((revenue3m * commissionPct) / 100),
      payRate: 80 + (seed % 20),
    };
  });
}

export type SubKpi = { total: number; active: number; evaluation: number; inactive: number; totalCouriers: number; commissionTotal: number };
export function computeSubKpi(list: Subcontractor[]): SubKpi {
  return {
    total: list.length,
    active: list.filter((s) => s.status === "active").length,
    evaluation: list.filter((s) => s.status === "evaluation").length,
    inactive: list.filter((s) => s.status === "inactive").length,
    totalCouriers: list.reduce((s, x) => s + x.couriersCount, 0),
    commissionTotal: list.reduce((s, x) => s + x.commissionGenerated, 0),
  };
}
