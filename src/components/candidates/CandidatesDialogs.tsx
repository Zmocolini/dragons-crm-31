"use client";

import {
  AlertTriangle, ArrowRight, CheckCircle2, Download, FileSpreadsheet,
  FileText, Filter, Info, Upload, UserCheck, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import type { Candidate } from "@/lib/candidates/types";
import { cn } from "@/lib/utils/cn";

// ── Advanced Filters ──────────────────────────────────────────────────────
export type AdvancedFilters = {
  responsible: string;   // "all" | responsible name
  dateFrom: string;      // ISO date or ""
  dateTo: string;
  minScore: number;      // 0-100
  priority: "all" | "high" | "medium" | "low";
  hasMissingDocs: boolean;
  hasInterview: boolean;
};

export const EMPTY_ADVANCED: AdvancedFilters = {
  responsible: "all",
  dateFrom: "",
  dateTo: "",
  minScore: 0,
  priority: "all",
  hasMissingDocs: false,
  hasInterview: false,
};

export function isAdvancedActive(f: AdvancedFilters): boolean {
  return (
    f.responsible !== "all" ||
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.minScore > 0 ||
    f.priority !== "all" ||
    f.hasMissingDocs ||
    f.hasInterview
  );
}

export function AdvancedFiltersDrawer({
  open, onClose, initial, onApply, responsibles,
}: {
  open: boolean;
  onClose: () => void;
  initial: AdvancedFilters;
  onApply: (f: AdvancedFilters) => void;
  responsibles: string[];
}) {
  const [f, setF] = useState<AdvancedFilters>(initial);
  useEffect(() => { if (open) setF(initial); }, [open, initial]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-violet-300" />
            <h2 className="text-[15px] font-bold text-fg">Filtre avansate</h2>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Închide"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="Responsabil">
            <select
              value={f.responsible}
              onChange={(e) => setF((p) => ({ ...p, responsible: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:outline-none"
            >
              <option value="all" className="bg-card">Toți responsabilii</option>
              {responsibles.map((r) => (
                <option key={r} value={r} className="bg-card">{r}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Interval — de la">
              <input
                type="date" value={f.dateFrom}
                onChange={(e) => setF((p) => ({ ...p, dateFrom: e.target.value }))}
                className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:outline-none"
              />
            </Field>
            <Field label="Interval — până la">
              <input
                type="date" value={f.dateTo}
                onChange={(e) => setF((p) => ({ ...p, dateTo: e.target.value }))}
                className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:outline-none"
              />
            </Field>
          </div>

          <Field label={`Scor lead minim (${f.minScore})`}>
            <input
              type="range" min={0} max={100} value={f.minScore}
              onChange={(e) => setF((p) => ({ ...p, minScore: Number(e.target.value) }))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10.5px] text-fg-dim">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </Field>

          <Field label="Prioritate">
            <select
              value={f.priority}
              onChange={(e) => setF((p) => ({ ...p, priority: e.target.value as AdvancedFilters["priority"] }))}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:outline-none"
            >
              <option value="all"    className="bg-card">Toate</option>
              <option value="high"   className="bg-card">Mare</option>
              <option value="medium" className="bg-card">Medie</option>
              <option value="low"    className="bg-card">Mică</option>
            </select>
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg">
            <input
              type="checkbox" checked={f.hasMissingDocs}
              onChange={(e) => setF((p) => ({ ...p, hasMissingDocs: e.target.checked }))}
              className="h-4 w-4 accent-violet-500"
            />
            Doar cu documente lipsă
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-fg">
            <input
              type="checkbox" checked={f.hasInterview}
              onChange={(e) => setF((p) => ({ ...p, hasInterview: e.target.checked }))}
              className="h-4 w-4 accent-violet-500"
            />
            Doar cu interviu programat
          </label>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line/60 bg-white/[0.02] px-5 py-4">
          <button
            type="button"
            onClick={() => setF(EMPTY_ADVANCED)}
            className="text-[12.5px] font-medium text-fg-dim hover:text-fg-muted"
          >
            Resetează
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Nume filtru salvat:", "Filtrul meu");
                if (name) {
                  try {
                    const raw = localStorage.getItem("crm31-candidate-saved-filters") || "{}";
                    const store = JSON.parse(raw);
                    store[name] = f;
                    localStorage.setItem("crm31-candidate-saved-filters", JSON.stringify(store));
                  } catch {}
                }
              }}
              className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]"
            >
              Salvează filtru
            </button>
            <button
              type="button"
              onClick={() => { onApply(f); onClose(); }}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white"
            >
              Aplică
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Convert to Courier ────────────────────────────────────────────────────
export function ConvertToCourierDialog({
  candidate, onCancel, onConfirm,
}: {
  candidate: Candidate | null;
  onCancel: () => void;
  onConfirm: (candidate: Candidate) => void;
}) {
  if (!candidate || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <UserCheck size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold text-fg">Convertește în curier</h3>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Vei crea un curier nou din datele candidatului. Candidatul rămâne în sistem, marcat „Convertit", și va fi legat de curierul creat prin <code>converted_courier_id</code>.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 rounded-lg border border-line/60 bg-white/[0.02] p-3 text-[12.5px]">
          <div className="flex justify-between"><span className="text-fg-dim">Nume</span><span className="font-semibold text-fg">{candidate.fullName}</span></div>
          <div className="flex justify-between"><span className="text-fg-dim">Telefon</span><span className="font-semibold text-fg">{candidate.phone}</span></div>
          <div className="flex justify-between"><span className="text-fg-dim">Email</span><span className="font-semibold text-fg">{candidate.email ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-fg-dim">Oraș</span><span className="font-semibold text-fg">{candidate.city}</span></div>
          <div className="flex justify-between"><span className="text-fg-dim">Platforme</span><span className="font-semibold text-fg">{candidate.desiredPlatforms.join(", ") || "—"}</span></div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2.5">
          <Info size={12} className="mt-0.5 shrink-0 text-sky-300" />
          <p className="text-[11.5px] text-sky-100/95">
            Câmpurile lipsă (vehicul, colaborare, tip vehicul) vor fi marcate „De completat" pe fișa curierului. Poți continua activarea din modul Curieri.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[13px] font-medium text-fg hover:bg-white/[0.05]">Anulează</button>
          <button
            type="button"
            onClick={() => onConfirm(candidate)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(16,185,129,0.55)]"
          >
            <UserCheck size={13} />
            Confirmă conversia
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Import Dialog ─────────────────────────────────────────────────────────
type ParsedRow = {
  ok: boolean;
  errors: string[];
  data: Partial<Pick<Candidate, "fullName" | "phone" | "email" | "city">>;
  duplicate: boolean;
};

const IMPORT_TEMPLATE = "nume;telefon;email;oras;sursa\nIon Popescu;+40 722 111 222;ion@example.com;București;facebook_ads\nAna Ionescu;+40 733 222 333;;Cluj;whatsapp";

export function ImportCandidatesDialog({
  open, onClose, existingPhones, onImport,
}: {
  open: boolean;
  onClose: () => void;
  existingPhones: string[];
  onImport: (rows: Array<Required<Pick<Candidate, "fullName" | "phone">> & { email: string | null; city: string }>) => void;
}) {
  const toast = useToast();
  const [raw, setRaw] = useState<string>("");
  const [step, setStep] = useState<"paste" | "preview">("paste");

  useEffect(() => { if (open) { setRaw(""); setStep("paste"); } }, [open]);

  const parsed: ParsedRow[] = useMemo(() => {
    if (!raw.trim()) return [];
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // Ignoră header dacă începe cu "nume"
    const dataLines = lines[0]?.toLowerCase().startsWith("nume") ? lines.slice(1) : lines;
    const normPhone = (p: string) => p.replace(/[\s\-().]/g, "").toLowerCase();
    const existing = new Set(existingPhones.map(normPhone));
    return dataLines.map((line) => {
      const parts = line.split(";").map((p) => p.trim());
      const [fullName, phone, email, city] = parts;
      const errors: string[] = [];
      if (!fullName) errors.push("nume lipsă");
      if (!phone || phone.replace(/\D/g, "").length < 9) errors.push("telefon invalid");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email invalid");
      if (!city) errors.push("oraș lipsă");
      const duplicate = phone ? existing.has(normPhone(phone)) : false;
      return {
        ok: errors.length === 0,
        errors, duplicate,
        data: { fullName, phone, email: email || null, city },
      };
    });
  }, [raw, existingPhones]);

  const validCount = parsed.filter((r) => r.ok && !r.duplicate).length;
  const dupCount = parsed.filter((r) => r.duplicate).length;
  const errCount = parsed.filter((r) => !r.ok).length;

  const doImport = () => {
    const rows = parsed
      .filter((r) => r.ok && !r.duplicate)
      .map((r) => ({
        fullName: r.data.fullName!,
        phone:    r.data.phone!,
        email:    r.data.email ?? null,
        city:     r.data.city!,
      }));
    onImport(rows);
    toast.success("Import finalizat", `${rows.length} candidați importați · ${dupCount} duplicate ignorate · ${errCount} cu erori`);
    onClose();
  };

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-6 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-line/60 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Upload size={15} className="text-violet-300" />
              <h2 className="text-[16px] font-bold text-fg">Importă candidați</h2>
            </div>
            <p className="mt-1 text-[12px] text-fg-muted">Lipește sau introdu date CSV — un candidat per linie.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05]">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 p-2.5 text-[11.5px] text-sky-100/95">
            <Info size={12} className="text-sky-300" />
            Format: <code className="rounded bg-white/[0.06] px-1">nume;telefon;email;oras;sursa</code> — separator „;". Prima linie header e opțională.
            <button
              type="button"
              onClick={() => setRaw(IMPORT_TEMPLATE)}
              className="ml-auto text-[11.5px] font-semibold text-sky-200 hover:text-white"
            >
              Folosește șablon
            </button>
          </div>

          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"Ion Popescu;+40 722 111 222;ion@example.com;București;facebook_ads\n..."}
            rows={8}
            className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 font-mono text-[12px] text-fg placeholder:text-fg-dim focus:border-violet-500/50 focus:outline-none"
          />

          {parsed.length > 0 && (
            <div className="rounded-lg border border-line/60 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-3 text-[12px]">
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">{validCount} valizi</span>
                {dupCount > 0 && <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">{dupCount} duplicate</span>}
                {errCount > 0 && <span className="rounded-md bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300">{errCount} erori</span>}
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {parsed.map((r, i) => (
                  <div key={i} className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11.5px]",
                    r.ok && !r.duplicate ? "bg-white/[0.02]" : r.duplicate ? "bg-amber-500/[0.06]" : "bg-rose-500/[0.06]",
                  )}>
                    <span className="truncate text-fg">
                      {r.data.fullName || "—"} · {r.data.phone || "—"} · {r.data.city || "—"}
                    </span>
                    {r.errors.length > 0 && (
                      <span className="text-rose-300">{r.errors.join(", ")}</span>
                    )}
                    {r.duplicate && <span className="text-amber-300">duplicat</span>}
                    {r.ok && !r.duplicate && <CheckCircle2 size={12} className="text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line/60 bg-white/[0.02] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg">Anulează</button>
          <button
            type="button"
            onClick={doImport}
            disabled={validCount === 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_6px_18px_-6px_rgba(99,102,241,0.55)]",
              validCount === 0 && "opacity-50",
            )}
          >
            <Upload size={13} />
            Importă {validCount > 0 ? `${validCount} candidați` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Export Dialog ─────────────────────────────────────────────────────────
export function ExportCandidatesDialog({
  open, onClose, candidates, onExported,
}: {
  open: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onExported: (count: number, format: "csv" | "xls") => void;
}) {
  const toast = useToast();
  const [format, setFormat] = useState<"csv" | "xls">("csv");
  const [includeContact, setIncludeContact] = useState(true);
  const [includeSource, setIncludeSource]   = useState(true);
  const [includePrefs, setIncludePrefs]     = useState(true);

  if (!open || typeof document === "undefined") return null;

  const doExport = () => {
    const headers = ["Nume", "Naționalitate", "Oraș"];
    if (includeContact) headers.push("Telefon", "Email");
    if (includePrefs) headers.push("Platforme");
    if (includeSource) headers.push("Sursă", "Adăugat de", "Data");

    const rows = candidates.map((c) => {
      const row: string[] = [c.fullName, c.nationality, c.city];
      if (includeContact) row.push(c.phone, c.email ?? "");
      if (includePrefs)   row.push(c.desiredPlatforms.join(","));
      if (includeSource)  row.push(c.source, c.createdBy, new Date(c.createdAtIso).toISOString());
      return row;
    });

    const esc = (v: string) => (v.includes(";") || v.includes('"') || v.includes("\n")) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");

    if (format === "csv") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `candidati_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } else {
      // XLS = HTML table (deschis nativ de Excel)
      const html = `<html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `candidati_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    onExported(candidates.length, format);
    toast.success("Export gata", `${candidates.length} candidați exportați ca ${format.toUpperCase()}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Download size={15} className="text-violet-300" />
            <h2 className="text-[15px] font-bold text-fg">Exportă candidați</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05]"><X size={14} /></button>
        </div>
        <p className="mb-4 text-[12px] text-fg-muted">
          Exportul include doar candidații filtrați (<b>{candidates.length}</b>) din tenantul + flota activă.
        </p>

        <Field label="Format">
          <div className="flex gap-1.5 rounded-lg border border-line bg-card-hover p-1">
            <FormatBtn active={format === "csv"} label="CSV" icon={FileText} onClick={() => setFormat("csv")} />
            <FormatBtn active={format === "xls"} label="Excel" icon={FileSpreadsheet} onClick={() => setFormat("xls")} />
          </div>
        </Field>

        <div className="mt-3 space-y-2 rounded-lg border border-line/60 bg-white/[0.02] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">Coloane exportate</div>
          <Chk label="Contact (telefon, email)" checked={includeContact} onChange={setIncludeContact} />
          <Chk label="Preferințe (platforme)" checked={includePrefs} onChange={setIncludePrefs} />
          <Chk label="Sursă + audit (adăugat de, dată)" checked={includeSource} onChange={setIncludeSource} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg">Anulează</button>
          <button
            type="button"
            onClick={doExport}
            disabled={candidates.length === 0}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white",
              candidates.length === 0 && "opacity-50",
            )}
          >
            <Download size={12} />
            Descarcă {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Reject / Mark Lost dialog ─────────────────────────────────────────────
export function MarkLostDialog({
  candidate, onCancel, onConfirm,
}: {
  candidate: Candidate | null;
  onCancel: () => void;
  onConfirm: (candidate: Candidate, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { setReason(""); }, [candidate?.id]);
  if (!candidate || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
            <AlertTriangle size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-fg">Marchează candidat pierdut</h3>
            <p className="mt-1 text-[12px] text-fg-muted">
              Candidatul <b>{candidate.fullName}</b> va fi marcat „Pierdut" și scos din pipeline-ul activ.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
            Motiv (obligatoriu pentru audit)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ex: nu răspunde, a găsit alt job, oraș incompatibil..."
            className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] text-fg">Anulează</button>
          <button
            type="button"
            onClick={() => onConfirm(candidate, reason.trim())}
            disabled={!reason.trim()}
            className={cn(
              "rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-3 py-1.5 text-[12.5px] font-semibold text-white",
              !reason.trim() && "opacity-50",
            )}
          >
            Marchează pierdut
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────
export function DeleteCandidateDialog({
  candidate, onCancel, onConfirm,
}: {
  candidate: Candidate | null;
  onCancel: () => void;
  onConfirm: (candidate: Candidate) => void;
}) {
  if (!candidate || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 text-rose-300">
            <AlertTriangle size={16} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-fg">Șterge candidat</h3>
            <p className="mt-1 text-[12px] text-fg-muted">
              Vei șterge <b>{candidate.fullName}</b> din pipeline. Notițele și activitățile vor rămâne pentru audit.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] text-fg">Anulează</button>
          <button
            type="button"
            onClick={() => onConfirm(candidate)}
            className="rounded-lg bg-gradient-to-r from-rose-600 to-rose-500 px-3 py-1.5 text-[12.5px] font-semibold text-white"
          >
            Șterge
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── shared helpers ────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</label>
      {children}
    </div>
  );
}

function FormatBtn({
  active, label, icon: Icon, onClick,
}: { active: boolean; label: string; icon: typeof FileText; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-semibold",
        active ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white" : "text-fg-muted hover:bg-white/[0.05] hover:text-fg",
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function Chk({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fg">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-violet-500" />
      {label}
    </label>
  );
}
