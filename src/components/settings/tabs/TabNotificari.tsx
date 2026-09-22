"use client";

import {
  AlertTriangle, Bell, Calendar, FileText, Info, Megaphone,
  MonitorSmartphone, Users, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSettings } from "@/lib/settings/context";
import type {
  NotificationsOrg, OrgCategoryKey, OrgChannelKey, PaymentSchedule,
} from "@/lib/settings/types";
import { ORG_CATEGORY_LABEL } from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

const CHANNEL_META: Partial<Record<OrgChannelKey, { label: string; desc: string; icon: LucideIcon }>> = {
  in_app:       { label: "În aplicație", desc: "Notificări livrate în CRM.",              icon: Bell },
  push_browser: { label: "Push browser", desc: "Notificări browser pentru urgențe.",      icon: MonitorSmartphone },
};

const CATEGORY_ICON: Record<OrgCategoryKey, LucideIcon> = {
  payments_couriers:    Wallet,
  docs_expired:         FileText,
  tasks_followup:       AlertTriangle,
  issues_urgent:        AlertTriangle,
  weekly_reports:       Megaphone,
};

const CATEGORY_ICON_TONE: Record<OrgCategoryKey, string> = {
  payments_couriers:    "text-emerald-400",
  docs_expired:         "text-amber-400",
  tasks_followup:       "text-indigo-400",
  issues_urgent:        "text-rose-400",
  weekly_reports:       "text-fuchsia-400",
};

const CATEGORY_BG_TONE: Record<OrgCategoryKey, string> = {
  payments_couriers:    "border-emerald-500/30 bg-emerald-500/[0.05]",
  docs_expired:         "border-amber-500/30 bg-amber-500/[0.05]",
  tasks_followup:       "border-indigo-500/30 bg-indigo-500/[0.05]",
  issues_urgent:        "border-rose-500/30 bg-rose-500/[0.05]",
  weekly_reports:       "border-fuchsia-500/30 bg-fuchsia-500/[0.05]",
};

const CATEGORY_DESCRIPTION: Record<OrgCategoryKey, string> = {
  payments_couriers:    "Când un curier are plata pregătită, când plățile săptămânii sunt procesate sau când există plăți restante.",
  docs_expired:         "Când documente ale curierilor (CI, permis, ITP, RCA) urmează să expire în 30 de zile sau au expirat deja.",
  tasks_followup:       "Task-uri asignate ție care necesită acțiune sau follow-up: apel curier, verificare document, aprobare.",
  issues_urgent:        "Probleme și tichete deschise de curieri care necesită răspuns rapid din partea managerului.",
  weekly_reports:       "Rezumatul săptămânal cu performanța flotei: curieri activi, venit, plăți, documente, incidente.",
};

