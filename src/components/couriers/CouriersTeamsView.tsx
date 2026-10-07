"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/dashboard/Avatar";
import { Card, CardBody } from "@/components/ui/Card";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import {
  buildTeams, TEAM_BUCKET_LABEL, TEAM_BUCKETS,
  type ClassifyInput, type Team, type TeamBucket, type TeamId,
} from "@/lib/couriers/team-status";
import { courierOwner, type AccountInfo } from "@/lib/couriers/use-account-directory";
import { useDocuments } from "@/lib/documents/context";
import type { CrmDocument } from "@/lib/documents/types";
import { usePayments } from "@/lib/payments/context";
import type { Payment } from "@/lib/payments/types";
import { cn } from "@/lib/utils/cn";

const TONE: Record<TeamBucket, { chip: string; bar: string; text: string }> = {
  error:       { chip: "border-rose-500/40 bg-rose-500/10",       bar: "bg-rose-500",    text: "text-rose-300" },
  to_activate: { chip: "border-sky-500/40 bg-sky-500/10",         bar: "bg-sky-500",     text: "text-sky-300" },
  pending:     { chip: "border-amber-500/40 bg-amber-500/10",     bar: "bg-amber-400",   text: "text-amber-200" },
  ok:          { chip: "border-emerald-500/30 bg-emerald-500/10", bar: "bg-emerald-500", text: "text-emerald-300" },
  inactive:    { chip: "border-line bg-white/[0.04]",             bar: "bg-white/20",    text: "text-fg-muted" },
};

type Focus = TeamBucket | "all";

type Props = {
  /** Curierii flotei active, deja filtrați pe rol/scope de CouriersProvider. */
  rows: CourierRow[];
  accounts: Map<string, AccountInfo>;
  isGlobalOwner: boolean;
  /** Fără scope pe un subcontractor: arată și echipele fără curieri încă. */
  showEmptyTeams: boolean;
  meName: string;
};

function indexBy<T>(items: T[], keyOf: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    const list = m.get(k);
    if (list) list.push(it); else m.set(k, [it]);
  }
  return m;
}

export function CouriersTeamsView({ rows, accounts, isGlobalOwner, showEmptyTeams, meName }: Props) {
  const { documents } = useDocuments();
  const { fleetPayments } = usePayments();
  const [focus, setFocus] = useState<Focus>("all");
  const [open, setOpen] = useState<{ team: string; bucket: TeamBucket } | null>(null);
  const [todayMs] = useState(() => Date.now());

  const teams = useMemo<Team[]>(() => {
    const docsBy = indexBy<CrmDocument>(documents, (d) => d.subject.id);
    const paysBy = indexBy<Payment>(fleetPayments.filter((p) => p.recipient.kind === "courier"), (p) => p.recipient.id);
    const inputOf = (r: CourierRow): ClassifyInput => ({ docs: docsBy.get(r.id) ?? [], payments: paysBy.get(r.id) ?? [], todayMs });

    // Doar Global Owner primește harta de conturi; subcontractorul își vede o singură echipă.
    const grouped = isGlobalOwner;
    const teamOf = (r: CourierRow): TeamId => {
      if (!grouped) return { key: "me", label: meName, kind: "subcontractor" };
      const o = courierOwner(r, accounts);
      return { key: o.kind === "internal" ? "intern" : `sub:${o.label}`, label: o.label, kind: o.kind };
    };
    const extra: TeamId[] = grouped && showEmptyTeams
      ? [...accounts.values()]
          .filter((a) => a.role === "subcontractor_owner" && a.active !== false)
          .map((a) => ({ key: `sub:${a.name}`, label: a.name, kind: "subcontractor" as const }))
      : [];
    return buildTeams(rows, teamOf, inputOf, extra);
  }, [rows, documents, fleetPayments, accounts, isGlobalOwner, showEmptyTeams, meName, todayMs]);

  if (isGlobalOwner && accounts.size === 0) {
    return <div className="rounded-lg border border-dashed border-line/40 p-8 text-center text-[13px] text-fg-dim">Se încarcă echipele...</div>;
  }

  const totals = TEAM_BUCKETS.reduce((acc, b) => ({ ...acc, [b]: teams.reduce((n, t) => n + t.counts[b], 0) }), {} as Record<TeamBucket, number>);
  const shown = focus === "all" ? teams : teams.filter((t) => t.counts[focus] > 0);

  return (
    <div className="space-y-4">
      <div aria-label="Filtrează echipele" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["error", "to_activate", "pending", "ok"] as TeamBucket[]).map((b) => {
          const on = focus === b;
          return (
            <button
              key={b}
              type="button"

              aria-pressed={on}
              onClick={() => { setFocus(on ? "all" : b); setOpen(null); }}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                on ? TONE[b].chip : "border-line bg-card hover:bg-card-hover",
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">{TEAM_BUCKET_LABEL[b]}</div>
              <div className={cn("mt-0.5 text-[24px] font-bold tabular-nums", TONE[b].text)}>{totals[b]}</div>
              <div className="text-[11px] text-fg-dim">
                {on ? "Click pentru toate echipele" : "Click: doar echipele cu așa ceva"}
              </div>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line/40 p-8 text-center text-[13px] text-fg-dim">
          Nicio echipă nu are curieri în această categorie.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((t) => (
            <TeamCard
              key={t.key}
              team={t}
              openBucket={open?.team === t.key ? open.bucket : null}
              onToggle={(b) => setOpen(open?.team === t.key && open.bucket === b ? null : { team: t.key, bucket: b })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, openBucket, onToggle }: { team: Team; openBucket: TeamBucket | null; onToggle: (b: TeamBucket) => void }) {
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar name={team.label} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-bold text-fg">{team.label}</div>
            <div className="text-[11.5px] text-fg-dim">
              {team.kind === "internal" ? "Echipa internă" : "Subcontractor"} · {team.total} {team.total === 1 ? "curier" : "curieri"}
            </div>
          </div>
        </div>

        {team.total === 0 ? (
          <div className="rounded-lg border border-dashed border-line/40 p-3 text-center text-[12px] text-fg-dim">Încă niciun curier în această echipă.</div>
        ) : (
          <>
            <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
              {TEAM_BUCKETS.map((b) => team.counts[b] > 0 && (
                <div key={b} className={TONE[b].bar} style={{ width: `${(team.counts[b] / team.total) * 100}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEAM_BUCKETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  disabled={team.counts[b] === 0}
                  aria-expanded={openBucket === b}
                  onClick={() => onToggle(b)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors disabled:cursor-default disabled:opacity-40",
                    openBucket === b ? TONE[b].chip : "border-line bg-card hover:bg-card-hover",
                  )}
                >
                  <span className={cn("tabular-nums", TONE[b].text)}>{team.counts[b]}</span>
                  <span className="text-fg-muted">{TEAM_BUCKET_LABEL[b]}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {openBucket && (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {team.members[openBucket].map(({ row, reasons }) => (
              <li key={row.id} className="rounded-lg border border-line bg-card p-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/curieri/${row.id}`} className="text-[13px] font-semibold text-fg hover:text-violet-300 hover:underline">
                    {row.fullName}
                  </Link>
                  <span className="text-[11.5px] text-fg-dim">{row.city || "—"}</span>
                  <span className="flex items-center gap-1">
                    {row.platforms.map((p) => <PlatformLogo key={p} platform={p} size={16} rounded="md" />)}
                  </span>
                </div>
                {reasons.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {reasons.map((r) => (
                      <span key={r} className={cn("rounded-md border px-1.5 py-0.5 text-[11px]", TONE[openBucket].chip, TONE[openBucket].text)}>{r}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
