"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, ListChecks, Plus, Trash2, X } from "lucide-react";
import { WEEK_DAYS, getWeekDatesNow, getWeekLabelNow, getTodayDowNow } from "@/lib/calendar/data";
import { cn } from "@/lib/utils/cn";

// TODO(real-users): mutare pe tabel `weekly_tasks` cu FK tenant + user + week_iso.

type WeekTask = {
  id: string;
  text: string;
  dow: number;      // 0 = Luni ... 6 = Duminică
  done: boolean;
  createdAtIso: string;
};

const STORAGE_KEY = "crm31-weekly-tasks";

function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// (folosim getTodayDowNow din @/lib/calendar/data)

const DEFAULT_TASKS: WeekTask[] = [
  { id: "d1", text: "Sună curierii inactivi (>3 zile)", dow: 0, done: false, createdAtIso: todayIsoLocal() },
  { id: "d2", text: "Verifică ITP / RCA — vehicule cu expirare săptămâna asta", dow: 1, done: false, createdAtIso: todayIsoLocal() },
  { id: "d3", text: "Rulează plățile curierilor pentru săptămâna trecută", dow: 4, done: false, createdAtIso: todayIsoLocal() },
  { id: "d4", text: "Update contract subcontractori care expiră în 30 zile", dow: 2, done: false, createdAtIso: todayIsoLocal() },
];

function safeLoad(): WeekTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WeekTask[];
  } catch {}
  return DEFAULT_TASKS;
}

export function WeeklyTasksBar() {
  const [tasks, setTasks] = useState<WeekTask[]>(DEFAULT_TASKS);
  const [hydrated, setHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [addingDow, setAddingDow] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  // Re-render zilnic: tick pentru a recalcula WEEK_DATES + today când săptămâna trece.
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((n) => n + 1), 60 * 60 * 1000); // check orar
    return () => clearInterval(iv);
  }, []);
  const weekDates = getWeekDatesNow();
  const weekLabel = getWeekLabelNow();
  const today = getTodayDowNow();

  useEffect(() => {
    setTasks(safeLoad());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }, [tasks, hydrated]);

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const remaining = totalCount - doneCount;

  const byDow = useMemo(() => {
    const m: Record<number, WeekTask[]> = {};
    for (let i = 0; i < 7; i++) m[i] = [];
    for (const t of tasks) if (m[t.dow]) m[t.dow].push(t);
    return m;
  }, [tasks]);

  function toggle(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }
  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }
  function addTaskFor(dow: number) {
    const text = draft.trim();
    if (!text) return;
    setTasks((prev) => [...prev, {
      id: `wt_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      text, dow, done: false, createdAtIso: todayIsoLocal(),
    }]);
    setDraft("");
    setAddingDow(null);
  }

  return (
    <section className="sticky top-16 z-20 -mx-4 border-b border-line/70 bg-app/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-blue-500/20 text-violet-300">
          <ListChecks size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-fg">Task-uri săptămâna curentă</div>
          <div className="text-[11px] text-fg-muted">
            {weekLabel} · <b className="text-fg">{remaining}</b> de făcut · {doneCount}/{totalCount} gata
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-semibold text-fg-muted hover:bg-white/[0.06] hover:text-fg"
        >
          {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          {collapsed ? "Deschide" : "Ascunde"}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEK_DAYS.map((day, i) => {
            const dow = i;
            const isToday = dow === today;
            const list = byDow[dow] ?? [];
            const dd = String(weekDates[i] ?? "").padStart(2, "0");
            return (
              <div
                key={dow}
                className={cn(
                  "flex min-h-[92px] flex-col rounded-lg border p-2",
                  isToday ? "border-violet-500/50 bg-violet-500/[0.06]" : "border-line bg-card/60",
                )}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={cn(
                    "text-[10.5px] font-bold uppercase tracking-wider",
                    isToday ? "text-violet-200" : "text-fg-muted",
                  )}>
                    {day} · {dd}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAddingDow(dow); setDraft(""); }}
                    aria-label={`Adaugă task pe ${day}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06] hover:text-fg"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  {list.length === 0 && addingDow !== dow && (
                    <span className="text-[10.5px] italic text-fg-dim">Fără taskuri</span>
                  )}
                  {list.map((t) => (
                    <div key={t.id} className="group flex items-start gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggle(t.id)}
                        aria-label={t.done ? "Marchează neterminat" : "Marchează gata"}
                        className={cn(
                          "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                          t.done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-line bg-card hover:border-violet-500/50",
                        )}
                      >
                        {t.done && <Check size={9} strokeWidth={3} />}
                      </button>
                      <span
                        className={cn(
                          "min-w-0 flex-1 text-[11px] leading-snug",
                          t.done ? "text-fg-dim line-through" : "text-fg",
                        )}
                      >
                        {t.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        aria-label="Șterge task"
                        className="hidden shrink-0 rounded text-fg-dim hover:text-rose-300 group-hover:inline-flex"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                  {addingDow === dow && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addTaskFor(dow); }
                          if (e.key === "Escape") { setAddingDow(null); setDraft(""); }
                        }}
                        placeholder="Task nou…"
                        className="min-w-0 flex-1 rounded border border-line bg-card-2 px-1.5 py-0.5 text-[11px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addTaskFor(dow)}
                        aria-label="Salvează"
                        className="inline-flex h-5 w-5 items-center justify-center rounded bg-violet-600 text-white hover:bg-violet-500"
                      >
                        <Check size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingDow(null); setDraft(""); }}
                        aria-label="Anulează"
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06]"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
