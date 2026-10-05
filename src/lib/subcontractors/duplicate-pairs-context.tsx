"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { useCouriers } from "@/lib/couriers/context";
import { areNamesEquivalent, detectCourierDuplicates, type DuplicateSuggestion } from "@/lib/utils/name-matching";
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
  detectedSuggestions: DuplicateSuggestion[];
  acceptSuggestion: (s: DuplicateSuggestion) => void;
  acceptAllSuggestions: () => void;
  /** Rezolvă un curier după nume → grup dinamic (sau null). */
  groupFor: (name: string) => DuplicateGroup | null;
  /** Opțiunile pentru perechea unei anumite plăți/curier (după nume). */
  pairOptionsFor: (name: string) => PairOptions | null;
};

const DuplicatePairsContext = createContext<Ctx | null>(null);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

function pickPlatform(courier: { boltUid?: string | null; platforms?: DuplicateAlias["platform"][] }): DuplicateAlias["platform"] {
  if (courier.platforms && courier.platforms.length > 0) {
    return courier.platforms[0];
  }
  return courier.boltUid ? "bolt" : "glovo";
}

export const KNOWN_ALIAS_PAIRS: Array<{
  nameA: string;
  platformA: DuplicateAlias["platform"];
  nameB: string;
  platformB: DuplicateAlias["platform"];
  feeOnce?: number;
  commissionPct?: number;
}> = [
  { nameA: "Ahtasham Haider", platformA: "bolt", nameB: "Magar Thapa", platformB: "glovo", feeOnce: 210, commissionPct: 10 },
  { nameA: "Ahtasham Haide",  platformA: "bolt", nameB: "Magar Thapa", platformB: "glovo", feeOnce: 210, commissionPct: 10 },
];

