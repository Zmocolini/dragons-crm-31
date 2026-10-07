"use client";

import { useMemo, useState } from "react";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import { buildTeams, type ClassifyInput, type Team, type TeamId } from "@/lib/couriers/team-status";
import { courierOwner, type AccountInfo } from "@/lib/couriers/use-account-directory";
import { useDocuments } from "@/lib/documents/context";
import type { CrmDocument } from "@/lib/documents/types";
import { usePayments } from "@/lib/payments/context";
import type { Payment } from "@/lib/payments/types";

function indexBy<T>(items: T[], keyOf: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = keyOf(it);
    const list = m.get(k);
    if (list) list.push(it); else m.set(k, [it]);
  }
  return m;
}

/**
 * Echipele (subcontractori + intern) cu găleți eroare / de activat / așteaptă / ok / inactiv.
 * O singură sursă pentru vederea „Pe echipe" și pentru unealta AI `team_overview`.
 * `null` = Global Owner care încă așteaptă harta de conturi (fără ea toți ar părea „Intern").
 */
export function useTeams(
  rows: CourierRow[],
  opts: { accounts: Map<string, AccountInfo>; isGlobalOwner: boolean; showEmptyTeams: boolean; meName: string },
): Team[] | null {
  const { documents } = useDocuments();
  const { fleetPayments } = usePayments();
  const [todayMs] = useState(() => Date.now());
  const { accounts, isGlobalOwner, showEmptyTeams, meName } = opts;

  const teams = useMemo<Team[]>(() => {
    const docsBy = indexBy<CrmDocument>(documents, (d) => d.subject.id);
    const paysBy = indexBy<Payment>(fleetPayments.filter((p) => p.recipient.kind === "courier"), (p) => p.recipient.id);
    const inputOf = (r: CourierRow): ClassifyInput => ({ docs: docsBy.get(r.id) ?? [], payments: paysBy.get(r.id) ?? [], todayMs });

    // Doar Global Owner primește harta de conturi; subcontractorul își vede o singură echipă.
    const teamOf = (r: CourierRow): TeamId => {
      if (!isGlobalOwner) return { key: "me", label: meName, kind: "subcontractor" };
      const o = courierOwner(r, accounts);
      return { key: o.kind === "internal" ? "intern" : `sub:${o.label}`, label: o.label, kind: o.kind };
    };
    const extra: TeamId[] = isGlobalOwner && showEmptyTeams
      ? [...accounts.values()]
          .filter((a) => a.role === "subcontractor_owner" && a.active !== false)
          .map((a) => ({ key: `sub:${a.name}`, label: a.name, kind: "subcontractor" as const }))
      : [];
    return buildTeams(rows, teamOf, inputOf, extra);
  }, [rows, documents, fleetPayments, accounts, isGlobalOwner, showEmptyTeams, meName, todayMs]);

  return isGlobalOwner && accounts.size === 0 ? null : teams;
}
