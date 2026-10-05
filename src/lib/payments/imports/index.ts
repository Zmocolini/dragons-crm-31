// Registry central pentru parsere de plăți per platformă.
// Când primești un raport-mostră nou, adaugi parserul aici și îl înregistrezi în PARSERS.

import * as XLSX from "xlsx";
import type { PlatformKey } from "@/lib/dashboard/types";
import { boltTtgParser } from "./bolt-parser";
import { boltGustyParser } from "./bolt-gusty-parser";
import { woltGustyParser } from "./wolt-gusty-parser";
import { glovoGustyParser } from "./glovo-gusty-parser";
import { subcontractorFor } from "@/lib/subcontractors/name-map";
import type { ParserKey, PlatformImportRow, PlatformParser } from "./types";

export const DEFAULT_COMMISSION_PCT = 10;
export const DEFAULT_WEEKLY_FEE_RON = 210;

export const COURIER_RATES_STORAGE_KEY = "crm31-courier-rates";

export type SavedCourierRate = {
  commissionPct?: number;
  weeklyFeeRon?: number;
  updatedAtIso?: string;
};

/** Citește din localStorage preferințele de comision/taxă salvate per curier. */
export function getSavedCourierRates(): Record<string, SavedCourierRate> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COURIER_RATES_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Întoarce ratele salvate pentru un curier după nume (normalizat). */
export function getSavedCourierRate(fullName: string): SavedCourierRate | null {
  if (!fullName) return null;
  const all = getSavedCourierRates();
  const norm = normalizeName(fullName);
  return all[norm] ?? all[fullName.toLowerCase().trim()] ?? null;
}

