// Parser Bolt Gusty — raport agregat exportat de Gusty (fleet management aggregator).
// Formatul standard (tab-separated / XLSX):
//
//   A: Row Number | B: Courier UID | C: First Name | D: Last Name | E: Phone | F: City |
//   G: Adjusted Earnings with Courier Tips (Without VAT) | H: Courier Tips (Without VAT) |
//   I: Overdue courier cash debt (BALANȚA NEGATIVĂ) | J: Balance After Period (nefolosit)
//
// Reguli utilizator (confirmate 2026-09-18):
//   • Brut fără tips = G − H
//   • Total pentru comision = Brut + H = G
//   • Comision % aplicat pe G
//   • Se scade taxa contract săptămânală
//   • Se scade balanța negativă din col I (Overdue cash debt — datorie curier)
//   • Col J (Balance After Period) e informativă, NU se folosește la calcul

import * as XLSX from "xlsx";
import type { PlatformImportRow, PlatformParser } from "./types";

// Indexi așteptați (0-based) — potrivesc structura din header-ul standard.
const COL = {
  rowNumber: 0,
  uid:       1,
  firstName: 2,
  lastName:  3,
  phone:     4,
  city:      5,
  earnings:  6,  // G — Adjusted Earnings WITH tips
  tips:      7,  // H — Courier Tips
  negBalance:8,  // I — Overdue cash debt (BALANȚA NEGATIVĂ ← se scade din net)
  afterPeriod:9, // J — Balance After Period (informativ, nu-l folosim)
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

function buildRow(cells: unknown[]): PlatformImportRow | null {
  const uid = toStr(cells[COL.uid]);
  if (!uid || uid.toLowerCase() === "courier uid") return null;
  const firstName = toStr(cells[COL.firstName]);
  const lastName  = toStr(cells[COL.lastName]);
  const earnings  = toNum(cells[COL.earnings]);        // G
  const tips      = toNum(cells[COL.tips]);            // H
  const cashDebt  = toNum(cells[COL.negBalance]);      // I — Overdue cash debt (balanța negativă)

  // brut real (fără tips) = G − H
  const brut = Math.round((earnings - tips) * 100) / 100;
  // Datoria e stocată pozitiv în raportul Bolt. Dacă apare cu semn negativ (formatting quirks),
  // luăm |val| pentru siguranță — sensul e „cât datorează curierul".
  const negativeBalanceRon = Math.round(Math.abs(cashDebt) * 100) / 100;

  return {
    platform: "bolt",
    uid,
    firstName,
    lastName,
    fullName:            `${firstName} ${lastName}`.trim(),
    phone:               toStr(cells[COL.phone]) || null,
    email:               null,
    city:                toStr(cells[COL.city])  || null,
    ordersCount:         0,
    brutRon:             brut,
    tipsRon:             tips,
    negativeBalanceRon,
    raw: {
      earnings, tips, cashDebt,
      balanceAfterPeriod: toNum(cells[COL.afterPeriod]),
    },
  };
}

/** Parsează text lipit (TSV din Excel/clipboard). */
function parseText(text: string): PlatformImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  // Detectează separatorul (tab standard din Excel copy, fallback ; sau ,)
  const sep = lines[0].includes("\t") ? "\t"
            : lines[0].includes(";")  ? ";"
            : ",";
  const rows: unknown[][] = lines.map((l) => l.split(sep));
  // Sar peste header dacă primul token e „Row Number" sau ceva similar
  const first = String(rows[0][0] ?? "").toLowerCase();
  const dataRows = /row\s*number|courier\s*uid|^#$/.test(first) ? rows.slice(1) : rows;
  const out: PlatformImportRow[] = [];
  for (const r of dataRows) {
    const row = buildRow(r);
    if (row) out.push(row);
  }
  return out;
}

/** Parsează XLSX Gusty (același format, dar din fișier). */
function parseXlsx(buf: ArrayBuffer): PlatformImportRow[] {
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const out: PlatformImportRow[] = [];
  // Ignor primul rând dacă e header
  const first = String(rows[0]?.[0] ?? "").toLowerCase();
  const dataRows = /row\s*number|courier\s*uid|^#$/.test(first) ? rows.slice(1) : rows;
  for (const r of dataRows) {
    const row = buildRow(r);
    if (row) out.push(row);
  }
  return out;
}

export const boltGustyParser: PlatformParser = {
  key: "bolt_gusty",
  platform: "bolt",
  group: "gusty",
  label: "Gusty · Bolt",
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
    return joined.includes("adjusted earnings with courier tips") || joined.includes("balance after period");
  },
};
