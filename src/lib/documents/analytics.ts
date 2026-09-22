import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { PlatformKey } from "@/lib/dashboard/types";
import type { Nationality } from "@/lib/candidates/types";
import type { CrmDocument } from "./types";
import {
  DOC_COLUMNS, buildCourierRow, requirementFor,
  type CourierDocRow, type CourierDocStatus, type DocColumnKey,
} from "./rules";

// Agregări pure pentru pagina Documente. TODO(real-users): server-side aggregation
// (COUNT/GROUP BY) filtrată pe tenantId; aici derivăm din roster + documente.

export type DocStatusTab = "all" | "missing" | "expiring" | "in_review" | "complete";

export type DocFilterState = {
  search: string;
  platforms: PlatformKey[];
  cities: string[];
  nationalities: Nationality[];
  status: CourierDocStatus | "all";
  tab: DocStatusTab;
  // avansate
  docColumn: DocColumnKey | "all";
  subcontractor: string | "all";
  onlyActive: boolean;
};

export const EMPTY_DOC_FILTERS: DocFilterState = {
  search: "", platforms: [], cities: [], nationalities: [],
  status: "all", tab: "all", docColumn: "all", subcontractor: "all", onlyActive: false,
};

// ── Construcție rânduri (curier × documentele lui) ───────────────────────────
export function buildRows(couriers: CourierRow[], docs: CrmDocument[]): CourierDocRow[] {
  const bySubject = new Map<string, CrmDocument[]>();
  for (const d of docs) {
    const arr = bySubject.get(d.subject.id) ?? [];
    arr.push(d);
    bySubject.set(d.subject.id, arr);
  }
  return couriers.map((c) => buildCourierRow(c, bySubject.get(c.id) ?? []));
}

// ── KPI ──────────────────────────────────────────────────────────────────────
export type DocKpi = {
  total: number;
  complete: number;
  completePct: number;
  inReview: number;
  inReviewPct: number;
  missing: number;
  missingPct: number;
  expiringSoon: number;
};

export function computeKpi(rows: CourierDocRow[]): DocKpi {
  const total = rows.length;
  let complete = 0, inReview = 0, missing = 0, expiringSoon = 0;
  for (const r of rows) {
    if (r.status === "complete") complete++;
    if (r.status === "pending_review") inReview++;
    if (r.status === "missing" || r.status === "expired") missing++;
    if (Object.values(r.cells).some((c) => c.state === "expiring_soon")) expiringSoon++;
  }
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return { total, complete, completePct: pct(complete), inReview, inReviewPct: pct(inReview), missing, missingPct: pct(missing), expiringSoon };
}

// ── Tab counts ───────────────────────────────────────────────────────────────
export function tabMatches(tab: DocStatusTab, row: CourierDocRow): boolean {
  switch (tab) {
    case "all": return true;
    case "missing": return row.status === "missing" || row.status === "expired";
    case "expiring": return Object.values(row.cells).some((c) => c.state === "expiring_soon");
    case "in_review": return row.status === "pending_review";
    case "complete": return row.status === "complete";
  }
}

export function tabCounts(rows: CourierDocRow[]): Record<DocStatusTab, number> {
  return {
    all: rows.length,
    missing: rows.filter((r) => tabMatches("missing", r)).length,
    expiring: rows.filter((r) => tabMatches("expiring", r)).length,
    in_review: rows.filter((r) => tabMatches("in_review", r)).length,
    complete: rows.filter((r) => tabMatches("complete", r)).length,
  };
}

// ── Filtrare ─────────────────────────────────────────────────────────────────
export function filterRows(rows: CourierDocRow[], f: DocFilterState): CourierDocRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    const c = r.courier;
    if (q) {
      const hay = `${c.fullName} ${c.phone} ${c.email ?? ""} ${c.id} ${c.city}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.platforms.length && !c.platforms.some((p) => f.platforms.includes(p))) return false;
    if (f.cities.length && !f.cities.includes(c.city)) return false;
    if (f.nationalities.length && !f.nationalities.includes(c.nationality)) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.subcontractor !== "all" && (c.subcontractorName ?? "") !== f.subcontractor) return false;
    if (f.onlyActive && c.status !== "active") return false;
    if (f.docColumn !== "all") {
      // păstrează doar curierii pentru care coloana e relevantă (nu N/A)
      if (r.cells[f.docColumn].requirement === "not_applicable") return false;
    }
    if (!tabMatches(f.tab, r)) return false;
    return true;
  });
}

// ── Progres pe categorie de document ─────────────────────────────────────────
export type ColumnProgress = { key: DocColumnKey; label: string; present: number; total: number; pct: number };

export function progressByColumn(rows: CourierDocRow[]): ColumnProgress[] {
  return DOC_COLUMNS.map((col) => {
    let present = 0, total = 0;
    for (const r of rows) {
      const req = requirementFor(r.courier, col.key);
      if (req === "not_applicable") continue;
      total++;
      const cell = r.cells[col.key];
      if (cell.doc && cell.state !== "missing") present++;
    }
    return { key: col.key, label: col.label, present, total, pct: total > 0 ? Math.round((present / total) * 100) : 0 };
  });
}
