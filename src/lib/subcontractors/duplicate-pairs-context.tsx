"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useCouriers } from "@/lib/couriers/context";
import type { DuplicateGroup, DuplicateAlias } from "./duplicate-accounts";

// TODO(real-users): mută în tabel `duplicate_courier_pairs` cu (courier_a_id, courier_b_id, tenant_id, unify_fee, unify_commission).

const STORAGE_KEY = "crm31-duplicate-pairs";

/** O pereche adăugată din UI — 2 curieri identificați după ID din CRM + opțiuni de unificare. */
export type DynamicDuplicatePair = {
  aId: string;
  bId: string;
  /** Taxa săptămânală (RON) aplicată o singură dată pe pereche. `null` = nu unifica. */
  feeOnce: number | null;
  /** Procentul de comision aplicat o singură dată pe totalul brut agregat. `null` = nu unifica. */
  commissionPct: number | null;
};

export type PairOptions = { feeOnce: number | null; commissionPct: number | null };

type Ctx = {
  pairs: DynamicDuplicatePair[];
  addPair: (aId: string, bId: string, opts: PairOptions) => void;
  removePair: (aId: string, bId: string) => void;
  updatePair: (aId: string, bId: string, opts: Partial<PairOptions>) => void;
  /** Rezolvă un curier după nume → grup dinamic (sau null). */
  groupFor: (name: string) => DuplicateGroup | null;
  /** Opțiunile pentru perechea unei anumite plăți/curier (după nume). */
  pairOptionsFor: (name: string) => PairOptions | null;
};

const DuplicatePairsContext = createContext<Ctx | null>(null);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

function pickPlatform(courier: { boltUid?: string | null }): DuplicateAlias["platform"] {
  return courier.boltUid ? "bolt" : "wolt";
}

export function DuplicatePairsProvider({ children }: { children: ReactNode }) {
  const [pairs, setPairs] = useState<DynamicDuplicatePair[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { allRows } = useCouriers();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Perechi salvate anterior pot avea forma veche cu bool-uri; convertesc la valori concrete.
        const parsed = JSON.parse(raw) as Array<
          Partial<DynamicDuplicatePair> & { unifyFee?: boolean; unifyCommission?: boolean }
        >;
        setPairs(parsed.map((p) => ({
          aId: p.aId ?? "",
          bId: p.bId ?? "",
          feeOnce: p.feeOnce !== undefined
            ? p.feeOnce
            : (p.unifyFee ? 210 : null),
          commissionPct: p.commissionPct !== undefined
            ? p.commissionPct
            : (p.unifyCommission ? 10 : null),
        })).filter((p) => p.aId && p.bId));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs)); } catch {}
  }, [pairs, hydrated]);

  const addPair = useCallback((aId: string, bId: string, opts: PairOptions) => {
    if (!aId || !bId || aId === bId) return;
    setPairs((prev) => {
      if (prev.some((p) => (p.aId === aId && p.bId === bId) || (p.aId === bId && p.bId === aId))) return prev;
      return [...prev, { aId, bId, feeOnce: opts.feeOnce, commissionPct: opts.commissionPct }];
    });
  }, []);

  const removePair = useCallback((aId: string, bId: string) => {
    setPairs((prev) => prev.filter((p) =>
      !((p.aId === aId && p.bId === bId) || (p.aId === bId && p.bId === aId)),
    ));
  }, []);

  const updatePair = useCallback((aId: string, bId: string, opts: Partial<PairOptions>) => {
    setPairs((prev) => prev.map((p) => {
      const match = (p.aId === aId && p.bId === bId) || (p.aId === bId && p.bId === aId);
      return match ? { ...p, ...opts } : p;
    }));
  }, []);

  // Construiesc grupurile dinamice + index pe nume → (grup, opțiuni).
  const { nameToGroup, nameToOpts } = useMemo(() => {
    const nameToGroup = new Map<string, DuplicateGroup>();
    const nameToOpts = new Map<string, PairOptions>();
    for (const p of pairs) {
      const a = allRows.find((c) => c.id === p.aId);
      const b = allRows.find((c) => c.id === p.bId);
      if (!a || !b) continue;
      const aliases: DuplicateAlias[] = [
        { name: a.fullName, platform: pickPlatform(a) },
        { name: b.fullName, platform: pickPlatform(b) },
      ];
      const group: DuplicateGroup = { personId: a.fullName, aliases };
      const opts: PairOptions = { feeOnce: p.feeOnce, commissionPct: p.commissionPct };
      for (const al of aliases) {
        nameToGroup.set(normalize(al.name), group);
        nameToOpts.set(normalize(al.name), opts);
      }
    }
    return { nameToGroup, nameToOpts };
  }, [pairs, allRows]);

  const groupFor = useCallback((name: string): DuplicateGroup | null => {
    if (!name) return null;
    return nameToGroup.get(normalize(name)) ?? null;
  }, [nameToGroup]);

  const pairOptionsFor = useCallback((name: string): PairOptions | null => {
    if (!name) return null;
    return nameToOpts.get(normalize(name)) ?? null;
  }, [nameToOpts]);

  const value = useMemo<Ctx>(
    () => ({ pairs, addPair, removePair, updatePair, groupFor, pairOptionsFor }),
    [pairs, addPair, removePair, updatePair, groupFor, pairOptionsFor],
  );
  return <DuplicatePairsContext.Provider value={value}>{children}</DuplicatePairsContext.Provider>;
}

export function useDuplicatePairs(): Ctx {
  const ctx = useContext(DuplicatePairsContext);
  if (!ctx) throw new Error("useDuplicatePairs trebuie folosit în interiorul DuplicatePairsProvider");
  return ctx;
}
