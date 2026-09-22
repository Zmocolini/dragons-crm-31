// Parser Wolt Gusty — raport agregat exportat de Gusty pentru Wolt.
//
// Structură coloane (0-based):
//   A: Courier Name | B: Task Fees | C: Manual Transactions | D: Bonus Cost | E: Tips |
//   F: (separator gol) | G: Compensation Deductions | H: Operational Fee Deduction |
//   I: Courier Activation Fee Deduction | J: Cash Offset | K: Courier ID
//
// Reguli utilizator (confirmate 2026-09-21):
//   • Brut = B + C + D + E (Task Fees + Manual + Bonus + Tips)
//   • Din brut se scad comisionul (pe brut) + taxa săptămânală de contract → net
//   • Din net se scad H + I + J (Operational Fee + Activation Fee + Cash Offset)
//   • H, I, J sunt stocate cu semn NEGATIV în raport (deduceri) — luăm |val|
//   • G (Compensation Deductions) e informativ, nu-l folosim la calcul

import * as XLSX from "xlsx";
import type { PlatformImportRow, PlatformParser } from "./types";

const COL = {
  name:            0,   // A
  taskFees:        1,   // B
  manualTx:        2,   // C
  bonusCost:       3,   // D
  tips:            4,   // E
  // 5: separator
  compensation:    6,   // G — informativ
  operationalFee:  7,   // H — deducere (stocat negativ)
  activationFee:   8,   // I — deducere (stocat negativ)
  cashOffset:      9,   // J — deducere (stocat negativ)
  courierId:      10,   // K
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
  if (!uid || uid.toLowerCase() === "courier id") return null;
  if (!fullName || fullName.toLowerCase() === "courier name") return null;

  const taskFees   = toNum(cells[COL.taskFees]);
  const manualTx   = toNum(cells[COL.manualTx]);
  const bonusCost  = toNum(cells[COL.bonusCost]);
  const tips       = toNum(cells[COL.tips]);
  const opFee      = toNum(cells[COL.operationalFee]);
  const activation = toNum(cells[COL.activationFee]);
  const cashOffset = toNum(cells[COL.cashOffset]);

  // Brut (fără tips) = B + C + D. Tips (E) merge separat în tipsRon → gross = brut + tips = B+C+D+E.
  const brut = Math.round((taskFees + manualTx + bonusCost) * 100) / 100;
  // Deduceri: |H| + |I| + |J| — valorile din raport sunt negative, luăm absolut.
  const deductions = Math.round(
    (Math.abs(opFee) + Math.abs(activation) + Math.abs(cashOffset)) * 100,
  ) / 100;

  const { firstName, lastName } = splitName(fullName);

  return {
    platform: "wolt",
    uid,
    firstName,
    lastName,
    fullName,
    phone: null,
    email: null,
    city:  null,
    ordersCount: 0,
    brutRon: brut,
    tipsRon: tips,
    negativeBalanceRon: deductions,
    raw: {
      taskFees, manualTx, bonusCost, tips,
      operationalFee: opFee, activationFee: activation, cashOffset,
      compensation: toNum(cells[COL.compensation]),
    },
  };
}

function isHeaderRow(row: unknown[]): boolean {
  const joined = row.map((c) => String(c ?? "").toLowerCase()).join("|");
  return joined.includes("courier name") || joined.includes("task fees");
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

export const woltGustyParser: PlatformParser = {
  key: "wolt_gusty",
  platform: "wolt",
  group: "gusty",
  label: "Gusty · Wolt",
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
    return joined.includes("task fees") && joined.includes("operational fee deduction");
  },
};
