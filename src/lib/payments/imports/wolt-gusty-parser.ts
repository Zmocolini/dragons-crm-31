// Parser Wolt Gusty — raport agregat exportat de Gusty pentru Wolt.
//
// Structură coloane standard (0-based):
//   A: Courier Name | B: Task Fees | C: Manual Transactions | D: Bonus Cost | E: Tips |
//   F: (separator gol) | G: Compensation Deductions | H: Operational Fee Deduction |
//   I: Courier Activation Fee Deduction | J: Cash Offset | K: Courier ID
//
// Reguli utilizator (confirmate 2026-09-21 & actualizate 2026-10-01):
//   • Brut = B + C + D (Task Fees + Manual + Bonus)
//   • Tips = E (Tips / Bacșiș)
//   • Gross = Brut + Tips
//   • Deduceri / Balanță negativă = G + H + I + J:
//     - G: Compensation Deductions (compensări / penalizări Wolt)
//     - H: Operational Fee Deduction (taxă operațională)
//     - I: Courier Activation Fee Deduction (taxă activare curier)
//     - J: Cash Offset (cash încasat / reținut)
//     Valorile sunt stocate cu semn negativ în raport — luăm valoarea absolută |val|.
//   • Net = Gross - comision - taxă contract - deduceri (calculat în computeImportRowMath)

import * as XLSX from "xlsx";
import type { PlatformImportRow, PlatformParser } from "./types";

interface ColMap {
  name: number;
  taskFees: number;
  manualTx: number;
  bonusCost: number;
  tips: number;
  compensation: number;
  operationalFee: number;
  activationFee: number;
  cashOffset: number;
  courierId: number;
}

const DEFAULT_COL: ColMap = {
  name:            0,   // A: Courier Name
  taskFees:        1,   // B: Task Fees
  manualTx:        2,   // C: Manual Transactions
  bonusCost:       3,   // D: Bonus Cost
  tips:            4,   // E: Tips
  // 5: separator gol
  compensation:    6,   // G: Compensation Deductions (deducere / balanță negativă)
  operationalFee:  7,   // H: Operational Fee Deduction (deducere / balanță negativă)
  activationFee:   8,   // I: Courier Activation Fee Deduction (deducere / balanță negativă)
  cashOffset:      9,   // J: Cash Offset (deducere / balanță negativă)
  courierId:      10,   // K: Courier ID
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
    name: findCol((h) => h === "courier name" || h.includes("courier name") || h === "nume" || h.startsWith("nume "), DEFAULT_COL.name),
    taskFees: findCol((h) => h.includes("task fees") || h.includes("task fee") || h.includes("venit"), DEFAULT_COL.taskFees),
    manualTx: findCol((h) => h.includes("manual") || h.includes("tranzactii"), DEFAULT_COL.manualTx),
    bonusCost: findCol((h) => h.includes("bonus"), DEFAULT_COL.bonusCost),
    tips: findCol((h) => h.includes("tips") || h.includes("bacsis"), DEFAULT_COL.tips),
    compensation: findCol((h) => h.includes("compensation") || h.includes("compensare"), DEFAULT_COL.compensation),
    operationalFee: findCol((h) => h.includes("operational fee") || h.includes("taxa operationala"), DEFAULT_COL.operationalFee),
    activationFee: findCol((h) => h.includes("activation fee") || h.includes("taxa activare"), DEFAULT_COL.activationFee),
    cashOffset: findCol((h) => h.includes("cash offset") || h.includes("cash"), DEFAULT_COL.cashOffset),
    courierId: findCol((h) => h.includes("courier id") || h.includes("id curier") || h === "id" || h === "uid", DEFAULT_COL.courierId),
  };
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

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function buildRow(cells: unknown[], colMap: ColMap): PlatformImportRow | null {
  const fullName = toStr(cells[colMap.name]);
  if (!fullName || fullName.toLowerCase() === "courier name" || fullName.toLowerCase() === "nume") return null;

  const rawUid = toStr(cells[colMap.courierId]);
  const uid = (rawUid && rawUid.toLowerCase() !== "courier id" && rawUid.toLowerCase() !== "id")
    ? rawUid
    : `wolt_${normalizeName(fullName).replace(/\s+/g, "_")}`;

  const taskFees     = toNum(cells[colMap.taskFees]);
  const manualTx     = toNum(cells[colMap.manualTx]);
  const bonusCost    = toNum(cells[colMap.bonusCost]);
  const tips         = toNum(cells[colMap.tips]);
  const compensation = toNum(cells[colMap.compensation]);
  const opFee        = toNum(cells[colMap.operationalFee]);
  const activation   = toNum(cells[colMap.activationFee]);
  const cashOffset   = toNum(cells[colMap.cashOffset]);

  // Brut (fără tips) = B + C + D. Tips (E) merge separat în tipsRon → gross = brut + tips = B+C+D+E.
  const brut = Math.round((taskFees + manualTx + bonusCost) * 100) / 100;

  // Deduceri / Balanță negativă:
  // Coloana G (Compensation Deductions) + Coloana H (Operational Fee) + Coloana I (Activation Fee) + Coloana J (Cash Offset)
  // Valorile din raport sunt negative (ex: -112.75, -27.41, -259.86), deci luăm |val|.
  const deductions = Math.round(
    (Math.abs(compensation) + Math.abs(opFee) + Math.abs(activation) + Math.abs(cashOffset)) * 100,
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
      compensation,
      operationalFee: opFee, activationFee: activation, cashOffset,
    },
  };
}

function isHeaderRow(row: unknown[]): boolean {
  if (!Array.isArray(row)) return false;
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
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
      const checkRows = rows.slice(0, 5);
      for (const r of checkRows) {
        if (!Array.isArray(r)) continue;
        const joined = r.map((c) => String(c ?? "").toLowerCase()).join("|");
        if (
          (joined.includes("task fees") || joined.includes("task fee")) &&
          (joined.includes("operational fee") || joined.includes("compensation") || joined.includes("cash offset"))
        ) {
          return true;
        }
      }
    }
    return false;
  },
};
