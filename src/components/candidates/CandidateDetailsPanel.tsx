"use client";

import {
  Activity, Calendar, ChevronDown, Edit, FileText, Home, Info, Mail,
  MessageCircle, MessageSquare, MoreHorizontal, Phone, Send, Sparkles,
  User as UserIcon, UserCheck, UserX, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDocuments } from "@/lib/documents/context";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_TYPE_LABEL } from "@/lib/documents/types";
import type { Candidate } from "@/lib/candidates/types";
import {
  ACTIVITY_DOT, ACTIVITY_LABEL, STAGE_COLOR, STAGE_LABEL,
  useCandidatesStage, type CandidateStage,
} from "@/lib/candidates/stage-context";
import { cn } from "@/lib/utils/cn";

const NATIONALITY_INFO: Record<string, { flag: string; label: string }> = {
  ro:     { flag: "🇷🇴", label: "România" },
  eu:     { flag: "🇪🇺", label: "Uniunea Europeană" },
  non_eu: { flag: "🌐", label: "Non-UE" },
};

const PLATFORM_LABEL: Record<string, string> = {
  bolt: "Bolt Food", wolt: "Wolt", glovo: "Glovo",
};

const SOURCE_LABEL: Record<string, string> = {
  facebook_ads: "Facebook Ads", whatsapp: "WhatsApp", olx: "OLX", tiktok: "TikTok",
  instagram: "Instagram", referral: "Recomandare", form: "Formular",
  field: "Recrutare teren", subcontractor: "Subcontractor", phone: "Telefon",
  other: "Altă sursă",
};

