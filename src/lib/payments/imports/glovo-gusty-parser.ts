// Parser Glovo Gusty — raport agregat exportat de Gusty pentru Glovo.
//
// Structură coloane (0-based standard):
//   A: Nume | B: Venituri | C: Tips | D: COMISION (gol în raport) |
//   E: Plata zilnica cu cash | F: Taxa aplicatie | G: Taxa deschidere cont |
//   H: Total Venituri de transferat (informativ, calculat de Glovo) |
//   I: Oras | J: Id curier
//
// Reguli utilizator (confirmate 2026-09-21):
//   • Brut = B + C (Venituri + Tips)
//   • Din brut scădem comisionul (pe brut) + taxa săptămânală de contract → net
//   • Din net scădem E + F + G (Plata cash + Taxa aplicație + Taxa deschidere cont)
//   • E, F, G sunt stocate cu semn NEGATIV în raport (deduceri) — luăm |val|
//   • H (Total Venituri de transferat) e informativ, nu-l folosim la calcul

import * as XLSX from "xlsx";
import type { PlatformImportRow, PlatformParser } from "./types";

interface ColMap {
  name: number;
  venituri: number;
  tips: number;
  cashPayment: number;
  appFee: number;
  accountOpenFee: number;
  totalTransfer: number;
  city: number;
  courierId: number;
}

const DEFAULT_COL: ColMap = {
  name: 0,
  venituri: 1,
  tips: 2,
  cashPayment: 4,
  appFee: 5,
  accountOpenFee: 6,
  totalTransfer: 7,
  city: 8,
  courierId: 9,
};

function normalizeHeaderStr(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveColMap(headerCells: unknown[]): ColMap {
  const norm = headerCells.map(normalizeHeaderStr);
  const findCol = (predicate: (h: string) => boolean, fallback: number) => {
    const idx = norm.findIndex(predicate);
    return idx !== -1 ? idx : fallback;
  };

  return {
    name: findCol((h) => h === "nume" || h.startsWith("nume ") || h === "courier name", DEFAULT_COL.name),
    venituri: findCol((h) => (h.includes("venituri") || h.includes("venit") || h.includes("earnings")) && !h.includes("total"), DEFAULT_COL.venituri),
    tips: findCol((h) => h.includes("tips") || h.includes("bacsis"), DEFAULT_COL.tips),
    cashPayment: findCol((h) => h.includes("cash") || h.includes("plata zilnica"), DEFAULT_COL.cashPayment),
    appFee: findCol((h) => (h.includes("taxa") && (h.includes("aplicatie") || h.includes("app"))) || h.includes("app fee"), DEFAULT_COL.appFee),
    accountOpenFee: findCol((h) => h.includes("deschidere") || h.includes("onboarding"), DEFAULT_COL.accountOpenFee),
    totalTransfer: findCol((h) => h.includes("total venituri") || h.includes("transferat"), DEFAULT_COL.totalTransfer),
    city: findCol((h) => h === "oras" || h === "city" || h.includes("oras"), DEFAULT_COL.city),
    courierId: findCol((h) => h.includes("id curier") || h.includes("courier id") || h === "id" || h === "uid" || h.startsWith("id ") || h.endsWith(" id"), DEFAULT_COL.courierId),
  };
}

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return isFinite(n) ? n : 0;
  }
  return 0;
}

function toStr(v: unknown): string { return v == null ? "" : String(v).trim(); }

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function buildRow(cells: unknown[], colMap: ColMap): PlatformImportRow | null {
  const fullName = toStr(cells[colMap.name]);
  if (!fullName || fullName.toLowerCase() === "nume" || fullName.toLowerCase() === "total") return null;

  const rawUid = toStr(cells[colMap.courierId]);
  const uid = (rawUid && rawUid.toLowerCase() !== "id curier")
    ? rawUid
    : `glovo_${normalizeName(fullName).replace(/\s+/g, "_")}`;

  const venituri = toNum(cells[colMap.venituri]);
  const tips     = toNum(cells[colMap.tips]);
  const cash     = toNum(cells[colMap.cashPayment]);
  const app      = toNum(cells[colMap.appFee]);
  const accFee   = toNum(cells[colMap.accountOpenFee]);

  const brut = Math.round(venituri * 100) / 100;
  const deductions = Math.round(
    (Math.abs(cash) + Math.abs(app) + Math.abs(accFee)) * 100,
  ) / 100;

  const { firstName, lastName } = splitName(fullName);

  return {
    platform: "glovo",
    uid,
    firstName,
    lastName,
    fullName,
    phone: null,
    email: null,
    city:  toStr(cells[colMap.city]) || null,
    ordersCount: 0,
    brutRon: brut,
    tipsRon: tips,
    negativeBalanceRon: deductions,
    raw: {
      venituri, tips,
      cashPayment: cash, appFee: app, accountOpenFee: accFee,
      totalTransfer: toNum(cells[colMap.totalTransfer]),
    },
  };
}

function isHeaderRow(row: unknown[]): boolean {
  if (!Array.isArray(row)) return false;
  const joined = row.map(normalizeHeaderStr).join("|");
  return joined.includes("nume") && (joined.includes("venituri") || joined.includes("venit"));
}

function parseText(text: string): PlatformImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const sep = lines[0].includes("\t") ? "\t"
            : lines[0].includes(";")  ? ";"
            : ",";
  const rows: unknown[][] = lines.map((l) => l.split(sep));
  const headerIdx = rows.findIndex(isHeaderRow);
  const colMap = headerIdx !== -1 ? resolveColMap(rows[headerIdx]) : DEFAULT_COL;
  const dataRows = headerIdx !== -1 ? rows.slice(headerIdx + 1) : rows;
  const out: PlatformImportRow[] = [];
  for (const r of dataRows) {
    const row = buildRow(r, colMap);
    if (row) out.push(row);
  }
  return out;
}

function parseXlsx(buf: ArrayBuffer): PlatformImportRow[] {
  const wb = XLSX.read(buf, { type: "array" });
  if (!wb.SheetNames?.length) return [];
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (!rows || rows.length === 0) return [];
  const headerIdx = rows.findIndex(isHeaderRow);
  const colMap = headerIdx !== -1 ? resolveColMap(rows[headerIdx]) : DEFAULT_COL;
  const dataRows = headerIdx !== -1 ? rows.slice(headerIdx + 1) : rows;
  const out: PlatformImportRow[] = [];
  for (const r of dataRows) {
    const row = buildRow(r, colMap);
    if (row) out.push(row);
  }
  return out;
}

export const glovoGustyParser: PlatformParser = {
  key: "glovo_gusty",
  platform: "glovo",
  group: "gusty",
  label: "Gusty · Glovo",
  status: "ready",
  parse: parseXlsx,
  parseText,
  detect: (wb: unknown) => {
    const workbook = wb as XLSX.WorkBook;
    if (!workbook.SheetNames?.length) return false;
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
      const checkRows = rows.slice(0, 5);
      for (const r of checkRows) {
        if (!Array.isArray(r)) continue;
        const joined = r.map((c) => String(c ?? "").toLowerCase()).join("|");
        if (
          (joined.includes("taxa aplicatie") || joined.includes("plata zilnica cu cash")) &&
          (joined.includes("total venituri") || joined.includes("transferat"))
        ) {
          return true;
        }
      }
    }
    return false;
  },
};
