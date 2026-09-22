"use client";

import {
  ChevronRight, Key, Laptop, LogOut, Monitor, Shield,
  ShieldAlert, ShieldCheck, Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ChangePasswordDialog } from "@/components/profile/dialogs/ChangePasswordDialog";
import { Switch } from "@/components/ui/Switch";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSettings } from "@/lib/settings/context";
import { formatRelativeRo } from "@/components/profile/utils";
import { cn } from "@/lib/utils/cn";

export function TabSecuritate() {
  const {
    sessions, revokeSession, revokeAllOtherSessions,
    securityEvents, logActivity,
  } = useProfile();
  const { settings, updateSecurityAlerts } = useSettings();
  const toast = useToast();

  const [pwOpen, setPwOpen]         = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  // Draft pentru cele 3 toggle-uri de alerte
  const [alerts, setAlerts] = useState(settings.securityAlerts);
  useEffect(() => setAlerts(settings.securityAlerts), [settings.securityAlerts]);
  const dirty = JSON.stringify(alerts) !== JSON.stringify(settings.securityAlerts);

  function saveAlerts() {
    updateSecurityAlerts(alerts);
    logActivity("preferences.update", "Alerte securitate organizație", "Securitate");
    toast.success("Alerte de securitate salvate.");
  }

  function revoke(id: string, device: string) {
    revokeSession(id);
    logActivity("session.revoke", device);
    toast.success("Sesiune deconectată.", device);
  }
  function revokeAll() {
    revokeAllOtherSessions();
    logActivity("session.revoke", "Toate celelalte sesiuni");
    toast.success("Sesiunile celelalte au fost deconectate.");
  }

  const otherSessions = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-5">
      {/* PROTECȚIA CONTULUI */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="border-b border-line/70 px-5 py-4">
          <h3 className="text-[15px] font-semibold text-fg">Protecția contului</h3>
          <p className="text-[11.5px] text-fg-muted">
            Controlează securitatea accesului la organizație.
          </p>
        </header>
        <ul className="divide-y divide-line/40">
          <Row
            icon={Key}
            title="Schimbă parola"
            desc="Actualizează parola contului tău."
            right={
              <button
                type="button"
                onClick={() => setPwOpen(true)}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-violet-500"
              >
                Schimbă parola
              </button>
            }
          />
          <Row
            icon={ShieldAlert}
            title="Politică parole"
            desc="Reguli de complexitate și expirare pentru echipă."
            right={
              <button
                type="button"
                onClick={() => setPolicyOpen(true)}
                aria-label="Deschide politica de parole"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
              >
                <ChevronRight size={16} />
              </button>
            }
          />
        </ul>
      </section>

      {/* SESIUNI ACTIVE */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Sesiuni active</h3>
            <p className="text-[11.5px] text-fg-muted">Dispozitive conectate la contul tău.</p>
          </div>
          <button
            type="button"
            onClick={revokeAll}
            disabled={otherSessions === 0}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition-colors",
              otherSessions === 0
                ? "cursor-not-allowed border-line bg-card-2 text-fg-dim"
                : "border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
            )}
          >
            <LogOut size={12} />
            Deconectează celelalte sesiuni
          </button>
        </header>
        <ul className="divide-y divide-line/40">
          {sessions.map((s) => {
            const IconD = /iphone|android|smartphone/i.test(s.device) ? Smartphone
              : /mac/i.test(s.device) ? Laptop : Monitor;
            return (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
                  <IconD size={15} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] font-semibold text-fg">
                    {s.device} · {s.browser}
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-dim">
                    {s.current ? s.location : formatRelativeRo(s.lastActive)}
                    {s.current ? "" : ` · ${s.location}`}
                  </div>
                </div>
                {s.current ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Sesiunea curentă
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => revoke(s.id, `${s.device} · ${s.browser}`)}
                    className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    Deconectează
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ISTORIC SECURITATE */}
        <section className="rounded-2xl border border-line bg-card">
          <header className="border-b border-line/70 px-5 py-4">
            <h3 className="text-[15px] font-semibold text-fg">Istoric securitate</h3>
            <p className="text-[11.5px] text-fg-muted">Ultimele acțiuni importante din contul tău.</p>
          </header>
          <ul className="divide-y divide-line/40">
            {securityEvents.length === 0 && (
              <li className="px-5 py-8 text-center text-[12.5px] text-fg-muted">
                Nicio activitate în ultimele 30 de zile.
              </li>
            )}
            {securityEvents.slice(0, 6).map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className={cn(
                  "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  ev.kind === "login.success" ? "bg-emerald-500/15 text-emerald-300" :
                  ev.kind === "password.change" ? "bg-amber-500/15 text-amber-300" :
                  ev.kind.startsWith("2fa") ? "bg-violet-500/15 text-violet-300" :
                                              "bg-sky-500/15 text-sky-300",
                )}>
                  {ev.kind === "login.success" ? <Shield size={12} /> :
                   ev.kind === "password.change" ? <Key size={12} /> :
                   ev.kind.startsWith("2fa") ? <ShieldCheck size={12} /> :
                                               <ShieldAlert size={12} />}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[13px] font-semibold text-fg">
                    {ev.kind === "login.success" ? "Autentificare reușită" :
                     ev.kind === "password.change" ? "Parolă schimbată" :
                     ev.kind === "2fa.enabled" ? "Autentificare în doi pași activată" :
                     ev.kind === "2fa.disabled" ? "Autentificare în doi pași dezactivată" :
                     ev.kind === "session.revoke" ? "Sesiune deconectată" :
                     ev.kind === "login.failed" ? "Autentificare eșuată" :
                                                  "Actualizare"}
                  </div>
                  <div className="mt-0.5 text-[11px] text-fg-dim">
                    {formatRelativeRo(ev.createdAt)} · {ev.ip} · {ev.details}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ALERTE DE SECURITATE */}
        <section className="rounded-2xl border border-line bg-card">
          <header className="border-b border-line/70 px-5 py-4">
            <h3 className="text-[15px] font-semibold text-fg">Alerte de securitate</h3>
            <p className="text-[11.5px] text-fg-muted">Configurează notificările pentru evenimente sensibile.</p>
          </header>
          <ul className="divide-y divide-line/40">
            <AlertToggleRow
              label="Autentificări noi"
              desc="Primești email când contul e accesat de pe un dispozitiv nou."
              checked={alerts.newLogins}
              onChange={(v) => setAlerts({ ...alerts, newLogins: v })}
            />
            <AlertToggleRow
              label="Schimbări de parolă"
              desc="Anunță când parola contului e modificată."
              checked={alerts.passwordChanges}
              onChange={(v) => setAlerts({ ...alerts, passwordChanges: v })}
            />
            <AlertToggleRow
              label="Activitate neobișnuită"
              desc="Detectare login-uri din locații necunoscute."
              checked={alerts.unusualActivity}
              onChange={(v) => setAlerts({ ...alerts, unusualActivity: v })}
            />
          </ul>
        </section>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveAlerts}
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

      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
      <PasswordPolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  );
}