/** Salvează sau actualizează comisionul % și taxa săptămânală pentru un curier. */
export function saveCourierRate(
  fullName: string,
  rates: { commissionPct?: number; weeklyFeeRon?: number },
): void {
  if (typeof window === "undefined" || !fullName) return;
  try {
    const norm = normalizeName(fullName);
    const all = getSavedCourierRates();
    const prev = all[norm] ?? {};
    all[norm] = {
      ...prev,
      ...(rates.commissionPct !== undefined ? { commissionPct: rates.commissionPct } : {}),
      ...(rates.weeklyFeeRon !== undefined ? { weeklyFeeRon: rates.weeklyFeeRon } : {}),
      updatedAtIso: new Date().toISOString(),
    };
    localStorage.setItem(COURIER_RATES_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

/** Salvează în bloc rate pentru mai mulți curieri simultan (ex. la confirmare import). */
export function saveBatchCourierRates(
  entries: Array<{ fullName: string; commissionPct?: number; weeklyFeeRon?: number }>,
): void {
  if (typeof window === "undefined" || entries.length === 0) return;
  try {
    const all = getSavedCourierRates();
    const now = new Date().toISOString();
    for (const e of entries) {
      if (!e.fullName) continue;
      const norm = normalizeName(e.fullName);
      const prev = all[norm] ?? {};
      all[norm] = {
        ...prev,
        ...(e.commissionPct !== undefined ? { commissionPct: e.commissionPct } : {}),
        ...(e.weeklyFeeRon !== undefined ? { weeklyFeeRon: e.weeklyFeeRon } : {}),
        updatedAtIso: now,
      };
    }
    localStorage.setItem(COURIER_RATES_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * Comisioane speciale per curier (identificat după nume normalizat).
 * Se aplică la import DACĂ curierul nu are `commissionPct` deja setat în profilul CRM.
 * Odată setat manual în profil sau modificat în import, valoarea salvată are prioritate.
 */
export const COMMISSION_OVERRIDES: Record<string, number> = {
  // Toți curierii cu acord special 3% comision + FĂRĂ taxă 210
  "munasinghe isuru":           3,
  "sajan gole":                 3,
  "flavius-mihai miclauș":      3,
  "flavius-mihai miclaus":      3,
  "vlad-cristian popescu":      3,
  "remus sorin crisan":         3,
  "ayancho francis ambe":       3,
  "serdean simona":             3,
  "sagar waiba":                3,
  "totpati adrian alexandru":   3,
  "neupane nabin kumar":        3,
  "nour eddine adda bouziane":  3,
  "mohamed nadir mrah":         3,
  "andrei daniel berki":        3,

  // Haani San lucrează cu 0% comision și 0 taxă
  "haani san":                  0,
};

/**
 * Taxă contract săptămânală special per curier (fără cei 210 default).
 * Se aplică la import DACĂ curierul nu are `weeklyContractFeeRon` setat.
 * Odată setat manual în profil sau modificat în import, valoarea salvată are prioritate.
 */
export const WEEKLY_FEE_OVERRIDES: Record<string, number> = {
  // Toți curierii cu acord special au comision 3% și taxă contract 0 (fără 210).
  "munasinghe isuru":           0,
  "sajan gole":                 0,
  "flavius-mihai miclauș":      0,
  "flavius-mihai miclaus":      0,
  "vlad-cristian popescu":      0,
  "remus sorin crisan":         0,
  "ayancho francis ambe":       0,
  "serdean simona":             0,
  "sagar waiba":                0,
  "totpati adrian alexandru":   0,
  "neupane nabin kumar":        0,
  "nour eddine adda bouziane":  0,
  "mohamed nadir mrah":         0,
  "andrei daniel berki":        0,

  // Haani San lucrează cu 0% comision și 0 taxă
  "haani san":                  0,
};

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Comision default pentru un rând de import, ținând cont de preferințe salvate și override-uri. */
export function defaultCommissionFor(fullName: string): number {
  if (!fullName) return DEFAULT_COMMISSION_PCT;
  // 1. Prioritate absolută: dacă userul a salvat vreodată un comision specific pentru acest curier
  const saved = getSavedCourierRate(fullName);
  if (saved && typeof saved.commissionPct === "number") {
    return saved.commissionPct;
  }
  const norm = normalizeName(fullName);
  const override = COMMISSION_OVERRIDES[norm]
    ?? COMMISSION_OVERRIDES[fullName.toLowerCase().replace(/\s+/g, " ").trim()];
  if (override !== undefined) return override;
  // Curierii din subcontractare HUSEIN lucrează cu 0% comision
  if (subcontractorFor(fullName) === "HUSEIN") {
    return 0;
  }
  return DEFAULT_COMMISSION_PCT;
}

/** Taxă contract săptămânală default pentru un rând, cu preferințe salvate și override per nume. */
export function defaultWeeklyFeeFor(fullName: string): number {
  if (!fullName) return DEFAULT_WEEKLY_FEE_RON;
  // 1. Prioritate absolută: dacă userul a salvat vreodată o taxă specifică pentru acest curier
  const saved = getSavedCourierRate(fullName);
  if (saved && typeof saved.weeklyFeeRon === "number") {
    return saved.weeklyFeeRon;
  }
  const norm = normalizeName(fullName);
  const override = WEEKLY_FEE_OVERRIDES[norm]
    ?? WEEKLY_FEE_OVERRIDES[fullName.toLowerCase().replace(/\s+/g, " ").trim()];
  if (override !== undefined) return override;
  // Curierii din subcontractare HUSEIN lucrează cu 0 RON taxă contract
  if (subcontractorFor(fullName) === "HUSEIN") {
    return 0;
  }
  return DEFAULT_WEEKLY_FEE_RON;
}

/** Placeholder pentru parsere fără mapare — arată clar user-ului că lipsește. */
function placeholderParser(
  key: ParserKey, platform: PlatformKey, group: "ttg" | "gusty", label: string, help: string,
): PlatformParser {
  return {
    key, platform, group, label,
    status: "coming_soon",
    parse: () => [],
    helpMessage: help,
  };
}

export const PARSERS: PlatformParser[] = [
  boltTtgParser,
  boltGustyParser,
  woltGustyParser,
  glovoGustyParser,
];

export function getParser(key: ParserKey): PlatformParser | null {
  return PARSERS.find((p) => p.key === key) ?? null;
}

/** Detectează automat parserul din fișier. Fallback la prima cu detect() true. */
export function autoDetect(buf: ArrayBuffer): PlatformParser | null {
  try {
    const wb = XLSX.read(buf, { type: "array" });
    for (const p of PARSERS) {
      if (p.status === "ready" && p.detect?.(wb)) return p;
    }
  } catch {}
  return null;
}

/** Detectează parserul din text lipit (TSV/CSV). Verifică header-ul cunoscut per platformă. */
export function autoDetectText(text: string): PlatformParser | null {
  const firstLine = text.split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  if (!firstLine) return null;
  // Bolt Gusty: header conține "adjusted earnings with courier tips" sau "balance after period"
  if (firstLine.includes("adjusted earnings with courier tips") || firstLine.includes("balance after period")) {
    return PARSERS.find((p) => p.key === "bolt_gusty" && p.status === "ready") ?? null;
  }
  // Wolt Gusty: header conține "task fees" + deduceri ("operational fee deduction", "compensation deductions" sau "cash offset")
  if (
    firstLine.includes("task fees") &&
    (firstLine.includes("operational fee") || firstLine.includes("compensation") || firstLine.includes("cash offset"))
  ) {
    return PARSERS.find((p) => p.key === "wolt_gusty" && p.status === "ready") ?? null;
  }
  // Glovo Gusty: header conține "taxa aplicatie" sau "plata zilnica cu cash" + "venituri"/"transferat"
  if (
    (firstLine.includes("taxa aplicatie") || firstLine.includes("plata zilnica cu cash")) &&
    (firstLine.includes("venituri") || firstLine.includes("transferat"))
  ) {
    return PARSERS.find((p) => p.key === "glovo_gusty" && p.status === "ready") ?? null;
  }
  return null;
}

/**
 * Calculează valorile derivate pentru o linie de import de raport platformă.
 *
 * Reguli flotă:
 *  1. Baza de calcul: gross = brutRon + tipsRon.
 *  2. Balanța negativă (cash încasat fizic de curier din comenzi): cashDebt = max(0, negativeBalanceRon).
 *  3. Dacă venitul brut este mai mic sau egal cu cash-ul încasat (gross <= cashDebt):
 *     - Dacă gross === cashDebt (ex: 17.61 cu 17.61): curierul a încasat deja tot venitul,
 *       flota nu percepe comision și nici taxă (comision = 0, taxă = 0). Net = 0.00 RON.
 *     - Dacă gross < cashDebt (ex: gross 200, balanță 400): curierul are o gaură reală de cash.
 *       Flota nu adaugă comision și nici taxă (comision = 0, taxă = 0).
 *       Net = gross - cashDebt (ex: 200 - 400 = -200 RON), indicând suma pe care curierul trebuie să o restituie flotei.
 *  4. Dacă venitul brut este mai mare decât cash-ul încasat (gross > cashDebt):
 *     - Disponibil inițial: available = gross - cashDebt.
 *     - Comisionul se calculează contractual din gross, dar este plafonat la venitul disponibil:
 *       effectiveCommission = min(nominalCommission, available).
 *     - Disponibil după comision: availableAfterComm = max(0, available - effectiveCommission).
 *     - Taxa săptămânală se reține doar în limita disponibilului rămas:
 *       effectiveFee = min(nominalFee, availableAfterComm).
 *     - Net = availableAfterComm - effectiveFee. Curierul nu trece NICIODATĂ pe minus din cauza taxei sau comisionului.
 */
export function computeImportRowMath(
  row: PlatformImportRow, commissionPct: number, weeklyFeeRon: number,
): {
  grossRon: number;
  commissionRon: number;
  nominalCommissionRon: number;
  netRon: number;
  effectiveFeeRon: number;
} {
  const gross = round2(row.brutRon + row.tipsRon);
  const cashDebt = Math.max(0, row.negativeBalanceRon);
  const nominalCommission = round2(gross * (Math.max(0, commissionPct) / 100));
  const nominalFee = Math.max(0, weeklyFeeRon);

  const rawCashResidual = round2(gross - cashDebt);

  // Cazul 1 & 2: Balanța negativă acoperă sau depășește venitul brut
  if (rawCashResidual <= 0) {
    const net = Math.abs(rawCashResidual) < 0.001 ? 0 : rawCashResidual;
    return {
      grossRon: gross,
      commissionRon: 0,
      nominalCommissionRon: nominalCommission,
      netRon: net,
      effectiveFeeRon: 0,
    };
  }

  // Cazul 3 & 4: Există venit disponibil după deducerea cash-ului
  const available = rawCashResidual;
  const effectiveCommission = Math.min(nominalCommission, available);
  const availableAfterComm = Math.max(0, round2(available - effectiveCommission));
  const effectiveFee = Math.min(nominalFee, availableAfterComm);
  const rawNet = round2(availableAfterComm - effectiveFee);
  const net = Math.abs(rawNet) < 0.001 ? 0 : rawNet;

  return {
    grossRon: gross,
    commissionRon: effectiveCommission,
    nominalCommissionRon: nominalCommission,
    netRon: net,
    effectiveFeeRon: effectiveFee,
  };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export type { ParserKey, PlatformImportRow, PlatformParser };
