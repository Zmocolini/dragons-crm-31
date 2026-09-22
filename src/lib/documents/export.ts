import { NATIONALITY_LABEL } from "@/lib/candidates/types";
import { buildXlsx, downloadBlob, type XlsxSheet } from "@/lib/reports/xlsx";
import { CELL_STATE_LABEL, COURIER_DOC_STATUS_LABEL, DOC_COLUMNS, type CourierDocRow } from "./rules";

function countStates(row: CourierDocRow) {
  const cells = Object.values(row.cells);
  return {
    missing: cells.filter((c) => c.state === "missing").length,
    expired: cells.filter((c) => c.state === "expired").length,
    expiring: cells.filter((c) => c.state === "expiring_soon").length,
  };
}

const HEADER = [
  "Curier", "Telefon", "Oraș", "Naționalitate", "Platforme",
  "CI/Pașaport", "CNP", "Permis ședere", "Contract", "IBAN", "Selfie", "Altele",
  "Status general", "Documente lipsă", "Documente expirate", "Expiră curând",
];

function rowToArray(row: CourierDocRow): (string | number)[] {
  const c = row.courier;
  const cnt = countStates(row);
  const cell = (k: (typeof DOC_COLUMNS)[number]["key"]) => CELL_STATE_LABEL[row.cells[k].state];
  return [
    c.fullName, c.phone, c.city, NATIONALITY_LABEL[c.nationality], c.platforms.join(", "),
    cell("identity"), cell("cnp"), cell("residence"), cell("contract"), cell("banking"), cell("selfie"), cell("other"),
    COURIER_DOC_STATUS_LABEL[row.status], cnt.missing, cnt.expired, cnt.expiring,
  ];
}

export function buildDocSheets(rows: CourierDocRow[], fleetName: string): XlsxSheet[] {
  const data: (string | number)[][] = [
    ["Dragon Delivery — Raport documente"],
    ["Flotă", fleetName],
    ["Curieri", rows.length],
    [],
    HEADER,
    ...rows.map(rowToArray),
  ];
  return [{ name: "Documente", rows: data }];
}

export function exportDocsXlsx(rows: CourierDocRow[], fleetName: string): void {
  const blob = buildXlsx(buildDocSheets(rows, fleetName));
  downloadBlob(blob, `${fleetName.replace(/\s+/g, "-")}-Documente.xlsx`);
}

const SEP = ";";
function csvCell(v: string | number): string {
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function exportDocsCsv(rows: CourierDocRow[], fleetName: string): void {
  const lines = [HEADER.join(SEP), ...rows.map((r) => rowToArray(r).map(csvCell).join(SEP))];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${fleetName.replace(/\s+/g, "-")}-Documente.csv`);
}
