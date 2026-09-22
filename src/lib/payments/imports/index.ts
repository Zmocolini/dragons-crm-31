// Registry central pentru parsere de plăți per platformă.
// Când primești un raport-mostră nou, adaugi parserul aici și îl înregistrezi în PARSERS.

import * as XLSX from "xlsx";
import type { PlatformKey } from "@/lib/dashboard/types";
import { boltTtgParser } from "./bolt-parser";
import { boltGustyParser } from "./bolt-gusty-parser";
import { woltGustyParser } from "./wolt-gusty-parser";
import { glovoGustyParser } from "./glovo-gusty-parser";
import type { ParserKey, PlatformImportRow, PlatformParser } from "./types";

export const DEFAULT_COMMISSION_PCT = 10;
export const DEFAULT_WEEKLY_FEE_RON = 210;

/**
 * Comisioane speciale per curier (identificat după nume normalizat).
 * Se aplică la import DACĂ curierul nu are `commissionPct` deja setat în profilul CRM.
 * Odată setat manual în profil, valoarea din profil are prioritate.
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
};

/**
 * Taxă contract săptămânală special per curier (fără cei 210 default).
 * Se aplică la import DACĂ curierul nu are `weeklyContractFeeRon` setat.
 * Odată setat manual în profil, valoarea din profil are prioritate.
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
};

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Comision default pentru un rând de import, ținând cont de override-uri per nume. */
export function defaultCommissionFor(fullName: string): number {
  const norm = normalizeName(fullName);
  return COMMISSION_OVERRIDES[norm]
    ?? COMMISSION_OVERRIDES[fullName.toLowerCase().replace(/\s+/g, " ").trim()]
    ?? DEFAULT_COMMISSION_PCT;
}

/** Taxă contract săptămânală default pentru un rând, cu override per nume. */
export function defaultWeeklyFeeFor(fullName: string): number {
  const norm = normalizeName(fullName);
  const override = WEEKLY_FEE_OVERRIDES[norm]
    ?? WEEKLY_FEE_OVERRIDES[fullName.toLowerCase().replace(/\s+/g, " ").trim()];
  return override !== undefined ? override : DEFAULT_WEEKLY_FEE_RON;
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
  // Wolt Gusty: header conține "task fees" + "operational fee deduction"
  if (firstLine.includes("task fees") && firstLine.includes("operational fee deduction")) {
    return PARSERS.find((p) => p.key === "wolt_gusty" && p.status === "ready") ?? null;
  }
  // Glovo Gusty: header conține "taxa aplicatie" + "total venituri de transferat"
  if (firstLine.includes("taxa aplicatie") && firstLine.includes("total venituri de transferat")) {
    return PARSERS.find((p) => p.key === "glovo_gusty" && p.status === "ready") ?? null;
  }
  return null;
}

/** Calculează valorile derivate pentru o linie de import. */
export function computeImportRowMath(
  row: PlatformImportRow, commissionPct: number, weeklyFeeRon: number,
): { grossRon: number; commissionRon: number; netRon: number } {
  const gross = round2(row.brutRon + row.tipsRon);
  const commission = round2(gross * (commissionPct / 100));
  const net = round2(gross - commission - weeklyFeeRon - row.negativeBalanceRon);
  return { grossRon: gross, commissionRon: commission, netRon: net };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export type { ParserKey, PlatformImportRow, PlatformParser };
