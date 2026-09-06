"use client";

import Image from "next/image";
import {
  AlertCircle, ArrowRight, Bell, Calendar, Check, CheckCircle2,
  Cloud, Download, FileSpreadsheet, Info, Mail, MessageCircle,
  Upload, X, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import {
  CHANNEL_DESC, CHANNEL_LABEL, STATUS_LABEL,
  type IntegrationPlatform, type IntegrationStatus,
  type NotificationChannelKey, type PlatformKey,
} from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

const PLATFORM_NAME: Record<PlatformKey, string> = {
  bolt:  "Bolt Food",
  wolt:  "Wolt",
  glovo: "Glovo",
};

const PLATFORM_DESC: Record<PlatformKey, string> = {
  bolt:  "Primește și gestionează automat comenzile.",
  wolt:  "Sincronizează comenzile și statusurile.",
  glovo: "Conectează contul și începe să primești comenzi.",
};

const STATUS_STYLE: Record<IntegrationStatus, string> = {
  connected:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  verifying:    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  disconnected: "border-white/10 bg-white/[0.05] text-fg-dim",
};

const STATUS_DOT: Record<IntegrationStatus, string> = {
  connected:    "bg-emerald-400",
  verifying:    "bg-amber-400",
  disconnected: "bg-fg-dim",
};

const CHANNEL_ICON: Record<NotificationChannelKey, LucideIcon> = {
  in_app:   Bell,
  email:    Mail,
  whatsapp: MessageCircle,
};

const CHANNEL_TONE: Record<NotificationChannelKey, string> = {
  in_app:   "text-violet-300 bg-violet-500/15 border-violet-500/25",
  email:    "text-sky-300 bg-sky-500/15 border-sky-500/25",
  whatsapp: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25",
};

function formatRoDateTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const months = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
  const day = d.getDate();
  const mon = months[d.getMonth()];
  const yr  = d.getFullYear();
  const hh  = String(d.getHours()).padStart(2, "0");
  const mm  = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} ${yr}, ${hh}:${mm}`;
}

export function TabIntegrari() {
  const { settings, toggleNotificationChannel } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();

  // Draft pentru canale notificare (Save button)
  const [chDraft, setChDraft] = useState(settings.integrations.channels);
  useEffect(() => setChDraft(settings.integrations.channels), [settings.integrations.channels]);
  const chDirty = JSON.stringify(chDraft) !== JSON.stringify(settings.integrations.channels);

  function saveChannels() {
    (Object.keys(chDraft) as NotificationChannelKey[]).forEach((k) => {
      if (chDraft[k] !== settings.integrations.channels[k]) toggleNotificationChannel(k, chDraft[k]);
    });
    logActivity("preferences.update", "Canale notificări integrare", "Setări");
    toast.success("Configurația a fost salvată.");
  }

  return (
    <div className="space-y-5">
      <PlatformeLivrareCard />
      <CalendarProgramariCard />

      <div className="grid gap-4 md:grid-cols-2">
        <ImportDateCard />
        <ExportBackupCard />
      </div>

      <IntegrareNotificariCard
        draft={chDraft}
        onChange={(k, v) => setChDraft({ ...chDraft, [k]: v })}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveChannels}
          disabled={!chDirty}
          className={cn(
            "rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-colors",
            chDirty
              ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500"
              : "cursor-not-allowed bg-white/[0.06] text-fg-dim",
          )}
        >
          Salvează modificările
        </button>
      </div>
    </div>
  );
}

/* ═══════════ PLATFORME DE LIVRARE ═══════════ */

function PlatformeLivrareCard() {
  const { settings } = useSettings();
  const [manageTarget, setManageTarget] = useState<PlatformKey | null>(null);

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Platforme de livrare</h3>
        <p className="text-[11.5px] text-fg-muted">
          Verifică și gestionează conexiunile operaționale ale flotei.
        </p>
      </header>
      <ul className="divide-y divide-line/40">
        {settings.integrations.platforms.map((p) => (
          <PlatformRow key={p.key} platform={p} onManage={() => setManageTarget(p.key)} />
        ))}
      </ul>

      {manageTarget && (
        <PlatformManageDialog
          platform={settings.integrations.platforms.find((p) => p.key === manageTarget)!}
          onClose={() => setManageTarget(null)}
        />
      )}
    </section>
  );
}

function PlatformRow({
  platform,
  onManage,
}: {
  platform: IntegrationPlatform;
  onManage: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4">
      <PlatformLogo platform={platform.key} size={44} rounded="lg" />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-fg">{PLATFORM_NAME[platform.key]}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-muted">{PLATFORM_DESC[platform.key]}</div>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold",
          STATUS_STYLE[platform.status],
        )}
      >
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", STATUS_DOT[platform.status])} />
        {STATUS_LABEL[platform.status]}
      </span>
      <div className="min-w-[170px] text-right text-[11.5px] leading-tight text-fg-muted">
        {platform.lastSyncIso ? (
          <>
            <div className="text-fg-dim">Ultima sincronizare:</div>
            <div className="font-mono text-fg-muted">{formatRoDateTime(platform.lastSyncIso)}</div>
          </>
        ) : (
          <span className="text-fg-dim">-</span>
        )}
      </div>
      <button
        type="button"
        onClick={onManage}
        className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
      >
        Gestionează
      </button>
    </li>
  );
}

function PlatformManageDialog({
  platform,
  onClose,
}: {
  platform: IntegrationPlatform;
  onClose: () => void;
}) {
  const { updateIntegrationPlatform } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();

  function connect() {
    updateIntegrationPlatform(platform.key, {
      status: "connected",
      lastSyncIso: new Date().toISOString(),
      account: "fleet@dragondelivery.ro",
    });
    logActivity("preferences.update", `Conectare ${PLATFORM_NAME[platform.key]}`, "Integrări");
    toast.success(`${PLATFORM_NAME[platform.key]} conectat.`, "Sincronizarea va începe în câteva minute.");
    onClose();
  }
  function sync() {
    updateIntegrationPlatform(platform.key, { lastSyncIso: new Date().toISOString() });
    toast.success("Sincronizare pornită.", "Se actualizează comenzile.");
    onClose();
  }
  function disconnect() {
    updateIntegrationPlatform(platform.key, { status: "disconnected", lastSyncIso: null, account: null });
    logActivity("preferences.update", `Deconectare ${PLATFORM_NAME[platform.key]}`, "Integrări");
    toast.error(`${PLATFORM_NAME[platform.key]} deconectat.`);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={PLATFORM_NAME[platform.key]} description={PLATFORM_DESC[platform.key]}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-card-2/50 p-3.5">
          <PlatformLogo platform={platform.key} size={40} rounded="lg" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-fg">
              Cont conectat
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-fg-muted">
              {platform.account ?? "Niciun cont conectat"}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold",
              STATUS_STYLE[platform.status],
            )}
          >
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", STATUS_DOT[platform.status])} />
            {STATUS_LABEL[platform.status]}
          </span>
        </div>

        <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 text-[11.5px] text-sky-100">
          <Info size={12} className="mr-1 inline align-[-2px]" />
          Conexiunea se face prin login OAuth pe platforma respectivă. Nu ești obligat să
          introduci tokens sau API keys manual.
        </div>

        {platform.lastSyncIso && (
          <div className="text-[11.5px] text-fg-muted">
            Ultima sincronizare:{" "}
            <span className="font-mono text-fg">{formatRoDateTime(platform.lastSyncIso)}</span>
          </div>
        )}
      </div>

      <DialogFooter>
        {platform.status === "disconnected" ? (
          <button type="button" onClick={connect} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
            Conectează contul
          </button>
        ) : (
          <>
            <button type="button" onClick={disconnect} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-[12.5px] font-semibold text-rose-200 hover:bg-rose-500/20">
              Deconectează
            </button>
            <button type="button" onClick={sync} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
              Sincronizează acum
            </button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}

/* ═══════════ CALENDAR ═══════════ */

function CalendarProgramariCard() {
  const { settings, updateCalendar } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [gOpen, setGOpen] = useState(false);

  function toggleInternal(v: boolean) {
    updateCalendar({ internalEnabled: v });
    logActivity("preferences.update", `Calendar intern: ${v ? "activat" : "dezactivat"}`, "Integrări");
    toast.success(v ? "Calendar intern activat." : "Calendar intern dezactivat.");
  }

  function connectGoogle() {
    // TODO(real-users): OAuth Google Calendar (client id + scopes). Aici e placeholder informativ.
    updateCalendar({ googleConnected: true, googleAccount: "office@dragondelivery.ro" });
    logActivity("preferences.update", "Google Calendar conectat", "Integrări");
    toast.success("Google Calendar conectat.", "Sincronizare la fiecare 15 minute.");
    setGOpen(false);
  }

  function disconnectGoogle() {
    updateCalendar({ googleConnected: false, googleAccount: null });
    logActivity("preferences.update", "Google Calendar deconectat", "Integrări");
    toast.error("Google Calendar deconectat.");
    setGOpen(false);
  }

  const cal = settings.integrations.calendar;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Calendar și programări</h3>
        <p className="text-[11.5px] text-fg-muted">
          Centralizează interviurile, task-urile și expirările importante.
        </p>
      </header>

      <ul className="divide-y divide-line/40">
        <li className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Calendar size={18} />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13.5px] font-semibold text-fg">Calendar intern</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              Gestionează interviuri, task-uri și notificări în calendarul aplicației.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={cal.internalEnabled} onChange={toggleInternal} ariaLabel="Calendar intern" />
            <span className={cn(
              "text-[11.5px] font-semibold",
              cal.internalEnabled ? "text-emerald-300" : "text-fg-dim",
            )}>
              {cal.internalEnabled ? "Activat" : "Dezactivat"}
            </span>
          </div>
        </li>

        <li className="flex flex-wrap items-center gap-4 px-5 py-4">
          <GoogleCalendarIcon />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13.5px] font-semibold text-fg">Google Calendar</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              Sincronizează evenimentele cu Google Calendar.
              {cal.googleConnected && cal.googleAccount && (
                <span className="ml-1 text-emerald-300">· {cal.googleAccount}</span>
              )}
            </div>
          </div>
          {cal.googleConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Conectat
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setGOpen(true)}
            className={cn(
              "rounded-lg px-4 py-2 text-[12.5px] font-semibold transition-colors",
              cal.googleConnected
                ? "border border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg"
                : "border border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
            )}
          >
            {cal.googleConnected ? "Gestionează" : "Conectează"}
          </button>
        </li>
      </ul>

      {gOpen && (
        <Dialog open onClose={() => setGOpen(false)} title="Google Calendar">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-card-2/50 p-3.5">
              <GoogleCalendarIcon size={44} />
              <div>
                <div className="text-[13.5px] font-semibold text-fg">Sincronizare Google Calendar</div>
                <p className="mt-0.5 text-[11.5px] text-fg-muted">
                  {cal.googleConnected
                    ? `Cont conectat: ${cal.googleAccount}`
                    : "Conectează contul Google pentru a sincroniza interviurile, task-urile și expirările documentelor."}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11.5px] text-amber-100">
              <AlertCircle size={12} className="mr-1 inline align-[-2px]" />
              În versiunea demo, click pe „Conectează" marchează starea. Fluxul real OAuth Google
              se activează după configurarea client_id în backend.
            </div>
          </div>
          <DialogFooter>
            {cal.googleConnected ? (
              <button type="button" onClick={disconnectGoogle} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-[12.5px] font-semibold text-rose-200 hover:bg-rose-500/20">
                Deconectează
              </button>
            ) : (
              <button type="button" onClick={connectGoogle} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
                Conectează cu Google
              </button>
            )}
          </DialogFooter>
        </Dialog>
      )}
    </section>
  );
}

function GoogleCalendarIcon({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-[10px] font-bold text-[#1a73e8]"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 flex flex-col">
        <span className="h-1/3 w-full bg-[#4285f4]" />
      </span>
      <span className="relative mt-1 text-[13px] font-black">31</span>
    </span>
  );
}

/* ═══════════ IMPORT ═══════════ */

function ImportDateCard() {
  const { logActivity } = useProfile();
  const { user } = useSession();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<null | { name: string; rows: number; errors: number }>(null);

  const canImport = user.role === "global_owner" || user.role === "subcontractor_owner";

  function pick() {
    if (!canImport) {
      toast.error("Acces restricționat", "Doar Owner / Subcontractor Admin pot importa date.");
      return;
    }
    inputRef.current?.click();
  }

  function onFile(f?: File) {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      toast.error("Format neacceptat", "Alege un fișier Excel (.xlsx / .xls) sau CSV.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Fișier prea mare", "Limita este 10 MB.");
      return;
    }
    // TODO(real-users): parse real cu SheetJS + validare rânduri backend.
    // Aici: preview simulat.
    const fakeRows = Math.floor(Math.random() * 250) + 40;
    const fakeErr  = Math.floor(Math.random() * 6);
    setPreview({ name: f.name, rows: fakeRows, errors: fakeErr });
  }

  function confirmImport() {
    if (!preview) return;
    logActivity("preferences.update", `Import ${preview.name} (${preview.rows} rânduri, ${preview.errors} erori)`, "Integrări");
    toast.success("Import trimis spre procesare.", `${preview.rows - preview.errors} rânduri valide.`);
    setPreview(null);
  }

  return (
    <>
      <section className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25">
          <FileSpreadsheet size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-fg">Import date</div>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">
            Importă curieri, plăți și date operaționale.
          </p>
        </div>
        <button
          type="button"
          onClick={pick}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          <Upload size={13} />
          Importă fișier
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </section>

      {preview && (
        <Dialog open onClose={() => setPreview(null)} title="Previzualizare import" description={preview.name}>
          <div className="grid grid-cols-3 gap-3">
            <StatBox icon={FileSpreadsheet} label="Total rânduri" value={String(preview.rows)} tone="text-fg" />
            <StatBox icon={CheckCircle2}    label="Valide"        value={String(preview.rows - preview.errors)} tone="text-emerald-300" />
            <StatBox icon={AlertCircle}     label="Erori"         value={String(preview.errors)} tone="text-rose-300" />
          </div>
          <div className={cn(
            "mt-4 rounded-lg border p-3 text-[11.5px]",
            preview.errors === 0
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/25 bg-amber-500/10 text-amber-100",
          )}>
            {preview.errors === 0
              ? <><CheckCircle2 size={12} className="mr-1 inline align-[-2px]" /> Toate rândurile sunt valide și pot fi importate.</>
              : <><AlertCircle size={12} className="mr-1 inline align-[-2px]" /> {preview.errors} rânduri au erori. Vei putea corecta după import sau exclude aceste rânduri.</>}
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setPreview(null)} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
            <button type="button" onClick={confirmImport} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
              Importă {preview.rows - preview.errors} rânduri
            </button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-card-2/50 p-3">
      <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
        <Icon size={11} />
        {label}
      </div>
      <div className={cn("mt-1.5 text-[20px] font-bold tabular-nums", tone)}>{value}</div>
    </div>
  );
}

/* ═══════════ EXPORT ═══════════ */

function ExportBackupCard() {
  const [open, setOpen] = useState(false);
  const { logActivity } = useProfile();
  const { user } = useSession();
  const toast = useToast();

  const canExport = user.role === "global_owner" || user.role === "subcontractor_owner" || user.role === "operator_payments";

  const options = useMemo(() => ([
    { key: "couriers", label: "Raport curieri",  desc: "Toți curierii cu status și platforme." },
    { key: "payments", label: "Raport plăți",    desc: "Plăți procesate și în așteptare." },
    { key: "activ",    label: "Raport activări", desc: "Activări finalizate și în proces." },
    { key: "docs",     label: "Raport documente", desc: "Documente expirate sau care expiră." },
    { key: "backup",   label: "Backup complet",   desc: "Copie de siguranță a tuturor datelor." },
  ]), []);

  function doExport(key: string, label: string) {
    if (!canExport) {
      toast.error("Acces restricționat");
      return;
    }
    logActivity("preferences.update", `Export ${label}`, "Integrări");
    toast.success(`${label} descărcat.`, "Fișierul e disponibil în bara de descărcări.");
  }

  return (
    <>
      <section className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25">
          <Cloud size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-fg">Export și backup</div>
          <p className="mt-0.5 text-[11.5px] text-fg-muted">
            Descarcă rapoarte și copii de siguranță.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          Gestionează
        </button>
      </section>

      {open && (
        <Dialog open onClose={() => setOpen(false)} title="Export și backup" description="Descarcă rapoarte sau o copie de siguranță." size="lg">
          <ul className="space-y-2">
            {options.map((o) => (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => doExport(o.key, o.label)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-card-2/50 p-3.5 text-left transition-colors hover:bg-card-hover"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted">
                    <Download size={15} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13px] font-semibold text-fg">{o.label}</div>
                    <div className="mt-0.5 text-[11px] text-fg-dim">{o.desc}</div>
                  </div>
                  <ArrowRight size={14} className="text-fg-dim" />
                </button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Închide</button>
          </DialogFooter>
        </Dialog>
      )}
    </>
  );
}

/* ═══════════ INTEGRARE NOTIFICĂRI ═══════════ */

function IntegrareNotificariCard({
  draft,
  onChange,
}: {
  draft: Record<NotificationChannelKey, boolean>;
  onChange: (k: NotificationChannelKey, v: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Integrare notificări</h3>
        <p className="text-[11.5px] text-fg-muted">
          Alege unde primește echipa actualizările importante.
        </p>
      </header>
      <div className="grid gap-3 p-5 md:grid-cols-3">
        {(Object.keys(CHANNEL_LABEL) as NotificationChannelKey[]).map((k) => {
          const Icon   = CHANNEL_ICON[k];
          const active = draft[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k, !active)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                active
                  ? "border-violet-500/50 bg-violet-500/[0.08]"
                  : "border-line/60 bg-card-2/40 hover:bg-card-hover",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                  active ? CHANNEL_TONE[k] : "border-line bg-card text-fg-dim",
                )}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-fg">{CHANNEL_LABEL[k]}</div>
                <div className="mt-0.5 text-[11px] text-fg-muted">{CHANNEL_DESC[k]}</div>
              </div>
              <span
                aria-hidden
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                  active
                    ? "border-violet-400/60 bg-violet-500/30 text-white"
                    : "border-line bg-card-2",
                )}
              >
                {active ? <Check size={11} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-fg-dim/60" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// unused-import guards (icons expuse pentru viitor)
void Zap;
void X;
void Image;
