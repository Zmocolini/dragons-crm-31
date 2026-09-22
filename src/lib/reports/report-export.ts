import type { FactsBundle } from "./facts";
import {
  cityAggregation, computeKpi, courierAggregation, financialByPlatform,
  formatPeriodRange, revenueSeries, totalsOf, filterFacts,
  REPORT_TYPE_LABEL,
  type ReportFilterState,
} from "./analytics";
import { PLATFORM_LABEL } from "./facts";
import { COURIER_STATUS_LABEL } from "@/lib/couriers/types";
import { PAY_STATE_LABEL } from "./facts";
import { buildXlsx, downloadBlob, type XlsxSheet } from "./xlsx";

// Construiește numele cerut: Dragon-Delivery-Raport-01-09-2026-07-09-2026.xlsx
function dmy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
export function reportFileBase(fleetName: string, f: ReportFilterState): string {
  const slug = fleetName.replace(/\s+/g, "-");
  return `${slug}-Raport-${dmy(f.fromIso)}-${dmy(f.toIso)}`;
}

type ExportMeta = { fleetName: string; generatedBy: string; generatedAtLabel: string };

function metaRows(f: ReportFilterState, meta: ExportMeta): (string | number)[][] {
  const kpi = null;
  void kpi;
  return [
    ["Dragon Delivery — Raport"],
    ["Flotă", meta.fleetName],
    ["Perioadă", formatPeriodRange(f.fromIso, f.toIso)],
    ["Tip raport", REPORT_TYPE_LABEL[f.reportType]],
    ["Platforme", f.platforms.length ? f.platforms.map((p) => PLATFORM_LABEL[p]).join(", ") : "Toate"],
    ["Orașe", f.cities.length ? f.cities.join(", ") : "Toate"],
    ["Status curieri", f.courierStatus === "all" ? "Toate" : COURIER_STATUS_LABEL[f.courierStatus]],
    ["Generat de", meta.generatedBy],
    ["Generat la", meta.generatedAtLabel],
    [],
  ];
}

export function buildReportSheets(bundle: FactsBundle, f: ReportFilterState, meta: ExportMeta): XlsxSheet[] {
  const kpi = computeKpi(bundle, f);
  const totals = totalsOf(filterFacts(bundle, f));
  const fin = financialByPlatform(bundle, f);
  const cities = cityAggregation(bundle, f);
  const couriers = courierAggregation(bundle, f);
  const series = revenueSeries(bundle, f);

  // Sheet 1: Sumar
  const summary: (string | number)[][] = [
    ...metaRows(f, meta),
    ["Indicator", "Valoare", "Δ vs perioada anterioară"],
    ["Venit brut total (RON)", Math.round(kpi.grossTotal), `${kpi.grossDelta}%`],
    ["Comisioane (RON)", Math.round(kpi.commissions), `${kpi.commissionPct}% din brut`],
    ["Deduceri (RON)", Math.round(totals.deductions), ""],
    ["Curieri activi", kpi.activeCouriers, `din ${kpi.rosterCouriers} total`],
    ["Total comenzi", kpi.totalOrders, `medie ${kpi.ordersPerCourier}/curier`],
    ["Plăți efectuate (RON)", Math.round(kpi.paymentsMade), `${kpi.paymentsPct}% din brut`],
  ];

  // Sheet 2: Situație financiară pe platformă
  const financial: (string | number)[][] = [
    ["Situație financiară detaliată"],
    ["Platformă", "Comenzi", "Venit brut", "Comisioane", "Deduceri", "Plăți efectuate", "De plătit"],
    ...fin.rows.map((r) => [r.label, r.orders, Math.round(r.gross), Math.round(r.commission), Math.round(r.deductions), Math.round(r.paid), Math.round(r.toPay)]),
    ["TOTAL", fin.total.orders, Math.round(fin.total.gross), Math.round(fin.total.commission), Math.round(fin.total.deductions), Math.round(fin.total.paid), Math.round(fin.total.toPay)],
  ];

  // Sheet 3: Performanță curieri
  const courierRows: (string | number)[][] = [
    ["Performanță curieri"],
    ["#", "Nume", "Oraș", "Platformă", "Subcontractor", "Comenzi", "Venit brut", "Comision", "Deduceri", "De încasat", "Status", "Status plată", "Scor"],
    ...couriers.map((c, i) => [
      i + 1, c.name, c.city, PLATFORM_LABEL[c.platform], c.subcontractorName ?? "—",
      c.orders, Math.round(c.gross), Math.round(c.commission), Math.round(c.deductions), Math.round(c.net),
      COURIER_STATUS_LABEL[c.status], PAY_STATE_LABEL[c.payState], c.performanceScore,
    ]),
  ];

  // Sheet 4: Top orașe
  const cityRows: (string | number)[][] = [
    ["Performanță orașe"],
    ["Oraș", "Curieri activi", "Comenzi", "Venit brut", "Comisioane", "Venit/curier", "Comenzi/curier"],
    ...cities.map((c) => [c.city, c.activeCouriers, c.orders, Math.round(c.gross), Math.round(c.commission), c.avgRevenuePerCourier, c.ordersPerCourier]),
  ];

  // Sheet 5: Evoluție zilnică
  const seriesRows: (string | number)[][] = [
    ["Evoluția veniturilor"],
    ["Data", "Venit brut", "Comisioane", "Plăți efectuate"],
    ...series.map((p) => [p.dateIso, p.gross, p.commission, p.paid]),
  ];

  return [
    { name: "Sumar", rows: summary },
    { name: "Situație financiară", rows: financial },
    { name: "Performanță curieri", rows: courierRows },
    { name: "Performanță orașe", rows: cityRows },
    { name: "Evoluție zilnică", rows: seriesRows },
  ];
}

