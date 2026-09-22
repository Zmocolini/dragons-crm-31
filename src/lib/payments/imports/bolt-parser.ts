// Parser Bolt TTG — extracție din raportul XLSX oficial Bolt (sheet "Date").
// „TTG" e denumirea internă a raportului de curieri Bolt (Total Trip Generation).

import * as XLSX from "xlsx";
import type { PlatformImportRow, PlatformParser } from "./types";

// Excel column letter → index (0-based). A=0, Z=25, AA=26, DH=111.
function colLetterToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const COL = {
  orders:      colLetterToIndex("CH"),
  uid:         colLetterToIndex("CI"),
  firstName:   colLetterToIndex("CJ"),
  lastName:    colLetterToIndex("CK"),
  phone:       colLetterToIndex("CL"),
  email:       colLetterToIndex("CM"),
  city:        colLetterToIndex("CO"),
  brut:        colLetterToIndex("CX"),
  tips:        colLetterToIndex("DB"),
  negBalance:  colLetterToIndex("DE"),
};

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") { const n = Number(v.replace(",", ".")); return isFinite(n) ? n : 0; }
  return 0;
}
function toStr(v: unknown): string { return v == null ? "" : String(v).trim(); }

export const boltTtgParser: PlatformParser = {
  key: "bolt_ttg",
  platform: "bolt",
  group: "ttg",
  label: "Raport Bolt TTG",
  status: "ready",

  detect: (wb: unknown) => {
    const workbook = wb as XLSX.WorkBook;
    if (!workbook.SheetNames?.length) return false;
    // Semnătură puternică Bolt TTG: sheet "Date" cu 100+ coloane și „ID extern Bolt" în header
    const sheetName = workbook.SheetNames.find((n) => n.toLowerCase() === "date");
    if (!sheetName) return false;
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return false;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    const header = rows[0] ?? [];
    if (header.length < 80) return false;
    const joined = header.map((c) => String(c ?? "").toLowerCase()).join("|");
    return joined.includes("id extern bolt") || joined.includes("livrator");
  },

  parse: (buf: ArrayBuffer): PlatformImportRow[] => {
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === "date") ?? wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const out: PlatformImportRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const uid = toStr(r[COL.uid]);
      if (!uid) continue;
      const firstName = toStr(r[COL.firstName]);
      const lastName  = toStr(r[COL.lastName]);
      out.push({
        platform: "bolt",
        uid,
        firstName,
        lastName,
        fullName:            `${firstName} ${lastName}`.trim(),
        phone:               toStr(r[COL.phone])  || null,
        email:               toStr(r[COL.email])  || null,
        city:                toStr(r[COL.city])   || null,
        ordersCount:         toNum(r[COL.orders]),
        brutRon:             toNum(r[COL.brut]),
        tipsRon:             toNum(r[COL.tips]),
        negativeBalanceRon:  toNum(r[COL.negBalance]),
      });
    }
    return out;
  },
};
