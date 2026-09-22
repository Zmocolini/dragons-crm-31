// Parser Glovo Gusty — raport agregat exportat de Gusty pentru Glovo.
//
// Structură coloane (0-based):
//   A: Nume | B: Venituri | C: Tips | D: (separator) |
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

const COL = {
  name:            0,   // A
  venituri:        1,   // B
  tips:            2,   // C
  // 3: separator
  cashPayment:     4,   // E — deducere (stocat negativ)
  appFee:          5,   // F — deducere (stocat negativ)
  accountOpenFee:  6,   // G — deducere (stocat negativ)
  totalTransfer:   7,   // H — informativ
  city:            8,   // I
  courierId:       9,   // J
};

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

function buildRow(cells: unknown[]): PlatformImportRow | null {
  const fullName = toStr(cells[COL.name]);
  const uid = toStr(cells[COL.courierId]);
  if (!uid || uid.toLowerCase() === "id curier") return null;
  if (!fullName || fullName.toLowerCase() === "nume") return null;

  const venituri = toNum(cells[COL.venituri]);
  const tips     = toNum(cells[COL.tips]);
  const cash     = toNum(cells[COL.cashPayment]);
  const app      = toNum(cells[COL.appFee]);
  const accFee   = toNum(cells[COL.accountOpenFee]);

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
    city:  toStr(cells[COL.city]) || null,
    ordersCount: 0,
    brutRon: brut,
    tipsRon: tips,
    negativeBalanceRon: deductions,
    raw: {
      venituri, tips,
      cashPayment: cash, appFee: app, accountOpenFee: accFee,
      totalTransfer: toNum(cells[COL.totalTransfer]),
    },
  };
}

function isHeaderRow(row: unknown[]): boolean {
  const joined = row.map((c) => String(c ?? "").toLowerCase()).join("|");
  return joined.includes("nume") && joined.includes("venituri");
}

function parseText(text: string): PlatformImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const sep = lines[0].includes("\t") ? "\t"
            : lines[0].includes(";")  ? ";"
            : ",";
  const rows: unknown[][] = lines.map((l) => l.split(sep));
  const dataRows = isHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const out: PlatformImportRow[] = [];
  for (const r of dataRows) {
    const row = buildRow(r);
    if (row) out.push(row);
  }
  return out;
}

function parseXlsx(buf: ArrayBuffer): PlatformImportRow[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const dataRows = rows.length && isHeaderRow(rows[0]) ? rows.slice(1) : rows;
  const out: PlatformImportRow[] = [];
  for (const r of dataRows) {
    const row = buildRow(r);
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
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return false;
    const first: unknown[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as unknown[] ?? [];
    const joined = first.map((c) => String(c ?? "").toLowerCase()).join("|");
    return joined.includes("taxa aplicatie") && joined.includes("total venituri de transferat");
  },
};