export function exportReportXlsx(bundle: FactsBundle, f: ReportFilterState, meta: ExportMeta): void {
  const sheets = buildReportSheets(bundle, f, meta);
  const blob = buildXlsx(sheets);
  downloadBlob(blob, `${reportFileBase(meta.fleetName, f)}.xlsx`);
}

// ── PDF (print window) ───────────────────────────────────────────────────────
export function exportReportPdf(bundle: FactsBundle, f: ReportFilterState, meta: ExportMeta): void {
  const kpi = computeKpi(bundle, f);
  const fin = financialByPlatform(bundle, f);
  const esc = (s: string | number) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
  const ron = (n: number) => `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(Math.round(n))} RON`;
  const rowsHtml = fin.rows
    .map((r) => `<tr><td>${esc(r.label)}</td><td class="r">${r.orders}</td><td class="r">${ron(r.gross)}</td><td class="r">${ron(r.commission)}</td><td class="r">${ron(r.deductions)}</td><td class="r">${ron(r.paid)}</td><td class="r">${ron(r.toPay)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${esc(reportFileBase(meta.fleetName, f))}</title>
<style>*{box-sizing:border-box;font-family:Arial,sans-serif}body{margin:0;padding:28px;color:#0f172a}
.brand{font-size:20px;font-weight:800;color:#4f46e5}.muted{color:#64748b;font-size:12px}
h1{font-size:17px;margin:14px 0 4px}.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;min-width:130px}.kpi b{display:block;font-size:15px}
.kpi span{color:#64748b;font-size:10px}table{width:100%;border-collapse:collapse;margin-top:8px}
td,th{padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:left}th{background:#f1f5f9}
.r{text-align:right;font-variant-numeric:tabular-nums}tfoot td{font-weight:800;border-top:2px solid #0f172a}
@media print{body{padding:0}}</style></head><body>
<div class="brand">Dragon Delivery</div><div class="muted">Raport · Flotă ${esc(meta.fleetName)} · ${esc(formatPeriodRange(f.fromIso, f.toIso))}</div>
<h1>${esc(REPORT_TYPE_LABEL[f.reportType])}</h1>
<div class="kpis">
  <div class="kpi"><b>${ron(kpi.grossTotal)}</b><span>Venit brut</span></div>
  <div class="kpi"><b>${ron(kpi.commissions)}</b><span>Comisioane</span></div>
  <div class="kpi"><b>${kpi.activeCouriers}</b><span>Curieri activi</span></div>
  <div class="kpi"><b>${kpi.totalOrders}</b><span>Comenzi</span></div>
  <div class="kpi"><b>${ron(kpi.paymentsMade)}</b><span>Plăți efectuate</span></div>
</div>
<table><thead><tr><th>Platformă</th><th class="r">Comenzi</th><th class="r">Venit brut</th><th class="r">Comisioane</th><th class="r">Deduceri</th><th class="r">Plăți</th><th class="r">De plătit</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td>TOTAL</td><td class="r">${fin.total.orders}</td><td class="r">${ron(fin.total.gross)}</td><td class="r">${ron(fin.total.commission)}</td><td class="r">${ron(fin.total.deductions)}</td><td class="r">${ron(fin.total.paid)}</td><td class="r">${ron(fin.total.toPay)}</td></tr></tfoot></table>
<p class="muted" style="margin-top:16px">Generat de ${esc(meta.generatedBy)} · ${esc(meta.generatedAtLabel)}</p>
</body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) throw new Error("Popup blocat — permite ferestrele pop-up pentru export PDF.");
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 250);
}

// ── CSV (situație financiară) ────────────────────────────────────────────────
const CSV_SEP = ";";
function csvCell(v: string | number): string {
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function exportReportCsv(bundle: FactsBundle, f: ReportFilterState, meta: ExportMeta): void {
  const fin = financialByPlatform(bundle, f);
  const lines: string[] = [];
  lines.push(["Dragon Delivery — Raport"].join(CSV_SEP));
  lines.push(["Flotă", meta.fleetName].map(csvCell).join(CSV_SEP));
  lines.push(["Perioadă", formatPeriodRange(f.fromIso, f.toIso)].map(csvCell).join(CSV_SEP));
  lines.push("");
  lines.push(["Platformă", "Comenzi", "Venit brut", "Comisioane", "Deduceri", "Plăți efectuate", "De plătit"].join(CSV_SEP));
  for (const r of fin.rows) {
    lines.push([r.label, r.orders, Math.round(r.gross), Math.round(r.commission), Math.round(r.deductions), Math.round(r.paid), Math.round(r.toPay)].map(csvCell).join(CSV_SEP));
  }
  lines.push(["TOTAL", fin.total.orders, Math.round(fin.total.gross), Math.round(fin.total.commission), Math.round(fin.total.deductions), Math.round(fin.total.paid), Math.round(fin.total.toPay)].map(csvCell).join(CSV_SEP));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${reportFileBase(meta.fleetName, f)}.csv`);
}