export function DuplicatePairsProvider({ children }: { children: ReactNode }) {
  const [pairs, setPairs] = useState<DynamicDuplicatePair[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { allRows, updateCourier } = useCouriers();

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
    // Propagă comisionul + taxa și în profilul curierilor.
    const patch: Record<string, unknown> = {};
    if (opts.commissionPct !== null && opts.commissionPct !== undefined) patch.commissionPct = opts.commissionPct;
    if (opts.feeOnce !== null && opts.feeOnce !== undefined) patch.weeklyContractFeeRon = opts.feeOnce;
    if (Object.keys(patch).length > 0) {
      updateCourier(aId, patch);
      updateCourier(bId, patch);
    }
  }, [updateCourier]);

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
    // Propagă comisionul + taxa în profilul CURIERILOR (vizibil la /curieri/[id] → Editează).
    const patch: Record<string, unknown> = {};
    if (opts.commissionPct !== undefined && opts.commissionPct !== null) patch.commissionPct = opts.commissionPct;
    if (opts.feeOnce !== undefined && opts.feeOnce !== null) patch.weeklyContractFeeRon = opts.feeOnce;
    if (Object.keys(patch).length > 0) {
      updateCourier(aId, patch);
      updateCourier(bId, patch);
    }
  }, [updateCourier]);

  // Construiesc grupurile dinamice + index pe nume → (grup, opțiuni).
  const { nameToGroup, nameToOpts } = useMemo(() => {
    const nameToGroup = new Map<string, DuplicateGroup>();
    const nameToOpts = new Map<string, PairOptions>();

    // 1. Perechi manuale salvate de utilizator (au prioritate absolută)
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

    // 2. Perechi cunoscute din cerințele operaționale (ex: Ahtasham Haider Bolt ↔ Magar Thapa Glovo)
    for (const kp of KNOWN_ALIAS_PAIRS) {
      const normA = normalize(kp.nameA);
      const normB = normalize(kp.nameB);
      if (!nameToGroup.has(normA) || !nameToGroup.has(normB)) {
        const group: DuplicateGroup = {
          personId: kp.nameA,
          aliases: [
            { name: kp.nameA, platform: kp.platformA },
            { name: kp.nameB, platform: kp.platformB },
          ],
        };
        const opts: PairOptions = { feeOnce: kp.feeOnce ?? 210, commissionPct: kp.commissionPct ?? 10 };
        if (!nameToGroup.has(normA)) { nameToGroup.set(normA, group); nameToOpts.set(normA, opts); }
        if (!nameToGroup.has(normB)) { nameToGroup.set(normB, group); nameToOpts.set(normB, opts); }
      }
    }

    // 3. Curieri cu același nume (sau nume inversat) între platforme diferite din allRows
    for (let i = 0; i < allRows.length; i++) {
      const cA = allRows[i];
      for (let j = i + 1; j < allRows.length; j++) {
        const cB = allRows[j];
        if (cA.id === cB.id) continue;
        if (areNamesEquivalent(cA.fullName, cB.fullName)) {
          const platA = pickPlatform(cA);
          const platB = pickPlatform(cB);
          const normA = normalize(cA.fullName);
          const normB = normalize(cB.fullName);
          if (!nameToGroup.has(normA) && !nameToGroup.has(normB)) {
            const aliases: DuplicateAlias[] = [
              { name: cA.fullName, platform: platA },
              { name: cB.fullName, platform: platB },
            ];
            const group: DuplicateGroup = { personId: cA.fullName, aliases };
            const opts: PairOptions = {
              feeOnce: cA.weeklyContractFeeRon ?? cB.weeklyContractFeeRon ?? 210,
              commissionPct: cA.commissionPct ?? cB.commissionPct ?? null,
            };
            nameToGroup.set(normA, group);
            nameToGroup.set(normB, group);
            nameToOpts.set(normA, opts);
            nameToOpts.set(normB, opts);
          }
        }
      }
    }

    // 4. Curieri unici care au salvate direct multiple platforme în profil (ex: ['bolt', 'glovo'])
    for (const c of allRows) {
      if (c.platforms && c.platforms.length > 1) {
        const norm = normalize(c.fullName);
        if (!nameToGroup.has(norm)) {
          const group: DuplicateGroup = {
            personId: c.fullName,
            aliases: c.platforms.map((pl) => ({ name: c.fullName, platform: pl })),
          };
          const opts: PairOptions = {
            feeOnce: c.weeklyContractFeeRon ?? 210,
            commissionPct: c.commissionPct ?? null,
          };
          nameToGroup.set(norm, group);
          nameToOpts.set(norm, opts);
        }
      }
    }

    return { nameToGroup, nameToOpts };
  }, [pairs, allRows]);

  const groupFor = useCallback((name: string): DuplicateGroup | null => {
    if (!name) return null;
    const direct = nameToGroup.get(normalize(name));
    if (direct) return direct;
    for (const [keyName, group] of nameToGroup.entries()) {
      if (areNamesEquivalent(name, keyName)) return group;
    }
    return null;
  }, [nameToGroup]);

  const pairOptionsFor = useCallback((name: string): PairOptions | null => {
    if (!name) return null;
    const direct = nameToOpts.get(normalize(name));
    if (direct) return direct;
    for (const [keyName, opts] of nameToOpts.entries()) {
      if (areNamesEquivalent(name, keyName)) return opts;
    }
    return null;
  }, [nameToOpts]);

  // Sugestii detectate automat pentru curieri cu conturi duplicate
  const existingPairIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of pairs) {
      set.add(`${p.aId}__${p.bId}`);
      set.add(`${p.bId}__${p.aId}`);
    }
    return set;
  }, [pairs]);

  const detectedSuggestions = useMemo(() => {
    return detectCourierDuplicates(allRows, existingPairIds);
  }, [allRows, existingPairIds]);

  const acceptSuggestion = useCallback((s: DuplicateSuggestion) => {
    const fee = s.courierA.weeklyContractFeeRon ?? s.courierB.weeklyContractFeeRon ?? 210;
    const comm = s.courierA.commissionPct ?? s.courierB.commissionPct ?? 10;
    addPair(s.courierA.id, s.courierB.id, { feeOnce: fee, commissionPct: comm });
  }, [addPair]);

  const acceptAllSuggestions = useCallback(() => {
    for (const s of detectedSuggestions) {
      const fee = s.courierA.weeklyContractFeeRon ?? s.courierB.weeklyContractFeeRon ?? 210;
      const comm = s.courierA.commissionPct ?? s.courierB.commissionPct ?? 10;
      addPair(s.courierA.id, s.courierB.id, { feeOnce: fee, commissionPct: comm });
    }
  }, [detectedSuggestions, addPair]);

  const value = useMemo<Ctx>(
    () => ({
      pairs,
      addPair,
      removePair,
      updatePair,
      detectedSuggestions,
      acceptSuggestion,
      acceptAllSuggestions,
      groupFor,
      pairOptionsFor,
    }),
    [
      pairs,
      addPair,
      removePair,
      updatePair,
      detectedSuggestions,
      acceptSuggestion,
      acceptAllSuggestions,
      groupFor,
      pairOptionsFor,
    ],
  );
  return <DuplicatePairsContext.Provider value={value}>{children}</DuplicatePairsContext.Provider>;
}

export function useDuplicatePairs(): Ctx {
  const ctx = useContext(DuplicatePairsContext);
  if (!ctx) throw new Error("useDuplicatePairs trebuie folosit în interiorul DuplicatePairsProvider");
  return ctx;
}