function Row({
  icon: Icon,
  title,
  desc,
  right,
}: {
  icon: typeof Shield;
  title: string;
  desc: string;
  right: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-4">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[14px] font-semibold text-fg">{title}</div>
        <div className="mt-0.5 text-[11.5px] text-fg-muted">{desc}</div>
      </div>
      {right}
    </li>
  );
}

function AlertToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[13px] font-semibold text-fg">{label}</div>
        <div className="mt-0.5 text-[11px] text-fg-muted">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </li>
  );
}

function PasswordPolicyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Politică parole" description="Reguli aplicate întregii organizații.">
      <ul className="space-y-2 text-[12.5px]">
        <PolicyItem label="Lungime minimă" value="8 caractere" />
        <PolicyItem label="Cerință majuscule + cifre" value="Da" />
        <PolicyItem label="Expirare parolă" value="90 zile" />
        <PolicyItem label="Refolosire ultimele parole" value="Interzisă (4)" />
        <PolicyItem label="Blocare cont după autentificări eșuate" value="5 încercări" />
      </ul>
      <div className="mt-4 rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 text-[11.5px] text-sky-100">
        Configurarea granulară a politicii se activează după integrarea Better-Auth server-side.
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">Închide</button>
      </DialogFooter>
    </Dialog>
  );
}
function PolicyItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-line/60 bg-card-2/50 px-3 py-2">
      <span className="text-fg-muted">{label}</span>
      <span className="font-semibold text-fg">{value}</span>
    </li>
  );
}


