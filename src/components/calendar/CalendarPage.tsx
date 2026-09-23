"use client";

import { useEffect, useState } from "react";
import { Check, Lock, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { WEEK_DAYS, getWeekDatesNow, getWeekLabelNow, getTodayDowNow } from "@/lib/calendar/data";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

// Notițe GLOBALE — vizibile pe toate conturile, editabile doar de global_owner.
// TODO(real-users): mutare pe tabel `calendar_notes_global` (fără tenant scope, cu created_by=global_owner).

type Note = {
  id: string;
  dow: number;      // 0 = Luni ... 6 = Duminică
  text: string;
  createdAtIso: string;
};

const STORAGE_KEY = "crm31-calendar-notes";

const DEFAULT_NOTES: Note[] = [
  { id: "n1", dow: 2, text: "PFA / SRL",  createdAtIso: new Date().toISOString() },
  { id: "n2", dow: 4, text: "Salarii",    createdAtIso: new Date().toISOString() },
];

function safeLoad(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Note[];
  } catch {}
  return DEFAULT_NOTES;
}

export function CalendarPage() {
  const { user } = useSession();
  const canEdit = user.role === "global_owner";
  const [notes, setNotes] = useState<Note[]>(DEFAULT_NOTES);
  const [hydrated, setHydrated] = useState(false);
  const [addingDow, setAddingDow] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setNotes(safeLoad());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)); } catch {}
  }, [notes, hydrated]);

  function addNote(dow: number) {
    if (!canEdit) return;
    const text = draft.trim();
    if (!text) { setAddingDow(null); return; }
    setNotes((prev) => [...prev, {
      id: `cn_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      dow, text, createdAtIso: new Date().toISOString(),
    }]);
    setDraft("");
    setAddingDow(null);
  }

  function saveEdit(id: string) {
    if (!canEdit) return;
    const text = draft.trim();
    if (!text) { setEditingId(null); return; }
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, text } : n));
    setEditingId(null);
    setDraft("");
  }

  function remove(id: string) {
    if (!canEdit) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  // Re-render zilnic ca să prindem trecerea la săptămâna următoare + evidențierea zilei.
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);
  const weekDates = getWeekDatesNow();
  const weekLabel = getWeekLabelNow();
  const todayDow = getTodayDowNow();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-fg">Calendar</h1>
          <p className="mt-0.5 text-[12.5px] text-fg-muted">
            Notițe globale · {weekLabel}
            {!canEdit && (
              <span className="ml-2 inline-flex items-center gap-1 rounded border border-line bg-card-hover px-1.5 py-0.5 text-[10.5px] font-medium text-fg-dim">
                <Lock size={9} /> doar Global Owner poate edita
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-7">
        {WEEK_DAYS.map((day, dow) => {
          const isToday = dow === todayDow;
          const dayNotes = notes.filter((n) => n.dow === dow);
          return (
            <Card
              key={dow}
              className={cn(
                "flex min-h-[180px] flex-col gap-2 p-3",
                isToday && "border-violet-500/60 ring-1 ring-violet-500/30",
              )}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <div className={cn(
                    "text-[10.5px] font-bold uppercase tracking-wider",
                    isToday ? "text-violet-200" : "text-fg-muted",
                  )}>
                    {day}
                  </div>
                  <div className={cn(
                    "text-[18px] font-bold leading-none",
                    isToday ? "text-violet-100" : "text-fg",
                  )}>
                    {weekDates[dow]}
                  </div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => { setAddingDow(dow); setEditingId(null); setDraft(""); }}
                    aria-label={`Adaugă notiță pe ${day}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06] hover:text-fg"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                {dayNotes.length === 0 && addingDow !== dow && (
                  <span className="text-[11px] italic text-fg-dim">—</span>
                )}
                {dayNotes.map((n) => (
                  <div key={n.id} className="group flex items-start gap-1.5 rounded-md border border-line bg-card-hover px-2 py-1.5">
                    {editingId === n.id ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); saveEdit(n.id); }
                            if (e.key === "Escape") { setEditingId(null); setDraft(""); }
                          }}
                          className="min-w-0 flex-1 rounded border border-violet-500/50 bg-card-2 px-1.5 py-0.5 text-[12px] text-fg outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => saveEdit(n.id)}
                          aria-label="Salvează"
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600 text-white hover:bg-violet-500"
                        >
                          <Check size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingId(null); setDraft(""); }}
                          aria-label="Anulează"
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06]"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-fg">
                          {n.text}
                        </span>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditingId(n.id); setAddingDow(null); setDraft(n.text); }}
                              aria-label="Editează"
                              className="hidden shrink-0 rounded text-fg-dim hover:text-violet-300 group-hover:inline-flex"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(n.id)}
                              aria-label="Șterge"
                              className="hidden shrink-0 rounded text-fg-dim hover:text-rose-300 group-hover:inline-flex"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
                {addingDow === dow && (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addNote(dow); }
                        if (e.key === "Escape") { setAddingDow(null); setDraft(""); }
                      }}
                      placeholder="Notiță nouă…"
                      className="min-w-0 flex-1 rounded border border-violet-500/50 bg-card-2 px-1.5 py-1 text-[12px] text-fg placeholder:text-fg-dim outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addNote(dow)}
                      aria-label="Salvează"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-600 text-white hover:bg-violet-500"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAddingDow(null); setDraft(""); }}
                      aria-label="Anulează"
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06]"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