function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "acum câteva secunde";
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h} ${h === 1 ? "oră" : "ore"}`;
  const d = Math.floor(h / 24);
  return `acum ${d} ${d === 1 ? "zi" : "zile"}`;
}

function toWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

// ── Panel ─────────────────────────────────────────────────────────────────
type Tab = "info" | "notes" | "activities" | "documents";

type Props = {
  candidate: Candidate | null;
  actorName: string;
  onClose: () => void;
  onEdit: (c: Candidate) => void;
  onScheduleInterview: (c: Candidate) => void;
  onRequestDocuments: (c: Candidate) => void;
  onChangeResponsible: (c: Candidate) => void;
  onMarkLost: (c: Candidate) => void;
  onConvertToCourier: (c: Candidate) => void;
  onDelete: (c: Candidate) => void;
};

export function CandidateDetailsPanel({
  candidate, actorName, onClose, onEdit, onScheduleInterview, onRequestDocuments,
  onChangeResponsible, onMarkLost, onConvertToCourier, onDelete,
}: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const stageCtx = useCandidatesStage();

  if (!candidate) return null;
  const nat = NATIONALITY_INFO[candidate.nationality] ?? { flag: "🏳️", label: candidate.nationality };
  const stage: CandidateStage = stageCtx.getStage(candidate.id);
  const stageColor = STAGE_COLOR[stage];
  const isLost = stageCtx.lostIds.has(candidate.id);
  const convertedCourierId = stageCtx.convertedMap[candidate.id];

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-xl border border-line/60 bg-card">
      {/* Header */}
      <div className="flex items-start gap-2 border-b border-line/60 px-4 py-3">
        <h2 className="flex-1 text-[13.5px] font-bold text-fg">Detalii candidat</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Închide"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.05] hover:text-fg"
        >
          <X size={14} />
        </button>
      </div>

      {/* Profile summary */}
      <div className="border-b border-line/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 text-[15px] font-bold text-fg">
              {initials(candidate.fullName)}
            </span>
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", stageColor.chip)}>
                {STAGE_LABEL[stage]}
              </span>
              {isLost && (
                <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-rose-300">Pierdut</span>
              )}
              {convertedCourierId && (
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-300">Convertit</span>
              )}
            </div>
            <div className="mt-1 truncate text-[16px] font-bold text-fg">{candidate.fullName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-fg-muted">
              <span>{nat.flag} {nat.label}</span>
              <span className="text-fg-dim">·</span>
              <span>ID #{candidate.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="mt-0.5 text-[10.5px] text-fg-dim">
              {STAGE_LABEL[stage]} · {relativeTime(candidate.createdAtIso)}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex items-center gap-1">
          <QuickAction icon={Phone} label="Sună" href={`tel:${candidate.phone.replace(/\s/g, "")}`} onClick={() =>
            stageCtx.logActivity(candidate.id, "call", `Apel către ${candidate.phone}`, actorName)
          } />
          <QuickAction icon={MessageCircle} label="WhatsApp" href={toWhatsAppUrl(candidate.phone)} external onClick={() =>
            stageCtx.logActivity(candidate.id, "whatsapp", "Deschis WhatsApp", actorName)
          } />
          <QuickAction icon={MessageSquare} label="Mesaj" onClick={() => {
            const template = window.prompt(
              "Șablon mesaj:\n\n" +
              "1 — Salutare inițială\n" +
              "2 — Follow-up interviu\n" +
              "3 — Cerere documente\n" +
              "4 — Confirmă disponibilitate\n\n" +
              "Introdu numărul șablonului sau mesajul liber:",
              "1",
            );
            if (!template) return;
            stageCtx.logActivity(candidate.id, "message", `Mesaj trimis (șablon: ${template})`, actorName);
          }} />
          <QuickAction icon={Mail} label="Email" href={candidate.email ? `mailto:${candidate.email}` : undefined} disabled={!candidate.email} onClick={() =>
            candidate.email && stageCtx.logActivity(candidate.id, "email", `Email către ${candidate.email}`, actorName)
          } />
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card-hover text-fg hover:bg-white/[0.06]"
              aria-label="Mai multe acțiuni"
            >
              <MoreHorizontal size={14} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-card shadow-2xl">
                <MoreItem icon={Edit} label="Editează" onClick={() => { onEdit(candidate); setMoreOpen(false); }} />
                <MoreItem icon={Calendar} label="Programează interviu" onClick={() => { onScheduleInterview(candidate); setMoreOpen(false); }} />
                <MoreItem icon={FileText} label="Cere documente" onClick={() => { onRequestDocuments(candidate); setMoreOpen(false); }} />
                <MoreItem icon={UserIcon} label="Schimbă responsabil" onClick={() => { onChangeResponsible(candidate); setMoreOpen(false); }} />
                <div className="my-1 h-px bg-line/40" />
                <MoreItem icon={UserCheck} label="Convertește în curier" onClick={() => { onConvertToCourier(candidate); setMoreOpen(false); }} className="text-emerald-300" />
                <MoreItem icon={UserX} label="Marchează pierdut" onClick={() => { onMarkLost(candidate); setMoreOpen(false); }} className="text-amber-300" />
                <div className="my-1 h-px bg-line/40" />
                <MoreItem icon={X} label="Șterge" onClick={() => { onDelete(candidate); setMoreOpen(false); }} className="text-rose-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs header */}
      <div className="flex items-center gap-1 border-b border-line/60 px-2">
        <TabButton active={tab === "info"} icon={Info} label="Informații" onClick={() => setTab("info")} />
        <TabButton active={tab === "notes"} icon={MessageSquare} label="Notițe" onClick={() => setTab("notes")} />
        <TabButton active={tab === "activities"} icon={Activity} label="Activități" onClick={() => setTab("activities")} />
        <TabButton active={tab === "documents"} icon={FileText} label="Documente" onClick={() => setTab("documents")} />
      </div>

      {/* Tabs body */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "info" && <InfoTab candidate={candidate} actorName={actorName} onEdit={() => onEdit(candidate)} />}
        {tab === "notes" && <NotesTab candidateId={candidate.id} actorName={actorName} />}
        {tab === "activities" && <ActivitiesTab candidateId={candidate.id} />}
        {tab === "documents" && <DocumentsTab candidateId={candidate.id} />}
      </div>
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, href, external, disabled, onClick,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base = "inline-flex flex-col items-center gap-0.5 rounded-lg border border-line bg-card-hover px-2 py-2 text-[10.5px] font-medium transition-colors";
  const enabled = "text-fg hover:bg-white/[0.06]";
  const off = "cursor-not-allowed text-fg-dim opacity-50";
  const cls = cn("flex-1", base, disabled ? off : enabled);
  if (href && !disabled) {
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} onClick={onClick} className={cls}>
        <Icon size={14} />
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} className={cls}>
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function MoreItem({
  icon: Icon, label, onClick, className,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg hover:bg-card-hover", className)}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function TabButton({
  active, icon: Icon, label, onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-semibold transition-colors",
        active ? "border-violet-500 text-fg" : "border-transparent text-fg-dim hover:text-fg-muted",
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

// ── InfoTab ───────────────────────────────────────────────────────────────
function InfoTab({
  candidate, actorName, onEdit,
}: {
  candidate: Candidate;
  actorName: string;
  onEdit: () => void;
}) {
  const stageCtx = useCandidatesStage();
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const nat = NATIONALITY_INFO[candidate.nationality] ?? { flag: "🏳️", label: candidate.nationality };

  const platforms = candidate.desiredPlatforms.map((p) => PLATFORM_LABEL[p] ?? p).join(", ") || "—";

  const submitNote = () => {
    if (!noteText.trim()) return;
    setSaving(true);
    stageCtx.addNote(candidate.id, {
      text: noteText.trim(),
      authorName: actorName,
      visibility: "team",
    });
    stageCtx.logActivity(candidate.id, "note_added", noteText.trim().slice(0, 80), actorName);
    setNoteText("");
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <InfoCard title="Date personale" onEdit={onEdit}>
        <Row label="Nume complet"      value={candidate.fullName} />
        <Row label="Telefon"           value={candidate.phone} />
        <Row label="Email"             value={candidate.email ?? "—"} />
        <Row label="Naționalitate"     value={`${nat.flag} ${nat.label}`} />
        <Row label="Oraș preferat"     value={candidate.city} />
        <Row label="Permis de ședere"  value={candidate.nationality === "non_eu" ? "De verificat" : "Nu necesită"} />
        <Row label="Data disponibilitate" value="De completat" />
      </InfoCard>

      <InfoCard title="Interese și preferințe" onEdit={onEdit}>
        <Row label="Platforme dorite" value={platforms} />
        <Row label="Vehicul preferat" value="De completat" />
        <Row label="Program"          value="De completat" />
        <Row label="Cazare necesară"  value="Nu" />
        <Row label="Salariu așteptat" value="—" />
      </InfoCard>

      <InfoCard title="Sursă lead">
        <Row label="Sursă"          value={SOURCE_LABEL[candidate.source] ?? candidate.source} />
        <Row label="Data adăugării" value={formatDateTime(candidate.createdAtIso)} />
        <Row label="Recrutor / responsabil" value={candidate.createdBy} />
      </InfoCard>

      <div className="rounded-lg border border-line/60 bg-white/[0.02] p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-bold text-fg">
          <Sparkles size={12} className="text-violet-300" />
          Notiță rapidă
        </div>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Adaugă o notiță..."
          rows={2}
          className="w-full resize-none rounded-md border border-line bg-card-hover px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/50 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={submitNote}
            disabled={!noteText.trim() || saving}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)]",
              (!noteText.trim() || saving) && "opacity-50",
            )}
          >
            <Send size={11} />
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title, onEdit, children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line/60 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[12.5px] font-bold text-fg">{title}</h4>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-violet-300 hover:text-violet-200"
          >
            Editează
          </button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const missing = value === "—" || value === "De completat";
  return (
    <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
      <span className="text-fg-dim">{label}</span>
      <span className={cn("truncate text-right font-medium", missing ? "text-amber-300" : "text-fg")}>{value}</span>
    </div>
  );
}

// ── NotesTab ──────────────────────────────────────────────────────────────
function NotesTab({ candidateId, actorName }: { candidateId: string; actorName: string }) {
  const stageCtx = useCandidatesStage();
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<"private" | "team">("team");

  const notes = stageCtx.notesByCandidate[candidateId] ?? [];

  const add = () => {
    if (!text.trim()) return;
    stageCtx.addNote(candidateId, {
      text: text.trim(),
      authorName: actorName,
      visibility,
    });
    stageCtx.logActivity(candidateId, "note_added", text.trim().slice(0, 80), actorName);
    setText("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line/60 bg-white/[0.02] p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adaugă o notiță..."
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-card-hover px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/50 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "private" | "team")}
            className="rounded-md border border-line bg-card-hover px-2 py-1 text-[11.5px] text-fg focus:outline-none"
          >
            <option value="team"    className="bg-card text-fg">Echipă (vizibilă)</option>
            <option value="private" className="bg-card text-fg">Privată (doar tu)</option>
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!text.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <Send size={11} />
            Adaugă
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line/40 p-6 text-center text-[12px] text-fg-dim">
          Nicio notiță încă. Adaugă prima notiță pentru acest candidat.
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-line/60 bg-white/[0.02] p-3">
              <div className="mb-1.5 flex items-center gap-2 text-[10.5px]">
                <span className="font-semibold text-fg">{n.authorName}</span>
                <span className="text-fg-dim">·</span>
                <span className="text-fg-dim">{formatDateTime(n.createdAtIso)}</span>
                <span className={cn(
                  "ml-auto rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wider",
                  n.visibility === "private" ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.05] text-fg-dim",
                )}>
                  {n.visibility === "private" ? "Privată" : "Echipă"}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[12.5px] text-fg">{n.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ActivitiesTab ─────────────────────────────────────────────────────────
function ActivitiesTab({ candidateId }: { candidateId: string }) {
  const stageCtx = useCandidatesStage();
  const activities = stageCtx.activitiesByCandidate[candidateId] ?? [];

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line/40 p-6 text-center text-[12px] text-fg-dim">
        Nicio activitate încă. Interacțiunile cu candidatul vor apărea aici.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-white/[0.02] p-2.5">
          <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", ACTIVITY_DOT[a.kind])} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-fg">
              <span className="font-semibold">{ACTIVITY_LABEL[a.kind]}</span>
              <span className="text-fg-muted"> · {a.description}</span>
            </div>
            <div className="mt-0.5 text-[10.5px] text-fg-dim">
              {a.actorName} · {formatDateTime(a.createdAtIso)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DocumentsTab ──────────────────────────────────────────────────────────
function DocumentsTab({ candidateId }: { candidateId: string }) {
  const { documentsForSubject } = useDocuments();
  const docs = documentsForSubject(candidateId);
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line/40 p-6 text-center text-[12px] text-fg-dim">
        Niciun document încărcat.
        <br />
        Folosește <b>Încarcă document</b> din Dashboard pentru a adăuga.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <div key={d.id} className="rounded-lg border border-line/60 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-fg">
                {DOCUMENT_TYPE_LABEL[d.type]}
              </div>
              <div className="mt-0.5 truncate text-[10.5px] text-fg-dim">
                {d.file.name} · {(d.file.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
            <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", {
              "bg-sky-500/15 text-sky-300":         d.status === "in_review",
              "bg-emerald-500/15 text-emerald-300": d.status === "approved",
              "bg-rose-500/15 text-rose-300":       d.status === "rejected",
              "bg-amber-500/15 text-amber-300":     d.status === "expired",
              "bg-white/[0.05] text-fg-dim":        d.status === "missing",
            })}>
              {DOCUMENT_STATUS_LABEL[d.status]}
            </span>
          </div>
          {d.expiryIso && (
            <div className="mt-1 text-[10.5px] text-fg-dim">
              Expiră: {formatDateTime(d.expiryIso)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
