"use client";

import {
  Globe, Key, Laptop, LogOut, Monitor, Shield, Smartphone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";
import { ChangePasswordDialog } from "../dialogs/ChangePasswordDialog";
import { formatRelativeRo } from "../utils";
import { cn } from "@/lib/utils/cn";
import type { SecurityEvent } from "@/lib/profile/types";

const SEC_LABEL: Record<SecurityEvent["kind"] | "profile.change", string> = {
  "login.success":   "Autentificare reușită",
  "login.failed":    "Autentificare eșuată",
  "password.change": "Schimbare parolă",
  "2fa.enabled":     "2FA activat",
  "2fa.disabled":    "2FA dezactivat",
  "session.revoke":  "Sesiune deconectată",
  "email.change":    "Schimbare email",
  "profile.change":  "Actualizare profil",
};

export function TabSecurity() {
  const [pwOpen, setPwOpen] = useState(false);
  const { sessions, revokeSession, revokeAllOtherSessions, securityEvents, addSecurityEvent, logActivity } = useProfile();
  const toast = useToast();

  function revoke(id: string, device: string) {
    revokeSession(id);
    addSecurityEvent("session.revoke", `Sesiune deconectată: ${device}`);
    logActivity("session.revoke", device);
    toast.success("Sesiune deconectată.", device);
  }

  function revokeAll() {
    revokeAllOtherSessions();
    addSecurityEvent("session.revoke", "Toate celelalte sesiuni deconectate");
    logActivity("session.revoke", "Toate celelalte");
    toast.success("Sesiunile celelalte au fost deconectate.");
  }

  const otherCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-5">
      {/* Change password compact card */}
      <section className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted">
            <Key size={17} />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-fg">Schimbă parola</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              Actualizează parola contului tău pentru a-l menține în siguranță.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPwOpen(true)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500"
        >
          Schimbă parola
        </button>
      </section>

      {/* 2FA — pur informativ, în dezvoltare (fără toggle fake) */}
      <section className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-dim">
            <Shield size={17} />
          </span>
          <div>
            <div className="text-[14px] font-semibold text-fg">Autentificare în doi pași (2FA)</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              Adaugă un strat suplimentar de securitate contului tău.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-fg-dim">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-fg-dim/70" />
            În dezvoltare
          </span>
          <button
            type="button"
            disabled
            title="Autentificarea în doi pași va fi disponibilă într-o versiune viitoare."
            className="cursor-not-allowed rounded-lg border border-line bg-card-2/60 px-3.5 py-2 text-[12.5px] font-semibold text-fg-dim"
          >
            Indisponibil
          </button>
        </div>
      </section>

      {/* Sessions table */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
              <Monitor size={15} />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-fg">Sesiuni active</div>
              <div className="mt-0.5 text-[11.5px] text-fg-muted">
                Vezi dispozitivele pe care ești autentificat și gestionează accesul.
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={otherCount === 0}
            onClick={revokeAll}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition-colors",
              otherCount === 0
                ? "cursor-not-allowed border-line bg-card-2 text-fg-dim"
                : "border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
            )}
          >
            <LogOut size={12} />
            Deconectează toate celelalte sesiuni
          </button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="border-b border-line/50">
              <tr>
                <TH>Dispozitiv</TH>
                <TH>Browser</TH>
                <TH>Locație</TH>
                <TH>Ultima activitate</TH>
                <TH>Status</TH>
                <TH className="text-right pr-6">Acțiuni</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {sessions.map((s) => {
                const DevIcon = deviceIcon(s.device);
                const BrIcon  = browserIcon(s.browser);
                return (
                  <tr key={s.id} className="text-[12.5px]">
                    <TD>
                      <div className="flex items-center gap-2 text-fg">
                        <DevIcon size={14} className="text-fg-dim" />
                        {s.device}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2 text-fg-muted">
                        <BrIcon size={14} className={cn("shrink-0", browserColor(s.browser))} />
                        {s.browser}
                      </div>
                    </TD>
                    <TD className="text-fg-muted">{s.location}</TD>
                    <TD className="font-mono text-fg-muted">{formatRelativeRo(s.lastActive)}</TD>
                    <TD>
                      {s.current ? (
                        <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                          Sesiunea curentă
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-line bg-card-2/60 px-2 py-0.5 text-[10.5px] font-semibold text-fg-dim">
                          Inactivă
                        </span>
                      )}
                    </TD>
                    <TD className="text-right pr-4">
                      {s.current ? (
                        <span className="text-fg-dim">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => revoke(s.id, `${s.device} · ${s.browser}`)}
                          className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                        >
                          Deconectează
                        </button>
                      )}
                    </TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Security history */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
              <Shield size={15} />
            </span>
            <div>
              <div className="text-[14px] font-semibold text-fg">Istoric securitate</div>
              <div className="mt-0.5 text-[11.5px] text-fg-muted">
                Ultimele acțiuni importante din contul tău.
              </div>
            </div>
          </div>
          <span className="rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[11.5px] font-medium text-fg-muted">
            Ultimele 30 zile
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="border-b border-line/50">
              <tr>
                <TH>Acțiune</TH>
                <TH>Dată</TH>
                <TH>IP</TH>
                <TH>Detalii</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {securityEvents.map((e) => (
                <tr key={e.id} className="text-[12.5px]">
                  <TD>
                    <div className="flex items-center gap-2 text-fg">
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                        <Key size={9} />
                      </span>
                      {SEC_LABEL[e.kind] ?? e.kind}
                    </div>
                  </TD>
                  <TD className="font-mono text-fg-muted">{formatShort(e.createdAt)}</TD>
                  <TD className="font-mono text-fg-muted">{e.ip}</TD>
                  <TD className="text-fg-muted">{e.details}</TD>
                </tr>
              ))}
              {securityEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-[12px] text-fg-muted">
                    Nicio activitate de securitate în perioada selectată.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dialogs */}
      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim",
        className,
      )}
    >
      {children}
    </th>
  );
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3 align-middle", className)}>{children}</td>;
}

function deviceIcon(device: string): LucideIcon {
  const d = device.toLowerCase();
  if (d.includes("iphone") || d.includes("android") || d.includes("smartphone")) return Smartphone;
  if (d.includes("mac"))     return Laptop;
  if (d.includes("windows")) return Monitor;
  return Monitor;
}
function browserIcon(browser: string): LucideIcon {
  void browser;
  return Globe;
}
function browserColor(browser: string): string {
  const b = browser.toLowerCase();
  if (b.includes("chrome"))  return "text-yellow-400";
  if (b.includes("safari"))  return "text-sky-400";
  if (b.includes("firefox")) return "text-orange-400";
  if (b.includes("edge"))    return "text-sky-300";
  return "text-fg-dim";
}
function formatShort(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"][d.getMonth()];
  const hh  = String(d.getHours()).padStart(2, "0");
  const mm  = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} ${d.getFullYear()}, ${hh}:${mm}`;
}
