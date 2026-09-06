import type { ReportFormat, ReportPreviewRow, ReportPreviewStats } from "./types";
import { REPORT_TYPE_LABEL, type ReportType } from "./types";

// TODO(real-users): server actions cu streaming + XLSX real (SheetJS/exceljs) +
// PDF via headless Chromium sau puppeteer.
// Momentan generăm client-side: CSV real, XLS via HTML table (Excel îl deschide nativ),
// PDF via fereastră nouă cu print dialog.

const CSV_SEP = ";";
const CSV_EOL = "\r\n";

function escapeCsv(v: string): string {
  if (v.includes(CSV_SEP) || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function rowsToCsv(rows: ReportPreviewRow[]): string {
  const header = ["Nume", "Oraș", "Platformă", "Status", "Valoare"];
  const lines = [header.map(escapeCsv).join(CSV_SEP)];
  for (const r of rows) {
    lines.push([
      escapeCsv(r.name),
      escapeCsv(r.city ?? ""),
      escapeCsv(r.platform ?? ""),
      escapeCsv(r.status),
      escapeCsv(r.value),
    ].join(CSV_SEP));
  }
  return "﻿" + lines.join(CSV_EOL); // BOM UTF-8 pentru Excel ro-RO
}

function rowsToHtmlTable(
  rows: ReportPreviewRow[],
  stats: ReportPreviewStats,
  type: ReportType,
  meta: { fleetName: string; period: string; generatedBy: string; generatedAtIso: string },
): string {
  const tr = rows
    .map((r) => `<tr><td>${r.name}</td><td>${r.city ?? ""}</td><td>${r.platform ?? ""}</td><td>${r.status}</td><td>${r.value}</td></tr>`)
    .join("");
  return `<html><head><meta charset="utf-8" /><title>Raport ${REPORT_TYPE_LABEL[type]}</title>
<style>
  body { font-family: Segoe UI, Arial, sans-serif; color: #111; }
  h1 { margin: 0 0 4px; }
  .sub { color: #555; font-size: 12px; margin-bottom: 16px; }
  .stats { display: flex; gap: 16px; margin: 16px 0; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 10px 14px; }
  .stat b { display: block; font-size: 18px; }
  .stat span { color: #666; font-size: 11px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; text-align: left; }
  th { background: #f2f2f2; }
  tfoot td { color: #666; font-size: 10px; border: 0; padding-top: 12px; }
</style></head><body>
<h1>Raport ${REPORT_TYPE_LABEL[type]}</h1>
<div class="sub">Flotă: <b>${meta.fleetName}</b> · Perioadă: <b>${meta.period}</b></div>
<div class="stats">
  <div class="stat"><b>${stats.activeCouriers}</b><span>Curieri activi</span></div>
  <div class="stat"><b>${stats.completedActivations}</b><span>Activări finalizate</span></div>
  <div class="stat"><b>${stats.missingDocuments}</b><span>Documente lipsă</span></div>
  <div class="stat"><b>${new Intl.NumberFormat("ro-RO").format(stats.totalRevenueRon)} RON</b><span>Total raportat</span></div>
</div>
<table>
  <thead><tr><th>Nume</th><th>Oraș</th><th>Platformă</th><th>Status</th><th>Valoare</th></tr></thead>
  <tbody>${tr || `<tr><td colspan="5" style="text-align:center;color:#999">Niciun rezultat pentru filtrele selectate.</td></tr>`}</tbody>
  <tfoot><tr><td colspan="5">Generat de ${meta.generatedBy} · ${new Date(meta.generatedAtIso).toLocaleString("ro-RO")}</td></tr></tfoot>
</table>
</body></html>`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export function exportReport(
  format: ReportFormat,
  type: ReportType,
  rows: ReportPreviewRow[],
  stats: ReportPreviewStats,
  meta: { fleetName: string; period: string; generatedBy: string; generatedAtIso: string },
): void {
  const baseName = `Raport_${REPORT_TYPE_LABEL[type]}_${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    triggerDownload(
      new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" }),
      `${baseName}.csv`,
    );
    return;
  }

  if (format === "excel") {
    const html = rowsToHtmlTable(rows, stats, type, meta);
    triggerDownload(
      new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
      `${baseName}.xls`,
    );
    return;
  }

  if (format === "pdf") {
    const html = rowsToHtmlTable(rows, stats, type, meta);
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!w) throw new Error("Popup blocat — permite ferestrele pop-up pentru export PDF.");
    w.document.write(html);
    w.document.close();
    // Delay ca să se aplice CSS-ul înainte de print
    setTimeout(() => {
      try { w.focus(); w.print(); } catch {}
    }, 200);
    return;
  }
}
