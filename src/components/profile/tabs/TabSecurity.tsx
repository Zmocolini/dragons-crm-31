"use client";

import { KeyRound, Laptop, ShieldOff, LogOut } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";
import { ChangePasswordDialog } from "../dialogs/ChangePasswordDialog";

export function TabSecurity() {
  const [pwOpen, setPwOpen] = useState(false);
  const { profile, logActivity } = useProfile();
  const toast = useToast();

  const currentSession = {
    id: "current",
    device: typeof navigator !== "undefined" ? navigator.platform || "Browser" : "Browser",
    browser: typeof navigator !== "undefined" ? navigator.userAgent.split(") ")[0].split("(")[0].trim() || "Browser" : "Browser",
    location: profile.location || "Necunoscut",
    lastActive: "Acum",
    current: true,
  };

  function revokeOthers() {
    // TODO(real-users): apelează server action revokeOtherSessions().
    logActivity("session.revoke", "Deconectare sesiuni terțe (0)");
    toast.info("Nicio altă sesiune activă", "În versiunea demo doar sesiunea curentă e vizibilă.");
  }

  return (
    <div className="space-y-5">
      {/* Password */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Parolă</h3>
            <p className="text-[11.5px] text-fg-muted">Actualizează parola contului tău.</p>
          </div>
          <button
            type="button"
            onClick={() => setPwOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-violet-500"
          >
            <KeyRound size={12} />
            Schimbă parola
          </button>
        </header>
        <div className="px-5 py-4 text-[12.5px] text-fg-muted">
          Ultima schimbare: <span className="text-fg">necunoscută</span>. Recomandăm parole cu minim
          12 caractere, mix de litere/cifre/simboluri.
        </div>
      </section>

      {/* 2FA */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Autentificare în doi pași</h3>
            <p className="text-[11.5px] text-fg-muted">
              Un strat suplimentar de securitate la login.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
            Inactiv
          </span>
        </header>
        <div className="flex items-start gap-3 border-t border-line/50 bg-card-2/40 px-5 py-4 text-[12.5px] text-fg-muted">
          <ShieldOff size={16} className="mt-0.5 shrink-0 text-fg-dim" />
          <div className="flex-1">
            2FA nu este configurat încă pe backend. Această acțiune se va activa după integrarea
            provider-ului TOTP (Better-Auth + Google Authenticator / Authy).
          </div>
          <button
            type="button"
            disabled
            title="Autentificarea în doi pași nu este configurată încă."
            className="cursor-not-allowed rounded-lg border border-line bg-card-2/50 px-3 py-1.5 text-[12px] font-medium text-fg-dim"
          >
            Configurează
          </button>
        </div>
      </section>

      {/* Sessions */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Sesiuni active</h3>
            <p className="text-[11.5px] text-fg-muted">
              Dispozitivele conectate la contul tău.
            </p>
          </div>
          <button
            type="button"
            onClick={revokeOthers}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
          >
            <LogOut size={12} />
            Deconectează celelalte sesiuni
          </button>
        </header>
        <ul className="divide-y divide-line/50">
          <li className="flex items-center gap-4 px-5 py-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
              <Laptop size={16} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                {currentSession.device} · {currentSession.browser}
                <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Sesiune curentă
                </span>
              </div>
              <div className="mt-0.5 text-[11.5px] text-fg-dim">
                {currentSession.location} · {currentSession.lastActive}
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Nu poți deconecta sesiunea curentă din această pagină."
              className="cursor-not-allowed rounded-lg border border-line bg-card-2/40 px-3 py-1.5 text-[12px] font-medium text-fg-dim"
            >
              Curentă
            </button>
          </li>
        </ul>
      </section>

      <ChangePasswordDialog open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
