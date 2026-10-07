"use client";

import {
  ArrowRight, Check, Edit, MessageCircle, MoreVertical, Phone, Plus,
  Trash2, UserCheck, UserX,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import type { Candidate } from "@/lib/candidates/types";
import {
  CONFIRM_STAGES, STAGE_COLOR, STAGE_LABEL, STAGE_ORDER,
  type CandidateStage,
} from "@/lib/candidates/stage-context";
import { cn } from "@/lib/utils/cn";

const NATIONALITY_LABEL: Record<string, { flag: string; label: string }> = {
  ro:     { flag: "🇷🇴", label: "România" },
  eu:     { flag: "🇪🇺", label: "UE" },
  md:     { flag: "🇲🇩", label: "Moldova" },
  in:     { flag: "🇮🇳", label: "India" },
  bd:     { flag: "🇧🇩", label: "Bangladesh" },
  np:     { flag: "🇳🇵", label: "Nepal" },
  lk:     { flag: "🇱🇰", label: "Sri Lanka" },
  non_eu: { flag: "🌐", label: "Non-UE" },
};

const PLATFORM_LABEL: Record<string, string> = {
  bolt:  "Bolt",
  wolt:  "Wolt",
  glovo: "Glovo",
};

const PLATFORM_COLOR: Record<string, string> = {
  bolt:  "bg-emerald-500/15 text-emerald-300",
  wolt:  "bg-sky-500/15 text-sky-300",
  glovo: "bg-orange-500/15 text-orange-300",
};

function relativeTime(iso: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "acum câteva secunde";
  if (m < 60) return `acum ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h} ${h === 1 ? "oră" : "ore"}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `acum ${d} ${d === 1 ? "zi" : "zile"}`;
  const mo = Math.floor(d / 30);
  return `acum ${mo} ${mo === 1 ? "lună" : "luni"}`;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ── Kanban ─────────────────────────────────────────────────────────────────
type Props = {
  candidates: Candidate[];
  getStage: (id: string) => CandidateStage;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveStage: (id: string, from: CandidateStage, to: CandidateStage) => void;
  onAddInStage: (stage: CandidateStage) => void;
  onCandidateAction: (
    id: string,
    action: "call" | "whatsapp" | "edit" | "convert" | "reject" | "delete",
  ) => void;
};

export function CandidatesKanban({
  candidates, getStage, selectedId, onSelect, onMoveStage, onAddInStage, onCandidateAction,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CandidateStage | null>(null);
  const [confirm, setConfirm] = useState<null | {
    id: string; from: CandidateStage; to: CandidateStage;
  }>(null);

  const byStage: Record<CandidateStage, Candidate[]> = {
    leads_new: [], contacted: [], in_discussion: [], interview_scheduled: [], accepted: [],
  };
  for (const c of candidates) {
    const s = getStage(c.id);
    byStage[s].push(c);
  }

  function onDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }
  function onDragEnd() {
    setDraggingId(null);
    setDragOverStage(null);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>, stage: CandidateStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }
  function onDrop(e: DragEvent<HTMLDivElement>, stage: CandidateStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null); setDragOverStage(null);
    if (!id) return;
    const from = getStage(id);
    if (from === stage) return;
    if (CONFIRM_STAGES.includes(stage)) {
      setConfirm({ id, from, to: stage });
      return;
    }
    onMoveStage(id, from, stage);
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-2 pb-2">
        {STAGE_ORDER.map((stage) => {
          const items = byStage[stage];
          const color = STAGE_COLOR[stage];
          const isOver = dragOverStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => onDragOver(e, stage)}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => onDrop(e, stage)}
              className={cn(
                "flex min-w-0 flex-col rounded-xl border-t-4 border border-line/60 bg-card/60 transition-colors",
                color.border,
                isOver && "bg-violet-500/[0.06] ring-2 ring-violet-500/40",
              )}
            >
              <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", color.dot)} />
                  <h3 className="text-[12.5px] font-bold text-fg">{STAGE_LABEL[stage]}</h3>
                  <span className={cn("inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums", color.chip)}>
                    {items.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onAddInStage(stage)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.05] hover:text-fg"
                  aria-label={`Adaugă în ${STAGE_LABEL[stage]}`}
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex max-h-[calc(100vh-320px)] flex-col gap-2 overflow-y-auto px-2 pb-2">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line/40 px-3 py-6 text-center text-[11px] text-fg-dim">
                    Niciun candidat.
                    <br />
                    Trage un card aici sau{" "}
                    <button
                      type="button"
                      onClick={() => onAddInStage(stage)}
                      className="text-violet-300 hover:underline"
                    >
                      adaugă
                    </button>
                    .
                  </div>
                ) : (
                  items.map((c) => (
                    <CandidateCard
                      key={c.id}
                      candidate={c}
                      selected={c.id === selectedId}
                      dragging={c.id === draggingId}
                      onSelect={() => onSelect(c.id)}
                      onDragStart={(e) => onDragStart(e, c.id)}
                      onDragEnd={onDragEnd}
                      onAction={(a) => onCandidateAction(c.id, a)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirm && (
        <StageConfirmDialog
          from={confirm.from}
          to={confirm.to}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            onMoveStage(confirm.id, confirm.from, confirm.to);
            setConfirm(null);
          }}
        />
      )}
    </>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────
function CandidateCard({
  candidate: c, selected, dragging, onSelect, onDragStart, onDragEnd, onAction,
}: {
  candidate: Candidate;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onAction: (a: "call" | "whatsapp" | "edit" | "convert" | "reject" | "delete") => void;
}) {
  const nat = NATIONALITY_LABEL[c.nationality] ?? { flag: "🏳️", label: c.nationality };
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        "group cursor-pointer rounded-lg border bg-card p-2.5 shadow-sm transition-all",
        selected ? "border-violet-500/60 ring-1 ring-violet-500/40" : "border-line/60 hover:border-line",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-[10.5px] font-bold text-fg">
          {initials(c.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-semibold text-fg">{c.fullName}</span>
            <span className="text-[10px]" title={nat.label}>{nat.flag}</span>
          </div>
          <div className="mt-0.5 truncate text-[10.5px] text-fg-dim">
            {c.city} · {relativeTime(c.createdAtIso)}
          </div>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-dim opacity-0 hover:bg-white/[0.05] hover:text-fg group-hover:opacity-100"
            aria-label="Meniu acțiuni"
          >
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <MenuItem icon={Phone} label="Sună" onClick={() => { onAction("call"); setMenuOpen(false); }} />
              <MenuItem icon={MessageCircle} label="WhatsApp" onClick={() => { onAction("whatsapp"); setMenuOpen(false); }} />
              <MenuItem icon={Edit} label="Editează" onClick={() => { onAction("edit"); setMenuOpen(false); }} />
              <div className="my-1 h-px bg-line/40" />
              <MenuItem icon={UserCheck} label="Convertește în curier" onClick={() => { onAction("convert"); setMenuOpen(false); }} className="text-emerald-300" />
              <MenuItem icon={UserX} label="Marchează pierdut" onClick={() => { onAction("reject"); setMenuOpen(false); }} className="text-amber-300" />
              <div className="my-1 h-px bg-line/40" />
              <MenuItem icon={Trash2} label="Șterge" onClick={() => { onAction("delete"); setMenuOpen(false); }} className="text-rose-400" />
            </div>
          )}
        </div>
      </div>

      {c.desiredPlatforms.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {c.desiredPlatforms.map((p) => (
            <span
              key={p}
              className={cn("rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider", PLATFORM_COLOR[p] ?? "bg-white/[0.05] text-fg-dim")}
            >
              {PLATFORM_LABEL[p] ?? p}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-fg-muted">
        <Phone size={9} className="text-fg-dim" />
        <span className="truncate">{c.phone}</span>
        {c.needsFollowUp && (
          <span className="ml-auto inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-300">
            follow-up
          </span>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, className,
}: {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-fg hover:bg-card-hover",
        className,
      )}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

// ── Confirmation dialog for important stage changes ───────────────────────
function StageConfirmDialog({
  from, to, onCancel, onConfirm,
}: {
  from: CandidateStage;
  to: CandidateStage;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Check size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14.5px] font-bold text-fg">Confirmă schimbarea stadiului</h3>
            <p className="mt-1 text-[12.5px] text-fg-muted">
              Muți candidatul din <b>{STAGE_LABEL[from]}</b>{" "}
              <ArrowRight size={11} className="inline text-fg-dim" />{" "}
              <b>{STAGE_LABEL[to]}</b>. Acțiunea intră în Audit Log.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.05]"
          >
            Anulează
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(16,185,129,0.5)] hover:shadow-[0_6px_18px_-4px_rgba(16,185,129,0.6)]"
          >
            Confirmă mutarea
          </button>
        </div>
      </div>
    </div>
  );
}
