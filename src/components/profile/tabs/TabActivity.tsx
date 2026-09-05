"use client";

import {
  Calendar, ChevronLeft, ChevronRight, ChevronsUpDown, Filter,
  Monitor, Smartphone,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useProfile } from "@/lib/profile/context";
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
  "preferences.update":                "Modificare setări",
  "notification_preferences.update":   "Preferințe notificări",
  "session.revoke":                    "Sesiune deconectată",
  "account.delete_requested":          "Cerere ștergere cont",
  "tenant.switch":                     "Schimbare flotă",
  "login":                             "Autentificare reușită",
  "logout":                            "Deconectare",
  "report.view":                       "Vizualizare raport",
  "document.download":                 "Descărcare document",
  "candidate.create":                  "Creare candidat",
  "document.activate":                 "Activare document",
};

const KIND_DOT: Record<ActivityEventKind, string> = {
  "profile.update":                    "bg-violet-500",
  "avatar.update":                     "bg-violet-500",
  "password.change":                   "bg-amber-500",
  "preferences.update":                "bg-fuchsia-500",
  "notification_preferences.update":   "bg-fuchsia-500",
  "session.revoke":                    "bg-rose-500",
  "account.delete_requested":          "bg-rose-500",
  "tenant.switch":                     "bg-yellow-500",
  "login":                             "bg-emerald-500",
  "logout":                            "bg-rose-500",
  "report.view":                       "bg-sky-500",
  "document.download":                 "bg-orange-500",
  "candidate.create":                  "bg-purple-500",
  "document.activate":                 "bg-teal-500",
};

const MODULE_TONE: Record<string, string> = {
  "Autentificare": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Rapoarte":      "border-sky-500/30 bg-sky-500/10 text-sky-300",
  "Profil":        "border-violet-500/30 bg-violet-500/10 text-violet-300",
  "Flotă":         "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "Documente":     "border-orange-500/30 bg-orange-500/10 text-orange-300",
  "Preferințe":    "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
  "Securitate":    "border-rose-500/30 bg-rose-500/10 text-rose-300",
  "Notificări":    "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  "Candidați":     "border-purple-500/30 bg-purple-500/10 text-purple-300",
  "Cont":          "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const PAGE_SIZE = 10;

export function TabActivity() {
  const { activity } = useProfile();
  const [range, setRange]           = useState<RangeKey>("d30");
  const [kindFilter, setKindFilter] = useState<"all" | ActivityEventKind>("all");
  const [page, setPage]             = useState(1);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return activity.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      if (t < cutoff) return false;
      if (kindFilter !== "all" && a.kind !== kindFilter) return false;
      return true;
    });
  }, [activity, range, kindFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">Activitate cont</h3>
          <p className="text-[11.5px] text-fg-muted">
            Vezi istoricul acțiunilor importante din contul tău.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectPill
            icon={<Calendar size={12} />}
            value={range}
            onChange={(v) => { setRange(v as RangeKey); setPage(1); }}
            options={(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
          />
          <SelectPill
            icon={<Filter size={12} />}
            value={kindFilter}
            onChange={(v) => { setKindFilter(v as "all" | ActivityEventKind); setPage(1); }}
            options={[
              { value: "all", label: "Toate acțiunile" },
              ...(Object.keys(KIND_LABEL) as ActivityEventKind[]).map((k) => ({
                value: k, label: KIND_LABEL[k],
              })),
            ]}
          />
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse">
          <thead className="border-b border-line/50">
            <tr>
              <TH className="w-[52px]">#</TH>
              <TH>Acțiune</TH>
              <TH className="w-[140px]">Modul</TH>
              <TH className="w-[170px]">Dată și oră</TH>
              <TH className="w-[130px]">IP</TH>
              <TH className="w-[180px]">Dispozitiv</TH>
              <TH>Detalii</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {pageRows.map((ev, i) => {
              const DeviceIcon = /iphone|android|smartphone/i.test(ev.device ?? "")
                ? Smartphone
                : Monitor;
              return (
                <tr key={ev.id} className="text-[12.5px]">
                  <TD className="font-mono text-fg-dim">{start + i + 1}</TD>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className={cn("h-2 w-2 rounded-full", KIND_DOT[ev.kind])} />
                      <span className="text-fg">{KIND_LABEL[ev.kind]}</span>
                    </div>
                  </TD>
                  <TD>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold",
                        MODULE_TONE[ev.module] ?? "border-line bg-card-2 text-fg-muted",
                      )}
                    >
                      {ev.module}
                    </span>
                  </TD>
                  <TD className="font-mono text-fg-muted">{formatShort(ev.createdAt)}</TD>
                  <TD className="font-mono text-fg-muted">{ev.ip ?? "—"}</TD>
                  <TD>
                    <div className="flex items-center gap-2 text-fg-muted">
                      <DeviceIcon size={13} className="text-fg-dim" />
                      {ev.device ?? "—"}
                    </div>
                  </TD>
                  <TD className="text-fg-muted">{ev.details ?? "—"}</TD>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[12.5px] text-fg-muted">
                  Nicio activitate înregistrată în perioada selectată.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 px-5 py-3">
        <div className="text-[11.5px] text-fg-muted">
          Afișez {filtered.length === 0 ? 0 : start + 1} - {Math.min(start + PAGE_SIZE, filtered.length)} din{" "}
          <span className="text-fg">{filtered.length}</span> rezultate
        </div>
        <div className="flex items-center gap-1">
          <PageBtn
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria="Pagina anterioară"
          >
            <ChevronLeft size={13} />
          </PageBtn>
          {pageNumbers(currentPage, totalPages).map((n, idx) =>
            n === "…" ? (
              <span key={`e${idx}`} className="px-2 text-[12px] text-fg-dim">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === currentPage ? "page" : undefined}
                className={cn(
                  "h-7 min-w-7 rounded-md px-2 text-[12px] font-semibold transition-colors",
                  n === currentPage
                    ? "bg-violet-600 text-white"
                    : "border border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
                )}
              >
                {n}
              </button>
            ),
          )}
          <PageBtn
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria="Pagina următoare"
          >
            <ChevronRight size={13} />
          </PageBtn>
        </div>
      </footer>
    </section>
  );
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const arr = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) out.push("…");
    out.push(arr[i]);
  }
  return out;
}

function SelectPill({
  icon,
  value,
  onChange,
  options,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative inline-flex items-center rounded-lg border border-line bg-card-2 text-[11.5px] text-fg-muted">
      <span className="pointer-events-none absolute left-2.5 text-fg-dim">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none bg-transparent pl-7 pr-7 text-[11.5px] font-medium text-fg focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronsUpDown size={11} className="pointer-events-none absolute right-2 text-fg-dim" />
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  children,
  aria,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  aria: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border",
        disabled
          ? "cursor-not-allowed border-line bg-card-2 text-fg-dim"
          : "border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
      )}
    >
      {children}
    </button>
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
function formatShort(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(1, "0");
  const mon = ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"][d.getMonth()];
  const hh  = String(d.getHours()).padStart(2, "0");
  const mm  = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${mon} ${d.getFullYear()}, ${hh}:${mm}`;
}
