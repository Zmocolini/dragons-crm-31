"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { formatRelativeRo } from "../utils";
import { cn } from "@/lib/utils/cn";
import type { ActivityEventKind } from "@/lib/profile/types";

type RangeKey = "d7" | "d30" | "d90";
const RANGE_LABEL: Record<RangeKey, string> = {
  d7: "Ultimele 7 zile",
  d30: "Ultimele 30 zile",
  d90: "Ultimele 90 zile",
};
const RANGE_DAYS: Record<RangeKey, number> = { d7: 7, d30: 30, d90: 90 };

const KIND_LABEL: Record<ActivityEventKind, string> = {
  "profile.update":                    "Actualizare profil",
  "avatar.update":                     "Poză de profil",
  "password.change":                   "Schimbare parolă",
  "preferences.update":                "Preferințe",
  "notification_preferences.update":   "Notificări",
  "session.revoke":                    "Sesiune deconectată",
  "account.delete_requested":          "Ștergere cont",
  "tenant.switch":                     "Schimbare flotă",
  "login":                             "Autentificare",
  "logout":                            "Deconectare",
};

const KIND_TONE: Record<ActivityEventKind, string> = {
  "profile.update":                    "bg-sky-500/15 text-sky-300",
  "avatar.update":                     "bg-sky-500/15 text-sky-300",
  "password.change":                   "bg-amber-500/15 text-amber-300",
  "preferences.update":                "bg-violet-500/15 text-violet-300",
  "notification_preferences.update":   "bg-violet-500/15 text-violet-300",
  "session.revoke":                    "bg-rose-500/15 text-rose-300",
  "account.delete_requested":          "bg-rose-500/15 text-rose-300",
  "tenant.switch":                     "bg-emerald-500/15 text-emerald-300",
  "login":                             "bg-emerald-500/15 text-emerald-300",
  "logout":                            "bg-fg-dim/20 text-fg-muted",
};

export function TabActivity() {
  const { activity } = useProfile();
  const [range, setRange] = useState<RangeKey>("d30");

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return activity.filter((a) => new Date(a.createdAt).getTime() >= cutoff);
  }, [activity, range]);

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">Activitate cont</h3>
          <p className="text-[11.5px] text-fg-muted">
            Doar acțiunile propriului tău cont, fără date sensibile.
          </p>
        </div>
        <div className="inline-flex gap-1 rounded-xl border border-line bg-card-2/60 p-1">
          {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                r === range
                  ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-500/40"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </header>
      {filtered.length === 0 ? (
        <div className="p-10 text-center text-[12.5px] text-fg-muted">
          Nicio activitate înregistrată în perioada selectată.
        </div>
      ) : (
        <ul className="divide-y divide-line/40">
          {filtered.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 px-5 py-3.5">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase",
                  KIND_TONE[ev.kind],
                )}
              >
                {ev.module.charAt(0)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-semibold text-fg">
                  {KIND_LABEL[ev.kind]}
                </div>
                <div className="mt-0.5 text-[11.5px] text-fg-muted">
                  {ev.module}
                  {ev.details && <span className="text-fg-dim"> · {ev.details}</span>}
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-fg-dim">
                {formatRelativeRo(ev.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