export function TabNotificari() {
  const { settings, updateNotificationsOrg } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();

  // Draft global — Salvează modificările commit-uiește
  const [draft, setDraft] = useState<NotificationsOrg>(settings.notificationsOrg);
  useEffect(() => setDraft(settings.notificationsOrg), [settings.notificationsOrg]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.notificationsOrg);

  function save() {
    updateNotificationsOrg(draft);
    logActivity("preferences.update", "Notificări organizație", "Setări");
    toast.success("Preferințele au fost salvate.");
  }
  function reset() {
    setDraft(settings.notificationsOrg);
  }

  return (
    <div className="space-y-5">
      <CanaleCard
        channels={draft.channels}
        onToggle={(k, v) => setDraft({ ...draft, channels: { ...draft.channels, [k]: v } })}
      />

      <CategoriiCard
        categories={draft.categories}
        onToggle={(k, ch, v) => setDraft({
          ...draft,
          categories: draft.categories.map((c) => c.key === k ? { ...c, [ch]: v } : c),
        })}
      />

      <ProgramPlatiCard
        schedule={draft.schedule}
        onToggle={(day, v) => setDraft({ ...draft, schedule: { ...draft.schedule, [day]: v } })}
      />

      <PreferinteSuplimentareCard
        extras={draft.extras}
        onToggle={(k, v) => setDraft({ ...draft, extras: { ...draft.extras, [k]: v } })}
      />

      <div className="flex justify-end gap-2">
        {dirty && (
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover hover:text-fg"
          >
            Anulează
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className={cn(
            "rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-colors",
            dirty
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

/* ═══════════ CANALE ═══════════ */

function CanaleCard({
  channels,
  onToggle,
}: {
  channels: NotificationsOrg["channels"];
  onToggle: (k: OrgChannelKey, v: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Canale de notificare</h3>
        <p className="text-[11.5px] text-fg-muted">
          Alege prin ce canale primești notificările din aplicație.
        </p>
      </header>
      <ul className="grid gap-3 p-5 md:grid-cols-2">
        {(Object.keys(CHANNEL_META) as OrgChannelKey[]).map((k) => {
          const meta = CHANNEL_META[k];
          if (!meta) return null;
          const Icon = meta.icon;
          const on = channels[k];
          return (
            <li
              key={k}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5",
                on ? "border-violet-500/40 bg-violet-500/[0.06]" : "border-line/60 bg-card-2/40",
              )}
            >
              <span className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                on ? "border-violet-500/40 bg-violet-500/15 text-violet-200" : "border-line bg-card text-fg-muted",
              )}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-semibold text-fg">{meta.label}</div>
                <div className="mt-0.5 text-[11px] text-fg-muted">{meta.desc}</div>
              </div>
              <Switch checked={on} onChange={(v) => onToggle(k, v)} ariaLabel={meta.label} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ═══════════ CATEGORII TABEL ═══════════ */

function CategoriiCard({
  categories,
  onToggle,
}: {
  categories: NotificationsOrg["categories"];
  onToggle: (k: OrgCategoryKey, channel: "in_app", v: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Anunțuri în aplicație</h3>
        <p className="text-[11.5px] text-fg-muted">
          Alege ce tipuri de anunțuri primești în clopoțelul de sus. Fiecare categorie are propria descriere,
          culoare și destinatari.
        </p>
      </header>

      <ul className="flex flex-col gap-3 p-5">
        {categories.map((c) => {
          const Icon = CATEGORY_ICON[c.key] ?? Bell;
          return (
            <li
              key={c.key}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5",
                CATEGORY_BG_TONE[c.key] ?? "border-line bg-card-2/40",
              )}
            >
              {/* Icon mare cu tint */}
              <span
                className={cn(
                  "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-black/30",
                  CATEGORY_ICON_TONE[c.key],
                )}
              >
                <Icon size={24} />
              </span>

              {/* Conținut */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-fg">
                      {ORG_CATEGORY_LABEL[c.key]}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
                      {CATEGORY_DESCRIPTION[c.key] ?? ""}
                    </p>
                  </div>
                  {/* Switch mare aliniat cu titlul */}
                  <div className="flex flex-col items-end gap-1">
                    <Switch
                      checked={c.in_app}
                      onChange={(v) => onToggle(c.key, "in_app", v)}
                      ariaLabel={`${ORG_CATEGORY_LABEL[c.key]} — în aplicație`}
                    />
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest", c.in_app ? "text-emerald-300" : "text-fg-dim")}>
                      {c.in_app ? "Activ" : "Oprit"}
                    </span>
                  </div>
                </div>

                {/* Destinatari — chip-uri mai mari */}
                {c.recipients.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-fg-dim">
                      Ajunge la:
                    </span>
                    {c.recipients.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 text-[11.5px] font-semibold text-fg"
                      >
                        <Users size={11} className="text-fg-dim" />
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ═══════════ PROGRAM PLĂȚI ═══════════ */

function ProgramPlatiCard({
  schedule,
  onToggle,
}: {
  schedule: PaymentSchedule;
  onToggle: (day: keyof PaymentSchedule, v: boolean) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const items: { key: keyof PaymentSchedule; day: string; label: string }[] = [
    { key: "wednesday", day: "Miercuri", label: "Încep plățile" },
    { key: "thursday",  day: "Joi",      label: "Reminder plăți" },
    { key: "friday",    day: "Vineri",   label: "Plăți rămase" },
  ];

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex items-start justify-between border-b border-line/70 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">Program notificări plăți</h3>
          <p className="text-[11.5px] text-fg-muted">
            Configurează zilele și tipul notificărilor pentru plăți.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg"
          aria-label="Cine primește"
        >
          <Info size={13} />
        </button>
      </header>
      <ul className="grid gap-3 p-5 md:grid-cols-3">
        {items.map((it) => {
          const on = schedule[it.key];
          return (
            <li
              key={it.key}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5",
                on ? "border-violet-500/40 bg-violet-500/[0.06]" : "border-line/60 bg-card-2/40",
              )}
            >
              <span className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                on ? "border-violet-500/40 bg-violet-500/15 text-violet-200" : "border-line bg-card text-fg-muted",
              )}>
                <Calendar size={16} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-semibold text-fg">{it.day}</div>
                <div className="mt-0.5 text-[11.5px] text-fg-muted">{it.label}</div>
              </div>
              <Switch checked={on} onChange={(v) => onToggle(it.key, v)} ariaLabel={`${it.day} — ${it.label}`} />
            </li>
          );
        })}
      </ul>
      <div className="flex items-start gap-3 border-t border-line/60 bg-card-2/40 px-5 py-3 text-[11.5px] text-fg-muted">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
          <Info size={12} />
        </span>
        <div>
          Aceste notificări ajung <strong className="text-fg">doar la Admin, Operator plăți și Subcontractor/responsabil</strong>.
          Curierii fără cont în CRM nu primesc notificări.
        </div>
      </div>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} title="Cine primește notificările de plăți">
        <ul className="space-y-2 text-[12.5px] text-fg">
          <li className="rounded-lg border border-line/60 bg-card-2/50 p-3">
            <strong>Admin</strong> — vizibilitate completă pe toate plățile din flotă.
          </li>
          <li className="rounded-lg border border-line/60 bg-card-2/50 p-3">
            <strong>Operator plăți</strong> — primește toate reminderele de procesare.
          </li>
          <li className="rounded-lg border border-line/60 bg-card-2/50 p-3">
            <strong>Subcontractor</strong> — doar plățile aferente flotei proprii.
          </li>
        </ul>
        <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11.5px] text-amber-100">
          Curierii fără cont în CRM nu primesc niciodată notificări. Fluxul de reminder pentru curieri
          externi se face manual sau prin canale terțe (WhatsApp/SMS).
        </div>
        <DialogFooter>
          <button type="button" onClick={() => setHelpOpen(false)} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">Am înțeles</button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}

/* ═══════════ PREFERINȚE SUPLIMENTARE ═══════════ */

function PreferinteSuplimentareCard({
  extras,
  onToggle,
}: {
  extras: NotificationsOrg["extras"];
  onToggle: (k: keyof NotificationsOrg["extras"], v: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Preferințe suplimentare</h3>
        <p className="text-[11.5px] text-fg-muted">Fine-tuning pentru livrarea notificărilor.</p>
      </header>
      <ul className="grid gap-3 p-5 md:grid-cols-2">
        <ExtraCard
          label="Notifică doar elementele importante"
          desc="Filtrează notificările low-priority."
          checked={extras.importantOnly}
          onChange={(v) => onToggle("importantOnly", v)}
        />
        <ExtraCard
          label="Sunet pentru alerte urgente"
          desc="Activează sunet pentru probleme critice."
          checked={extras.urgentSound}
          onChange={(v) => onToggle("urgentSound", v)}
        />
      </ul>
    </section>
  );
}

function ExtraCard({
  label, desc, checked, onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className={cn(
      "flex items-start justify-between gap-3 rounded-xl border p-3.5",
      checked ? "border-violet-500/40 bg-violet-500/[0.06]" : "border-line/60 bg-card-2/40",
    )}>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[13px] font-semibold text-fg">{label}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-muted">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </li>
  );
}
