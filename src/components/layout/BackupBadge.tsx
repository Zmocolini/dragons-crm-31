"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CloudUpload, History, Loader2, RotateCcw } from "lucide-react";
import { useBackup, type BackupInfo } from "@/lib/backup/context";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

/** Indicator + acțiuni de backup (colț AppShell). Vizibil DOAR pentru Global Owner. */
export function BackupBadge() {
  const { user } = useSession();
  const { state, backupNow, listBackups, restoreBackup } = useBackup();
  const [open, setOpen] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listBackups().then((b) => { setBackups(b); setLoading(false); });
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, listBackups]);

  const label = state.lastBackupIso
    ? `acum ${timeAgo(state.lastBackupIso)}`
    : "fără backup încă";

  // Vizibil doar pentru Global Owner (după toate hook-urile — regula React).
  if (user.role !== "global_owner") return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Backup automat CRM"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[11px] font-medium transition-colors sm:h-auto sm:py-1",
          state.error
            ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
            : state.busy
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
        )}
      >
        {state.busy
          ? <Loader2 size={11} className="animate-spin" />
          : state.error
            ? <CloudUpload size={11} />
            : <CheckCircle2 size={11} />}
        Backup<span className="hidden sm:inline"> · {label}</span>
      </button>

      {open && (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-line bg-card p-2 shadow-lg shadow-black/40",
            // Telefon: panou pe toată lățimea, sub header. Desktop: dropdown ancorat de buton.
            "fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top)+0.5rem)] z-50",
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:min-w-[320px]",
          )}
        >
          <div className="mb-2 text-[11px] text-fg-muted sm:hidden">Ultimul backup: {label}</div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-fg-dim">Backup CRM</div>
            <button
              type="button"
              onClick={() => backupNow()}
              disabled={state.busy}
              className="inline-flex h-9 items-center gap-1 rounded border border-violet-500/40 bg-violet-500/10 px-3 text-[12px] font-semibold text-violet-200 hover:bg-violet-500/15 disabled:opacity-50 sm:h-auto sm:px-2 sm:py-0.5 sm:text-[11px]"
            >
              <CloudUpload size={10} /> Backup acum
            </button>
          </div>
          {state.error && (
            <div className="mb-2 rounded border border-rose-500/40 bg-rose-500/10 p-1.5 text-[10.5px] text-rose-200">
              Eroare: {state.error}
            </div>
          )}
          <div className="mb-1 flex items-center gap-1 text-[10px] text-fg-dim">
            <History size={9} /> Backup-uri disponibile ({backups.length})
          </div>
          <div className="max-h-[50dvh] overflow-y-auto overscroll-contain sm:max-h-[260px]">
            {loading ? (
              <div className="px-2 py-3 text-center text-[11px] text-fg-muted">Se încarcă…</div>
            ) : backups.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px] text-fg-muted">Fără backup-uri</div>
            ) : (
              backups.map((b) => (
                <div key={b.filename} className="flex items-center justify-between gap-2 rounded px-1.5 py-1.5 text-[12px] hover:bg-white/[0.03] sm:py-1 sm:text-[10.5px]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-fg">{formatDate(b.mtime)}</div>
                    <div className="text-fg-dim">{Math.round(b.size / 1024)} KB</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Restaurezi backup-ul din ${formatDate(b.mtime)}? Datele curente vor fi înlocuite.`)) return;
                      const ok = await restoreBackup(b.filename);
                      if (ok) window.location.reload();
                      else alert("Nu s-a putut restaura backup-ul.");
                    }}
                    title="Restaurează acest backup"
                    className="inline-flex h-9 items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-3 text-[12px] font-semibold text-amber-200 hover:bg-amber-500/15 sm:h-auto sm:px-1.5 sm:py-0.5 sm:text-[10px]"
                  >
                    <RotateCcw size={9} /> Restore
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-1.5 text-[9.5px] text-fg-dim">
            Datele se sincronizează automat pe toate dispozitivele. Backup-ul e o copie de siguranță suplimentară.
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}z`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
