"use client";

import {
  AlertTriangle, Bell, Calendar, FileText, Info, Mail, Megaphone,
  MonitorSmartphone, ShieldCheck, Users, Wallet,
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

const CHANNEL_META: Record<OrgChannelKey, { label: string; desc: string; icon: LucideIcon }> = {
  in_app:       { label: "În aplicație", desc: "Notificări livrate în CRM.",              icon: Bell },
  email:        { label: "E-mail",       desc: "Livrate pe email-ul de business.",        icon: Mail },
  push_browser: { label: "Push browser", desc: "Notificări browser pentru urgențe.",      icon: MonitorSmartphone },
};

const CATEGORY_ICON: Record<OrgCategoryKey, LucideIcon> = {
  payments_couriers:    Wallet,
  activations_blocked:  ShieldCheck,
  docs_expired:         FileText,
  tasks_followup:       AlertTriangle,
  issues_urgent:        AlertTriangle,
  weekly_reports:       Megaphone,
};

const CATEGORY_ICON_TONE: Record<OrgCategoryKey, string> = {
  payments_couriers:    "text-emerald-400",
  activations_blocked:  "text-sky-400",
  docs_expired:         "text-amber-400",
  tasks_followup:       "text-indigo-400",
  issues_urgent:        "text-rose-400",
  weekly_reports:       "text-fuchsia-400",
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
      <ul className="grid gap-3 p-5 md:grid-cols-3">
        {(Object.keys(CHANNEL_META) as OrgChannelKey[]).map((k) => {
          const meta = CHANNEL_META[k];
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
  onToggle: (k: OrgCategoryKey, channel: "in_app" | "email", v: boolean) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Categorii de notificări</h3>
        <p className="text-[11.5px] text-fg-muted">Configurează cine este anunțat și prin ce canal.</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="border-b border-line/50">
            <tr>
              <TH className="w-[240px]">Categorie</TH>
              <TH className="w-[110px] text-center">În aplicație</TH>
              <TH className="w-[110px] text-center">E-mail</TH>
              <TH>Destinatari</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {categories.map((c) => {
              const Icon = CATEGORY_ICON[c.key];
              return (
                <tr key={c.key} className="text-[12.5px]">
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} className={cn("shrink-0", CATEGORY_ICON_TONE[c.key])} />
                      <span className="font-semibold text-fg">{ORG_CATEGORY_LABEL[c.key]}</span>
                    </div>
                  </TD>
                  <TD className="text-center">
                    <div className="inline-flex">
                      <Switch checked={c.in_app} onChange={(v) => onToggle(c.key, "in_app", v)} ariaLabel={`${ORG_CATEGORY_LABEL[c.key]} — în aplicație`} />
                    </div>
                  </TD>
                  <TD className="text-center">
                    <div className="inline-flex">
                      <Switch checked={c.email} onChange={(v) => onToggle(c.key, "email", v)} ariaLabel={`${ORG_CATEGORY_LABEL[c.key]} — email`} />
                    </div>
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1.5">
                      {c.recipients.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 rounded-md border border-line bg-card-2/60 px-2 py-0.5 text-[10.5px] font-semibold text-fg-muted">
                          <Users size={9} />
                          {r}
                        </span>
                      ))}
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn("px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim", className)}
    >
      {children}
    </th>
  );
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3 align-middle", className)}>{children}</td>;
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
      <ul className="grid gap-3 p-5 md:grid-cols-3">
        <ExtraCard
          label="Rezumat zilnic"
          desc="Un singur email cu toate notificările zilei."
          checked={extras.dailyDigest}
          onChange={(v) => onToggle("dailyDigest", v)}
        />
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
