"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, FileText, LifeBuoy, Wallet } from "lucide-react";
import { useSession } from "@/lib/rbac/session";
import { useProfile } from "@/lib/profile/context";
import { useCouriers } from "@/lib/couriers/context";
import { usePayments } from "@/lib/payments/context";
import { useDocuments } from "@/lib/documents/context";
import { UNPAID_STATUSES } from "@/lib/payments/types";
import { buildTickets } from "@/lib/issues/data";
import { cn } from "@/lib/utils/cn";

type Notif = {
  id: string;
  icon: typeof Bell;
  title: string;
  body: string;
  href: string;
  tone: string;
  bgTone: string;
  when: string;
};

/**
 * Clopoțel notificări REAL: count-ul și lista sunt derivate din date (documente care
 * expiră, tichete deschise, plăți neplătite) — NU hardcodat. Fiecare item are deep-link
 * către ruta corespunzătoare (Etapa 22). TODO(real-users): tabel `notifications` cu read/unread.
 */
export function NotificationBell() {
  const { activeFleetId } = useSession();
  const { profile } = useProfile();
  const { allRows } = useCouriers();
  const { fleetPayments } = usePayments();
  const { fleetDocuments } = useDocuments();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  const notifs = useMemo<Notif[]>(() => {
    const out: Notif[] = [];
    const prefs = profile.notifications;
    const now = Date.now();

    if (prefs.documents_expired?.in_app) {
      const expiring = fleetDocuments.filter((d) => d.expiryIso && (() => { const dd = (new Date(d.expiryIso).getTime() - now) / 86400000; return dd >= 0 && dd <= 30; })()).length;
      if (expiring > 0) out.push({
        id: "docs",
        icon: FileText,
        title: `${expiring} documente expiră în curând`,
        body: "În următoarele 30 de zile. Vezi lista și reînnoiește-le înainte să expire.",
        href: "/documente?tab=expiring",
        tone: "text-amber-300",
        bgTone: "bg-amber-500/15 border-amber-500/30",
        when: "Astăzi",
      });
    }

    if (prefs.payments?.in_app) {
      const unpaid = new Set(fleetPayments.filter((p) => UNPAID_STATUSES.includes(p.status)).map((p) => p.recipient.id)).size;
      if (unpaid > 0) out.push({
        id: "pay",
        icon: Wallet,
        title: `${unpaid} curieri neplătiți`,
        body: "Procesează plățile săptămânii. Deschide fluxul de plăți pentru a confirma toate transferurile.",
        href: "/plati",
        tone: "text-rose-300",
        bgTone: "bg-rose-500/15 border-rose-500/30",
        when: "Săptămâna curentă",
      });
    }

    if (prefs.issues_urgent?.in_app) {
      const fleetCouriers = allRows.filter((c) => c.tenantId === activeFleetId);
      const openTickets = buildTickets(fleetCouriers).filter((t) => t.status === "open" || t.status === "in_progress").length;
      if (openTickets > 0) out.push({
        id: "issues",
        icon: LifeBuoy,
        title: `${openTickets} tichete deschise`,
        body: "Curieri care așteaptă răspuns. Deschide secțiunea Suport pentru a rezolva.",
        href: "/probleme",
        tone: "text-sky-300",
        bgTone: "bg-sky-500/15 border-sky-500/30",
        when: "Acum",
      });
    }

    return out;
  }, [fleetDocuments, fleetPayments, allRows, activeFleetId, profile.notifications]);

  const count = notifs.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${count} notificări`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
      >
        <Bell size={17} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-app">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/50",
            // Telefon: panou pe toată lățimea, sub header (clopoțelul nu e la marginea ecranului).
            "fixed inset-x-3 top-[calc(4rem+env(safe-area-inset-top)+0.5rem)] z-50",
            // Desktop: dropdown ancorat de clopoțel.
            "sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:z-40 sm:mt-2 sm:w-[420px]",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line/70 bg-gradient-to-r from-violet-500/[0.08] via-indigo-500/[0.05] to-transparent px-4 py-3">
            <div>
              <div className="text-[14px] font-bold text-fg">Notificări</div>
              <div className="text-[11px] text-fg-muted">
                {count === 0 ? "Ești la zi cu toate" : `${count} ${count === 1 ? "anunț nou" : "anunțuri noi"}`}
              </div>
            </div>
            {count > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Bell size={22} />
              </span>
              <div className="text-[13px] font-semibold text-fg">Totul e sub control</div>
              <div className="text-[11.5px] text-fg-muted">Nicio notificare nouă în acest moment.</div>
            </div>
          ) : (
            <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain p-2 sm:max-h-[70vh]">
              {notifs.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    role="menuitem"
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-colors hover:brightness-110",
                      n.bgTone,
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/30", n.tone)}>
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[14px] font-bold leading-tight", n.tone)}>{n.title}</span>
                      <span className="mt-1 block text-[12px] leading-snug text-fg/90">{n.body}</span>
                      <span className="mt-1.5 block text-[10.5px] font-medium uppercase tracking-widest text-fg-dim">{n.when}</span>
                    </span>
                  </Link>
                );
              })}
              <div className="mt-1 border-t border-line/50" />
              <Link
                href="/setari?tab=notificari"
                onClick={() => setOpen(false)}
                className="mt-1 flex items-center justify-center rounded-lg py-2 text-[11.5px] font-medium text-violet-300 hover:bg-white/[0.03] hover:text-violet-200"
              >
                Setări notificări →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
