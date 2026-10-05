"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Calendar, Check, CheckCircle2, ClipboardPaste, FileSpreadsheet, Info, Loader2, Search, Upload, UserPlus, Wand2 } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { usePayments } from "@/lib/payments/context";
import {
  getWeekInterval,
  getPreviousWeekInterval,
  formatWeekRange,
  getRecentWoltCycles,
  type WeekInterval,
  type WoltCycle,
} from "@/lib/payments/periods";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { IncompleteFieldKey } from "@/lib/couriers/types";
import { EMPTY_BREAKDOWN, PAYMENT_SOURCE_DETAIL_LABEL, paymentSourceDetail, type Payment, type PaymentSourceDetail } from "@/lib/payments/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import {
  PARSERS, autoDetect, autoDetectText, computeImportRowMath, defaultCommissionFor, defaultWeeklyFeeFor, getParser,
  getSavedCourierRate, saveCourierRate, saveBatchCourierRates,
  type ParserKey, type PlatformImportRow, type PlatformParser,
} from "@/lib/payments/imports";
import { subcontractorFor } from "@/lib/subcontractors/name-map";
import { useDuplicatePairs } from "@/lib/subcontractors/duplicate-pairs-context";
import { areNamesEquivalent } from "@/lib/utils/name-matching";
import { cn } from "@/lib/utils/cn";

type Draft = PlatformImportRow & {
  matchedCourierId: string | null;
  matchMethod: "uid" | "name" | "email" | "phone" | "none";
  commissionPct: number;
  baseFeeRon: number;
  weeklyFeeRon: number;
  grossRon: number;
  commissionRon: number;
  nominalCommissionRon?: number;
  netRon: number;
  feeNote?: string;
  /** Marcaj: rândul e ignorat pentru că e duplicat al altui rând din același fișier. */
  duplicateOfUid?: string;
  debtOffset?: number;
  negativePaymentsToClear?: Payment[];
};

function normalizeName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}
function normalizePhone(s: string | null): string {
  if (!s) return "";
  return s.replace(/[\s()-]/g, "").replace(/^\+?0*/, "");
}

function matchCourier(row: PlatformImportRow, platform: PlatformKey, couriers: CourierRow[], activeFleetId: string):
  { id: string; method: "uid" | "name" | "email" | "phone" } | null {
  const fleet = couriers.filter((c) => c.tenantId === activeFleetId);
  // 1. UID (cel mai puternic identificator)
  const uidLc = row.uid.toLowerCase();
  const byUid = fleet.find((c) => platform === "bolt" && c.boltUid?.toLowerCase() === uidLc);
  if (byUid) return { id: byUid.id, method: "uid" };
  // 2. Nume normalizat sau inversat (ex: "Manh Cuong Tran" === "Tran Manh Cuong")
  const target = normalizeName(row.fullName);
  if (target) {
    const byName = fleet.find((c) => normalizeName(c.fullName) === target || areNamesEquivalent(c.fullName, row.fullName));
    if (byName) return { id: byName.id, method: "name" };
  }
  // 3. Email
  if (row.email) {
    const emailLc = row.email.toLowerCase();
    const byEmail = fleet.find((c) => c.email?.toLowerCase() === emailLc);
    if (byEmail) return { id: byEmail.id, method: "email" };
  }
  // 4. Telefon normalizat (elimin +40, spații, paranteze)
  const phoneNorm = normalizePhone(row.phone);
  if (phoneNorm.length >= 8) {
    const byPhone = fleet.find((c) => normalizePhone(c.phone) === phoneNorm);
    if (byPhone) return { id: byPhone.id, method: "phone" };
  }
  return null;
}

export function ImportPlatformDialog({
  open, onClose, onlyGroup, onImportSuccess,
}: {
  open: boolean;
  onClose: () => void;
  /** Filtrează parserele afișate doar la grupul specificat (TTG sau Gusty). */
  onlyGroup?: "ttg" | "gusty";
  /** Notifică pagina părinte despre săptămâna și raportul importat ca să se comute automat pe el. */
  onImportSuccess?: (periodStartIso: string, sourceDetail?: PaymentSourceDetail) => void;
}) {
  const toast = useToast();
  const { user, activeFleetId } = useSession();
  const { allRows, addCourier, updateCourier } = useCouriers();
  const { addPayment, deletePayment, deletePayments, updatePayment, payments: allPayments } = usePayments();
  const { groupFor: duplicateGroupFor, pairOptionsFor } = useDuplicatePairs();

  const prevWeek = useMemo(() => getPreviousWeekInterval(), []);
  const currWeek = useMemo(() => getWeekInterval(), []);
  const [periodType, setPeriodType] = useState<"prev" | "current">("prev");

  // Wolt 4-cycle support
  const woltCycles = useMemo(() => getRecentWoltCycles(), []);
  const [selectedWoltIso, setSelectedWoltIso] = useState<string>(() => woltCycles.completedCycle.startIso);

  const [platform, setPlatform] = useState<ParserKey | "auto">("auto");
  const [resolvedParser, setResolvedParser] = useState<PlatformParser | null>(null);

  const isWolt = resolvedParser?.platform === "wolt" && resolvedParser?.group !== "gusty";

  const selectedWoltCycle = useMemo(() => {
    return woltCycles.allCycles.find((c) => c.startIso === selectedWoltIso) ?? woltCycles.completedCycle;
  }, [woltCycles, selectedWoltIso]);

  const activePeriod = useMemo(() => {
    if (isWolt) {
      return {
        startIso: selectedWoltCycle.startIso,
        endIso: selectedWoltCycle.endIso,
        label: selectedWoltCycle.label,
        shortBadge: selectedWoltCycle.shortBadge,
        isCurrent: selectedWoltCycle.startIso === woltCycles.currentCycle.startIso,
        woltCycle: selectedWoltCycle,
      };
    }
    const w = periodType === "current" ? currWeek : prevWeek;
    return {
      startIso: w.startIso,
      endIso: w.endIso,
      label: w.label,
      shortBadge: w.shortBadge,
      isCurrent: periodType === "current",
      woltCycle: null as WoltCycle | null,
    };
  }, [isWolt, selectedWoltCycle, woltCycles.currentCycle.startIso, periodType, currWeek, prevWeek]);

  // Când open devine true sau se schimbă grupul, resetează
  useEffect(() => {
    if (open) {
      setPlatform("auto");
      setPeriodType("prev");
      setSelectedWoltIso(woltCycles.completedCycle.startIso);
    }
  }, [open, onlyGroup, woltCycles.completedCycle.startIso]);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [creatingNew, setCreatingNew] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [imported, setImported] = useState<{ paymentsCount: number; newCouriers: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setDrafts([]); setSkipped(new Set()); setCreatingNew(new Set()); setResolvedParser(null);
    setError(null); setStep("upload"); setImported(null); setBusy(false); setPlatform("auto");
    setPeriodType("prev"); setSelectedWoltIso(woltCycles.completedCycle.startIso);
    onClose();
  };

  function buildDrafts(parser: PlatformParser, parsed: PlatformImportRow[]) {
    setResolvedParser(parser);
    const isWoltParser = parser.platform === "wolt" && parser.group !== "gusty";
    const currentStart = isWoltParser ? selectedWoltCycle.startIso : (periodType === "current" ? currWeek.startIso : prevWeek.startIso);

    // Dedupe INTRA-FIȘIER: dacă același UID apare de mai multe ori, îl păstrez pe primul.
    const seenUids = new Set<string>();
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // Calcul dinamic al restului de taxă săptămânală pe persoană:
    // Dacă persoana are deja plăți înregistrate în această perioadă (pe alt raport, ex: Bolt TTG),
    // scădem din taxa contractuală/țintă (ex: 300 RON) ce s-a reținut deja (ex: 270 RON sau 100 RON),
    // iar pe raportul curent (ex: Glovo) reținem doar diferența rămasă (ex: 30 RON sau 200 RON).
    // Dacă s-a atins deja taxa totală, pe raportul curent taxa devine automat 0 RON.
    const getPersonFeeStatus = (fullName: string, courierId: string | null) => {
      const opts = pairOptionsFor(fullName);
      const group = duplicateGroupFor(fullName);
      const aliasNames = group ? new Set(group.aliases.map((a) => normalizeName(a.name))) : new Set<string>();
      aliasNames.add(normalizeName(fullName));

      const courier = courierId ? allRows.find((c) => c.id === courierId) : allRows.find((c) => areNamesEquivalent(c.fullName, fullName));
      const savedRate = getSavedCourierRate(fullName);
      const targetFee = opts?.feeOnce ?? savedRate?.weeklyFeeRon ?? courier?.weeklyContractFeeRon ?? defaultWeeklyFeeFor(fullName);

      // Găsim plățile existente din această perioadă pentru aceeași persoană
      const matchingPayments = allPayments.filter((p) => {
        if (p.periodStartIso !== currentStart || p.recipient.kind !== "courier") return false;
        if (courierId && p.recipient.id === courierId) return true;
        if (courier && p.recipient.id === courier.id) return true;
        const pNorm = normalizeName(p.recipient.name);
        if (aliasNames.has(pNorm)) return true;
        if (areNamesEquivalent(p.recipient.name, fullName)) return true;
        return false;
      });

      const alreadyPaidFee = round2(matchingPayments.reduce((s, p) => s + (p.breakdown.tax || 0), 0));
      const remainingFee = Math.max(0, round2(targetFee - alreadyPaidFee));

      let feeNote: string | undefined = undefined;
      if (alreadyPaidFee > 0) {
        const srcLabels = Array.from(
          new Set(
            matchingPayments.map((p) => {
              const d = paymentSourceDetail(p.reference);
              return PAYMENT_SOURCE_DETAIL_LABEL[d] ?? "alt raport";
            }),
          ),
        ).join(", ");

        if (remainingFee === 0) {
          feeNote = `Taxă achitată integral (${alreadyPaidFee} RON pe ${srcLabels})`;
        } else {
          feeNote = `Rest taxă: ${remainingFee} RON (${alreadyPaidFee} RON deja reținuți pe ${srcLabels})`;
        }
      }

      // Verificăm dacă persoana are balanțe negative (datorii) neachitate de pe alte platforme în aceeași perioadă
      const negativeMatching = matchingPayments.filter((p) => p.totalCalculated < 0);
      const priorDebt = round2(negativeMatching.reduce((s, p) => s + Math.abs(p.totalCalculated), 0));
      let debtSourceLabels: string | undefined = undefined;
      if (priorDebt > 0) {
        debtSourceLabels = Array.from(
          new Set(
            negativeMatching.map((p) => {
              const d = paymentSourceDetail(p.reference);
              return PAYMENT_SOURCE_DETAIL_LABEL[d] ?? p.recipient.platform?.toUpperCase() ?? "alt raport";
            }),
          ),
        ).join(", ");
      }

      return {
        alreadyPaidFee,
        targetFee,
        remainingFee,
        feeNote,
        priorDebt,
        debtSourceLabels,
        negativePayments: negativeMatching,
      };
    };

    const nextDrafts: Draft[] = parsed.map((r) => {
      const match = matchCourier(r, parser.platform, allRows, activeFleetId);
      const courier = match ? allRows.find((c) => c.id === match.id) : null;
      const savedRate = getSavedCourierRate(r.fullName);
      const isHusein = subcontractorFor(r.fullName) === "HUSEIN";
      let pct = savedRate?.commissionPct ?? courier?.commissionPct ?? defaultCommissionFor(r.fullName);
      if (isHusein && pct === 9) pct = 0; // Protecție seed legacy pe curierii Husein
      const feeStatus = getPersonFeeStatus(r.fullName, match?.id ?? null);
      const fee = feeStatus.remainingFee;

      // Calculăm inițial venitul disponibil pe raportul curent
      const initialMath = computeImportRowMath(r, pct, fee);
      const availableNet = Math.max(0, initialMath.netRon);
      const priorDebt = feeStatus.priorDebt || 0;
      const debtOffset = Math.min(priorDebt, availableNet);

      // Dacă există o datorie de pe altă platformă (ex: Wolt -200 RON), o adăugăm la balanța negativă
      const effectiveNegativeBalance = round2(r.negativeBalanceRon + debtOffset);
      const adjustedRow: PlatformImportRow = debtOffset > 0 ? { ...r, negativeBalanceRon: effectiveNegativeBalance } : r;
      const derived = computeImportRowMath(adjustedRow, pct, fee);

      let finalFeeNote = feeStatus.feeNote;
      if (debtOffset > 0) {
        const debtTxt = `Include recuperare datorie ${debtOffset} RON de pe ${feeStatus.debtSourceLabels ?? "alt raport"}`;
        finalFeeNote = finalFeeNote ? `${finalFeeNote} · ${debtTxt}` : debtTxt;
      }

      const uidKey = r.uid.toLowerCase();
      const isDupInFile = seenUids.has(uidKey);
      if (!isDupInFile) seenUids.add(uidKey);
      return {
        ...r,
        negativeBalanceRon: effectiveNegativeBalance,
        matchedCourierId: match?.id ?? null,
        matchMethod: match?.method ?? "none",
        commissionPct: pct,
        baseFeeRon: fee,
        weeklyFeeRon: derived.effectiveFeeRon,
        feeNote: finalFeeNote,
        ...derived,
        duplicateOfUid: isDupInFile ? r.uid : undefined,
        debtOffset,
        negativePaymentsToClear: feeStatus.negativePayments,
      };
    });
    // Marchez auto skip pentru duplicate din fișier
    const autoSkip = new Set(nextDrafts.filter((d) => d.duplicateOfUid).map((d) => d.uid));
    // Curieri noi = fără match ȘI nu duplicate în fișier
    const toCreate = new Set(nextDrafts.filter((d) => !d.matchedCourierId && !d.duplicateOfUid).map((d) => d.uid));
    setDrafts(nextDrafts);
    setSkipped(autoSkip);
    setCreatingNew(toCreate);
    setStep("preview");
  }

  function resolveParserOrError(): PlatformParser | null {
    if (platform === "auto") {
      setError("Auto-detect nu funcționează pentru text lipit. Alege manual parser-ul (ex: Bolt Gusty).");
      return null;
    }
    const parser = getParser(platform);
    if (!parser) { setError("Parser necunoscut."); return null; }
    if (parser.status !== "ready") { setError(parser.helpMessage ?? "Indisponibil."); return null; }
    return parser;
  }

  /**
   * Rezolvă parser-ul de folosit pentru un fișier:
   *  - modul „auto"  → parserul detectat sau eroare
   *  - modul manual  → parserul ales; cross-check cu detected, avertizare dacă e altul
   * Returnează parser-ul valid SAU string cu mesaj de eroare.
   */
  function resolveParserForFile(detected: PlatformParser | null): PlatformParser | string {
    if (platform === "auto") {
      return detected
        ?? 'Nu am putut detecta automat modelul. Fișierul nu se potrivește cu Bolt TTG sau Gusty Bolt. Alege manual din chip-uri sau verifică fișierul.';
    }
    const parser = getParser(platform);
    if (!parser) return "Platformă necunoscută.";
    if (parser.status !== "ready") return parser.helpMessage ?? `Parser ${parser.label} indisponibil.`;
    if (detected && detected.key !== parser.key) {
      return `Ai ales „${parser.label}" dar fișierul pare a fi „${detected.label}". Selectează parser-ul corect din chip-urile de sus și încarcă din nou.`;
    }
    return parser;
  }

  async function handleFile(file: File) {
    setBusy(true); setError(null);
    try {
      const buf = await file.arrayBuffer();
      const detected = autoDetect(buf);
      const resolved = resolveParserForFile(detected);
      if (typeof resolved === "string") { setError(resolved); setBusy(false); return; }
      const parsed = resolved.parse(buf);
      if (parsed.length === 0) { setError(`Fișierul nu conține rânduri valide pentru ${resolved.label}.`); setBusy(false); return; }
      buildDrafts(resolved, parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fișierul nu a putut fi citit.");
    }
    setBusy(false);
  }

  function handlePasteText(text: string) {
    setError(null);
    const detected = autoDetectText(text);
    let parser: PlatformParser | null;
    if (platform === "auto") {
      parser = detected;
      if (!parser) {
        setError("Nu am putut detecta modelul din text. Alege manual parser-ul (ex: Gusty · Bolt).");
        return;
      }
    } else {
      parser = getParser(platform);
      if (!parser || parser.status !== "ready") { setError(parser?.helpMessage ?? "Parser indisponibil."); return; }
      // Cross-check: text-ul pare a fi alt parser
      if (detected && detected.key !== parser.key) {
        setError(`Ai ales „${parser.label}" dar textul pare a fi „${detected.label}". Schimbă parser-ul.`);
        return;
      }
    }
    if (!parser.parseText) {
      setError(`Parser-ul ${parser.label} nu suportă lipire text — folosește fișier XLSX.`);
      return;
    }
    const parsed = parser.parseText(text);
    if (parsed.length === 0) {
      setError("Nu am găsit rânduri valide în textul lipit. Verifică formatul (tab-separated cu UID, nume, sume).");
      return;
    }
    buildDrafts(parser, parsed);
  }

  function updateDraft(uid: string, patch: Partial<Pick<Draft, "commissionPct" | "weeklyFeeRon">>) {
    setDrafts((prev) => prev.map((d) => {
      if (d.uid !== uid) return d;
      const newPct = patch.commissionPct !== undefined ? patch.commissionPct : d.commissionPct;
      const requestedFee = patch.weeklyFeeRon !== undefined ? patch.weeklyFeeRon : d.baseFeeRon;
      const derived = computeImportRowMath(d, newPct, requestedFee);

      // Persistă rata în cache-ul persistent de preferințe curier
      if (d.fullName) {
        saveCourierRate(d.fullName, {
          ...(patch.commissionPct !== undefined ? { commissionPct: newPct } : {}),
          ...(patch.weeklyFeeRon !== undefined ? { weeklyFeeRon: requestedFee } : {}),
        });
      }

      // Dacă curierul e deja creat/mapat în CRM, actualizează profilul în context
      if (d.matchedCourierId) {
        updateCourier(d.matchedCourierId, {
          ...(patch.commissionPct !== undefined ? { commissionPct: newPct } : {}),
          ...(patch.weeklyFeeRon !== undefined ? { weeklyContractFeeRon: requestedFee } : {}),
        });
      }

      return {
        ...d,
        commissionPct: newPct,
        weeklyFeeRon: derived.effectiveFeeRon,
        baseFeeRon: patch.weeklyFeeRon !== undefined ? requestedFee : d.baseFeeRon,
        ...derived,
      };
    }));
  }

  function toggleSkip(uid: string) {
    setSkipped((prev) => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  }
  function toggleCreate(uid: string) {
    setCreatingNew((prev) => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  }

  const summary = useMemo(() => {
    const active = drafts.filter((d) => !skipped.has(d.uid));
    const totalGross = active.reduce((s, d) => s + d.grossRon, 0);
    const totalCommission = active.reduce((s, d) => s + d.commissionRon, 0);
    const totalNet = active.reduce((s, d) => s + Math.max(0, d.netRon), 0);
    const totalCashDebt = active.reduce((s, d) => s + (d.netRon < 0 ? Math.abs(d.netRon) : 0), 0);
    const matched = active.filter((d) => d.matchedCourierId).length;
    const willCreate = active.filter((d) => !d.matchedCourierId && creatingNew.has(d.uid)).length;
    const noMatchIgnored = active.filter((d) => !d.matchedCourierId && !creatingNew.has(d.uid)).length;
    return {
      totalRows: drafts.length, active: active.length, skipped: skipped.size,
      matched, willCreate, noMatchIgnored,
      totalGross: round2(totalGross), totalCommission: round2(totalCommission), totalNet: round2(totalNet),
      totalCashDebt: round2(totalCashDebt),
    };
  }, [drafts, skipped, creatingNew]);

  async function confirmImport() {
    if (!resolvedParser) return;
    setBusy(true);
    let newCouriers = 0;
    let paymentsCount = 0;
    const periodStart = activePeriod.startIso;
    const periodEnd = activePeriod.endIso;
    const platformKey = resolvedParser.platform;
    const paymentDate = resolvedParser.platform === "wolt" && activePeriod.woltCycle
      ? activePeriod.woltCycle.invoiceDateIso
      : periodEnd;

    // Curăță plăți existente anterior din acest raport pentru aceeași săptămână/ciclu (evităm dublarea la re-import)
    const targetSource =
      resolvedParser.group === "ttg" ? "ttg_bolt" :
      resolvedParser.platform === "wolt" ? "gusty_wolt" :
      resolvedParser.platform === "glovo" ? "gusty_glovo" : "gusty_bolt";

    const existingMatches = allPayments.filter(
      (p) => p.fleetId === activeFleetId
        && p.periodStartIso === periodStart
        && (paymentSourceDetail(p.reference) === targetSource || (p.reference ?? "").toLowerCase().includes(resolvedParser.label.toLowerCase())),
    );
    if (existingMatches.length > 0) {
      deletePayments(existingMatches.map((p) => p.id), user.name);
    }

    const ratesToBatchSave: Array<{ fullName: string; commissionPct: number; weeklyFeeRon: number }> = [];

    for (const d of drafts) {
      if (skipped.has(d.uid)) continue;
      let courierId = d.matchedCourierId;
      let courierCity = d.city ?? "";
      if (!courierId && creatingNew.has(d.uid)) {
        const created = addCourier(buildCourierFromDraft(d, platformKey, activeFleetId, user.name));
        courierId = created.id;
        newCouriers++;
      }
      if (!courierId) continue;

      // Actualizăm și persistăm profilul curierului cu comisionul % și taxa contract din acest import
      updateCourier(courierId, {
        commissionPct: d.commissionPct,
        weeklyContractFeeRon: d.baseFeeRon,
      });
      if (d.fullName) {
        ratesToBatchSave.push({
          fullName: d.fullName,
          commissionPct: d.commissionPct,
          weeklyFeeRon: d.baseFeeRon,
        });
      }

      const courier = allRows.find((c) => c.id === courierId);
      if (courier) courierCity = courier.city;
      addPayment({
        tenantId: activeFleetId,
        fleetId: activeFleetId,
        recipient: {
          id: courierId,
          name: d.fullName,
          city: courierCity || null,
          platform: platformKey,
          status: "active",
          kind: "courier",
        },
        type: "courier_pay",
        periodStartIso: periodStart,
        periodEndIso: periodEnd,
        paymentDateIso: paymentDate,
        method: "bank_transfer",
        breakdown: {
          ...EMPTY_BREAKDOWN,
          grossRevenue: d.brutRon,
          tips: d.tipsRon,
          fleetCommission: d.commissionRon,
          tax: d.weeklyFeeRon,
          deductions: d.negativeBalanceRon,
        },
        amountPaid: 0,
        totalCalculated: d.netRon,
        status: "unpaid",
        reference: `${resolvedParser.label} · ${activePeriod.shortBadge} · UID ${d.uid}`,
        notes: `Import raport ${resolvedParser.label} (perioada ${periodStart} → ${periodEnd}${activePeriod.woltCycle ? `, factură emisă ${activePeriod.woltCycle.invoiceDateIso}` : ""})${d.feeNote ? ` · ${d.feeNote}` : ""}${d.baseFeeRon > d.weeklyFeeRon ? ` · Taxă contract ${d.baseFeeRon} RON plafonată la ${d.weeklyFeeRon} RON (venit disponibil)` : ""}${d.nominalCommissionRon !== undefined && d.nominalCommissionRon > d.commissionRon ? ` · Comision contractual ${d.nominalCommissionRon.toFixed(2)} RON redus la ${d.commissionRon.toFixed(2)} RON (venit disponibil)` : ""}${d.netRon < 0 ? ` · Curierul datorează cash flotei: ${Math.abs(d.netRon).toFixed(2)} RON` : ""}.`,
        overrideReason: null,
        ordersCount: d.ordersCount,
        platforms: [platformKey],
        commissionPercentage: d.commissionPct,
        currency: "RON",
        ibanSnapshot: courier?.iban ?? null,
        operatorName: user.name,
        createdBy: user.name || "Sistem",
      });
      paymentsCount++;

      // Stingere datorii anterioare de pe alte rapoarte dacă au fost recuperate din acest import
      if (d.debtOffset && d.debtOffset > 0 && d.negativePaymentsToClear && d.negativePaymentsToClear.length > 0) {
        let remainingOffset = d.debtOffset;
        for (const negP of d.negativePaymentsToClear) {
          if (remainingOffset <= 0) break;
          const negDebt = round2(Math.abs(negP.totalCalculated));
          const take = Math.min(remainingOffset, negDebt);
          if (take > 0) {
            const newTotal = round2(negP.totalCalculated + take);
            updatePayment(
              negP.id,
              {
                breakdown: {
                  ...negP.breakdown,
                  correction: round2((negP.breakdown.correction || 0) + take),
                },
                totalCalculated: newTotal,
                status: newTotal >= 0 ? "paid" : negP.status,
                notes: `${negP.notes || ""} · Datorie de ${take} RON stinsă prin compensare pe raportul ${resolvedParser.label} (UID ${d.uid})`.trim(),
              },
              user.name || "Sistem",
            );
            remainingOffset = round2(remainingOffset - take);
          }
        }
      }
    }

    if (ratesToBatchSave.length > 0) {
      saveBatchCourierRates(ratesToBatchSave);
    }

    setImported({ paymentsCount, newCouriers });
    setStep("done");
    setBusy(false);
    toast.success("Import finalizat", `${paymentsCount} plăți create, ${newCouriers} curieri noi.`);
    const parserKey = resolvedParser.key;
    const reportSourceDetail: PaymentSourceDetail =
      resolvedParser.group === "ttg" || parserKey === "bolt_ttg"
        ? "ttg_bolt"
        : parserKey === "wolt_gusty"
        ? "gusty_wolt"
        : parserKey === "glovo_gusty"
        ? "gusty_glovo"
        : "gusty_bolt";
    onImportSuccess?.(periodStart, reportSourceDetail);
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Import raport platformă" size="lg">
      {step === "upload" && (
        <UploadStep
          platform={platform}
          onPlatformChange={setPlatform}
          onlyGroup={onlyGroup}
          onFile={handleFile}
          onPasteText={handlePasteText}
          onCancel={handleClose}
          busy={busy}
          error={error}
          fileRef={fileRef}
        />
      )}
      {step === "preview" && resolvedParser && (
        <PreviewStep
          parserLabel={resolvedParser.label}
          isWolt={isWolt}
          activePeriod={activePeriod}
          periodType={periodType}
          onPeriodTypeChange={setPeriodType}
          prevWeek={prevWeek}
          currWeek={currWeek}
          woltCycles={woltCycles}
          selectedWoltIso={selectedWoltIso}
          onWoltCycleChange={setSelectedWoltIso}
          drafts={drafts}
          skipped={skipped}
          creatingNew={creatingNew}
          summary={summary}
          onUpdate={updateDraft}
          onToggleSkip={toggleSkip}
          onToggleCreate={toggleCreate}
          onBack={() => setStep("upload")}
          onConfirm={confirmImport}
          busy={busy}
        />
      )}
      {step === "done" && imported && (
        <DoneStep imported={imported} onClose={handleClose} />
      )}
    </Dialog>
  );
}

function parsersForGroup(group: "ttg" | "gusty", onlyGroup?: "ttg" | "gusty"): PlatformParser[] {
  if (onlyGroup && onlyGroup !== group) return [];
  return PARSERS.filter((p) => p.group === group);
}

function UploadStep({ platform, onPlatformChange, onlyGroup, onFile, onPasteText, onCancel, busy, error, fileRef }: {
  platform: ParserKey | "auto";
  onPlatformChange: (p: ParserKey | "auto") => void;
  onlyGroup?: "ttg" | "gusty";
  onFile: (f: File) => void;
  onPasteText: (text: string) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  const currentParser = platform === "auto" ? null : getParser(platform);
  const notReady = currentParser?.status === "coming_soon";
  const supportsPaste = currentParser?.parseText != null;
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pasteText, setPasteText] = useState("");

  const ttgParsers = parsersForGroup("ttg", onlyGroup);
  const gustyParsers = parsersForGroup("gusty", onlyGroup);
  const hideSelector = ttgParsers.length + gustyParsers.length <= 1;

  return (
    <div className="flex flex-col gap-3">
      <SelectorArea
        hideSelector={hideSelector}
        platform={platform}
        currentParser={currentParser}
        ttgParsers={ttgParsers}
        gustyParsers={gustyParsers}
        onPlatformChange={onPlatformChange}
      />

      {notReady && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.08] p-3 text-[11.5px] text-amber-100">
          <b>{currentParser.label} — neconfigurat încă.</b> {currentParser.helpMessage}
        </div>
      )}

      {!notReady && (
        <>
          {/* Mode tabs — File vs Paste */}
          <div className="flex rounded-lg border border-line bg-card-hover p-0.5">
            <button
              type="button"
              onClick={() => setMode("file")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
                mode === "file" ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
              )}
            >
              <FileSpreadsheet size={13} /> Fișier XLSX
            </button>
            <button
              type="button"
              onClick={() => setMode("paste")}
              disabled={!supportsPaste}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
                mode === "paste" ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
                !supportsPaste && "opacity-40 cursor-not-allowed",
              )}
            >
              <ClipboardPaste size={13} /> Copy-paste text
              {!supportsPaste && <span className="rounded bg-amber-500/25 px-1 text-[9px]">N/A</span>}
            </button>
          </div>

          {mode === "file" ? (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-500/40 bg-violet-500/[0.05] p-8 text-center transition-colors hover:bg-violet-500/[0.10]">
              <FileSpreadsheet size={36} className="text-violet-300" />
              <div className="text-[13px] font-semibold text-fg">Alege fișier XLSX</div>
              <div className="text-[11px] text-fg-muted">sau trage-l aici</div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                className="hidden"
                disabled={busy}
              />
            </label>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-[11.5px] text-fg-muted">
                Selectează toate rândurile din tabel (inclusiv header) în Excel/Gusty și apasă Ctrl+C, apoi lipește aici:
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={10}
                placeholder="Row Number	Courier UID	First Name	Last Name	Phone	City	Adjusted Earnings...	Courier Tips...	Overdue debt	Balance After Period&#10;5	UB118BF	Daniela	Plugariu	...	Iasi	320.13	7.48	0	-222.23&#10;..."
                className="w-full rounded-lg border border-line bg-card-2 p-3 font-mono text-[11px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onPasteText(pasteText)}
                disabled={busy || pasteText.trim().length === 0}
                className={cn(
                  "self-end inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white",
                  (busy || pasteText.trim().length === 0) && "opacity-50",
                )}
              >
                <Upload size={13} /> Procesează text
              </button>
            </div>
          )}
        </>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-[12px] text-fg-muted">
          <Loader2 size={14} className="animate-spin" /> Se procesează…
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100">
          {error}
        </div>
      )}
      <DialogFooter>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg"
        >
          Anulează
        </button>
      </DialogFooter>
    </div>
  );
}

function SelectorArea({
  hideSelector, platform, currentParser, ttgParsers, gustyParsers, onPlatformChange,
}: {
  hideSelector: boolean;
  platform: ParserKey | "auto";
  currentParser: PlatformParser | null;
  ttgParsers: PlatformParser[];
  gustyParsers: PlatformParser[];
  onPlatformChange: (p: ParserKey | "auto") => void;
}) {
  if (hideSelector && currentParser) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-violet-500/40 bg-violet-500/[0.06] px-3 py-2">
        <FileSpreadsheet size={14} className="text-violet-300" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold text-violet-100">{currentParser.label}</div>
          <div className="text-[10.5px] text-fg-muted">
            {currentParser.group === "ttg" ? "Raport oficial platformă" : "Raport agregator Gusty"}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <PlatformChip
        active={platform === "auto"}
        onClick={() => onPlatformChange("auto")}
        label="Auto-detect (doar fișier)"
        icon={<Wand2 size={11} />}
        ready
      />
      <ParserGroup title="TTG — rapoarte oficiale platformă" parsers={ttgParsers} active={platform} onSelect={onPlatformChange} />
      <ParserGroup title="Gusty — rapoarte agregator" parsers={gustyParsers} active={platform} onSelect={onPlatformChange} />
    </div>
  );
}

function ParserGroup({ title, parsers, active, onSelect }: {
  title: string;
  parsers: PlatformParser[];
  active: ParserKey | "auto";
  onSelect: (k: ParserKey | "auto") => void;
}) {
  if (parsers.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-fg-dim">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {parsers.map((p) => (
          <PlatformChip
            key={p.key}
            active={active === p.key}
            onClick={() => onSelect(p.key)}
            label={p.label}
            ready={p.status === "ready"}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformChip({ active, onClick, label, icon, ready }: {
  active: boolean; onClick: () => void; label: string; icon?: React.ReactNode; ready: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition-colors",
        active
          ? "border-violet-500/60 bg-violet-500/20 text-violet-100"
          : "border-line bg-card-2 text-fg-muted hover:text-fg",
        !ready && "opacity-70",
      )}
    >
      {icon}
      {label}
      {!ready && <span className="rounded bg-amber-500/25 px-1 text-[9px] text-amber-200">SOON</span>}
    </button>
  );
}

function PreviewStep({
  parserLabel, isWolt, activePeriod, periodType, onPeriodTypeChange, prevWeek, currWeek,
  woltCycles, selectedWoltIso, onWoltCycleChange,
  drafts, skipped, creatingNew, summary,
  onUpdate, onToggleSkip, onToggleCreate, onBack, onConfirm, busy,
}: {
  parserLabel: string;
  isWolt: boolean;
  activePeriod: { startIso: string; endIso: string; label: string; shortBadge: string; isCurrent?: boolean; woltCycle?: WoltCycle | null };
  periodType: "prev" | "current";
  onPeriodTypeChange: (t: "prev" | "current") => void;
  prevWeek: WeekInterval;
  currWeek: WeekInterval;
  woltCycles: { completedCycle: WoltCycle; currentCycle: WoltCycle; allCycles: WoltCycle[] };
  selectedWoltIso: string;
  onWoltCycleChange: (iso: string) => void;
  drafts: Draft[];
  skipped: Set<string>;
  creatingNew: Set<string>;
  summary: { totalRows: number; active: number; skipped: number; matched: number; willCreate: number; noMatchIgnored: number; totalGross: number; totalCommission: number; totalNet: number; totalCashDebt: number };
  onUpdate: (uid: string, patch: Partial<Pick<Draft, "commissionPct" | "weeklyFeeRon">>) => void;
  onToggleSkip: (uid: string) => void;
  onToggleCreate: (uid: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const [focusedUid, setFocusedUid] = useState<string | null>(null);
  const [configuredUids, setConfiguredUids] = useState<Set<string>>(new Set());
  const [onlyNew, setOnlyNew] = useState(false);

  const newCouriers = useMemo(() => {
    return drafts.filter((d) => !d.matchedCourierId && !d.duplicateOfUid && !skipped.has(d.uid));
  }, [drafts, skipped]);

  const handleUpdate = (uid: string, patch: Partial<Pick<Draft, "commissionPct" | "weeklyFeeRon">>) => {
    setConfiguredUids((prev) => new Set(prev).add(uid));
    onUpdate(uid, patch);
  };

  const handleScrollToCourier = (uid: string) => {
    setFocusedUid(uid);
    if (search.trim()) setSearch("");
    setTimeout(() => {
      const rowEl = document.getElementById(`draft-row-${uid}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const inputEl = document.getElementById(`draft-comm-${uid}`) as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
      }
    }, 60);
  };

  const filtered = useMemo(() => {
    return drafts.filter((d) => {
      if (onlyNew && (d.matchedCourierId || d.duplicateOfUid)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return d.fullName.toLowerCase().includes(q) || d.uid.toLowerCase().includes(q);
    });
  }, [drafts, onlyNew, search]);
  return (
    <div className="flex flex-col gap-3">
      {/* Selector Perioadă Raport */}
      <div className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
        isWolt
          ? "border-sky-500/40 bg-gradient-to-r from-sky-950/40 via-card to-card"
          : "border-violet-500/40 bg-gradient-to-r from-violet-950/40 via-card to-card",
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isWolt ? "bg-sky-500/20 text-sky-300" : "bg-violet-500/20 text-violet-300",
          )}>
            <Calendar size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-bold text-fg">
                {isWolt ? "Ciclu Wolt: " : "Perioada raportului: "}
                <span className={isWolt ? "text-sky-300" : "text-violet-300"}>{activePeriod.label}</span>
              </span>
              {isWolt && (
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                  4 cicluri / lună
                </span>
              )}
            </div>
            <div className="text-[11px] text-fg-muted">
              {isWolt
                ? "Wolt emite autofacturi pe 8, 16, 23 și 1 a lunii. Plățile sunt calculate strict pe ciclu."
                : "Plățile vor fi înregistrate strict în această săptămână și nu se vor cumula cu rapoartele anterioare."}
            </div>
          </div>
        </div>

        {isWolt ? (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card-2 p-1">
            <button
              type="button"
              onClick={() => onWoltCycleChange(woltCycles.completedCycle.startIso)}
              title={`Autofactură emisă pe ${woltCycles.completedCycle.invoiceDateIso}`}
              className={cn(
                "rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors",
                selectedWoltIso === woltCycles.completedCycle.startIso
                  ? "bg-sky-600 font-semibold text-white shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Ciclu facturat ({woltCycles.completedCycle.shortBadge})
            </button>
            <button
              type="button"
              onClick={() => onWoltCycleChange(woltCycles.currentCycle.startIso)}
              className={cn(
                "rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors",
                selectedWoltIso === woltCycles.currentCycle.startIso
                  ? "bg-sky-600 font-semibold text-white shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Ciclu în curs ({woltCycles.currentCycle.shortBadge})
            </button>
            <select
              value={selectedWoltIso}
              onChange={(e) => onWoltCycleChange(e.target.value)}
              className="rounded-md border border-line bg-card px-2 py-1 text-[11.5px] font-medium text-fg focus:outline-none cursor-pointer"
            >
              {woltCycles.allCycles.map((c) => (
                <option key={c.startIso} value={c.startIso}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-card-2 p-1">
            <button
              type="button"
              onClick={() => onPeriodTypeChange("prev")}
              className={cn(
                "rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors",
                periodType === "prev"
                  ? "bg-violet-600 font-semibold text-white shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Săpt. anterioară ({prevWeek.shortBadge})
            </button>
            <button
              type="button"
              onClick={() => onPeriodTypeChange("current")}
              className={cn(
                "rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors",
                periodType === "current"
                  ? "bg-violet-600 font-semibold text-white shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Săpt. curentă ({currWeek.shortBadge})
            </button>
          </div>
        )}
      </div>

      <div className="text-[11.5px] text-fg-muted">
        Sursă: <b className="text-fg">{parserLabel}</b>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Rânduri" value={String(summary.active)} sub={`din ${summary.totalRows}`} tone="sky" />
        <SummaryCard label="Brut total" value={`${summary.totalGross.toFixed(2)}`} sub="RON" tone="emerald" />
        <SummaryCard label="Comision total" value={`${summary.totalCommission.toFixed(2)}`} sub="RON" tone="amber" />
        <SummaryCard
          label="Net de plată"
          value={`${summary.totalNet.toFixed(2)}`}
          sub={summary.totalCashDebt > 0 ? `RON · ${summary.totalCashDebt.toFixed(2)} datorii cash` : "RON"}
          tone="violet"
        />
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <StatusChip icon={<CheckCircle2 size={11} />} label={`${summary.matched} găsiți`} tone="emerald" />
        {summary.willCreate > 0 && <StatusChip icon={<UserPlus size={11} />} label={`${summary.willCreate} creați automat`} tone="violet" />}
        {summary.skipped > 0 && <StatusChip icon={<Info size={11} />} label={`${summary.skipped} skip`} tone="amber" />}
        {summary.noMatchIgnored > 0 && <StatusChip icon={<AlertTriangle size={11} />} label={`${summary.noMatchIgnored} fără match`} tone="rose" />}
      </div>

      {/* Panou dedicat: curieri noi care vor fi adăugați în baza de date */}
      <NewCouriersPanel
        drafts={drafts}
        skipped={skipped}
        creatingNew={creatingNew}
        onToggleCreate={onToggleCreate}
        onSelectCourier={handleScrollToCourier}
        focusedUid={focusedUid}
        configuredUids={configuredUids}
      />
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută nume sau UID…"
            className="w-full rounded-md border border-line bg-card-2 py-1.5 pl-8 pr-2.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </div>
        {newCouriers.length > 0 && (
          <button
            type="button"
            onClick={() => setOnlyNew((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11.5px] font-semibold transition-all whitespace-nowrap cursor-pointer",
              onlyNew
                ? "border-amber-400 bg-amber-400/20 text-amber-200 shadow-sm"
                : "border-line bg-card-2 text-fg-muted hover:border-amber-400/50 hover:text-amber-200",
            )}
          >
            <UserPlus size={13} />
            {onlyNew ? "Afișează toți" : `Doar curieri noi (${newCouriers.length})`}
          </button>
        )}
      </div>
      <div className="max-h-[50vh] overflow-auto rounded-lg border border-line">
        <table className="w-full min-w-[720px] text-[11.5px]">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-line text-left text-[10px] font-semibold uppercase tracking-wider text-fg-dim">
              <th className="px-2 py-2">Curier</th>
              <th className="px-2 py-2 text-right">Brut+Tips</th>
              <th className="px-2 py-2 text-right">Com. % · RON</th>
              <th className="px-2 py-2 text-right">Taxă</th>
              <th className="px-2 py-2 text-right">Bal.neg</th>
              <th className="px-2 py-2 text-right">Net</th>
              <th className="px-2 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => {
              const isSkipped = skipped.has(d.uid);
              const willCreate = !d.matchedCourierId && creatingNew.has(d.uid);
              const noMatchNoCreate = !d.matchedCourierId && !creatingNew.has(d.uid);
              const isFocused = focusedUid === d.uid;
              return (
                <tr
                  key={d.uid}
                  id={`draft-row-${d.uid}`}
                  className={cn(
                    "border-b border-line/60 transition-colors duration-300",
                    isSkipped && "opacity-40",
                    isFocused && "bg-amber-500/[0.14] ring-2 ring-inset ring-amber-400/90 shadow-md",
                  )}
                >
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-fg">{d.fullName}</span>
                      {willCreate && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-300 uppercase tracking-wider">
                          Nou
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-fg-dim">{d.uid}</div>
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdate(d.uid, { commissionPct: 0, weeklyFeeRon: 0 })}
                        title="Setează 0% comision + 0 RON taxă (ex. Husein / acord special — reținut pentru viitor)"
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-semibold transition-all cursor-pointer",
                          d.commissionPct === 0 && d.baseFeeRon === 0
                            ? "bg-emerald-500/30 border border-emerald-400 text-emerald-200 shadow-sm"
                            : "bg-card border border-line text-fg-muted hover:text-emerald-200 hover:border-emerald-500/50",
                        )}
                      >
                        0% + 0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(d.uid, { commissionPct: 3, weeklyFeeRon: 0 })}
                        title="Setează acord special: 3% comision + 0 RON taxă (reținut pentru viitor)"
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-semibold transition-all cursor-pointer",
                          d.commissionPct === 3 && d.weeklyFeeRon === 0
                            ? "bg-sky-500/30 border border-sky-400 text-sky-200 shadow-sm"
                            : "bg-card border border-line text-fg-muted hover:text-sky-200 hover:border-sky-500/50",
                        )}
                      >
                        3% + 0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(d.uid, { commissionPct: 10, weeklyFeeRon: 210 })}
                        title="Setează standard flotă: 10% comision + 210 RON taxă"
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-semibold transition-all cursor-pointer",
                          d.commissionPct === 10 && d.baseFeeRon === 210
                            ? "bg-violet-500/30 border border-violet-400 text-violet-200 shadow-sm"
                            : "bg-card border border-line text-fg-muted hover:text-violet-200 hover:border-violet-500/50",
                        )}
                      >
                        10% + 210
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-fg">{d.grossRon.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          id={`draft-comm-${d.uid}`}
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={d.commissionPct}
                          onChange={(e) => handleUpdate(d.uid, { commissionPct: Number(e.target.value) })}
                          className="w-12 rounded border border-line bg-card-2 px-1 py-0.5 text-right font-mono text-[11px] text-fg focus:border-amber-400 focus:outline-none"
                        />
                        <span className={cn(
                          "font-mono text-[10.5px] tabular-nums whitespace-nowrap",
                          d.nominalCommissionRon !== undefined && d.nominalCommissionRon > d.commissionRon
                            ? "text-amber-300 font-semibold"
                            : "text-fg-muted",
                        )}>
                          = {d.commissionRon.toFixed(2)}
                        </span>
                      </div>
                      {d.nominalCommissionRon !== undefined && d.nominalCommissionRon > d.commissionRon && (
                        <span
                          className="mt-0.5 text-[9px] font-medium text-amber-300/90 whitespace-nowrap"
                          title={`Comisionul procentual ar fi fost de ${d.nominalCommissionRon.toFixed(2)} RON, dar este redus la ${d.commissionRon.toFixed(2)} RON din lipsă de venit disponibil.`}
                        >
                          din {d.nominalCommissionRon.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={d.weeklyFeeRon}
                        onChange={(e) => handleUpdate(d.uid, { weeklyFeeRon: Number(e.target.value) })}
                        className={cn(
                          "w-16 rounded border px-1 py-0.5 text-right font-mono text-[11px] focus:border-amber-400 focus:outline-none",
                          d.feeNote
                            ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200 font-semibold"
                            : d.baseFeeRon > d.weeklyFeeRon
                            ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                            : "border-line bg-card-2 text-fg",
                        )}
                      />
                      {d.feeNote ? (
                        <span
                          className="mt-0.5 max-w-[125px] truncate text-[8.5px] font-semibold text-cyan-300 whitespace-nowrap cursor-help"
                          title={d.feeNote}
                        >
                          {d.feeNote}
                        </span>
                      ) : d.baseFeeRon > d.weeklyFeeRon ? (
                        <span
                          className="mt-0.5 text-[9px] font-medium text-amber-300/90 whitespace-nowrap"
                          title={`Taxa contractuală este de ${d.baseFeeRon} RON, dar a fost reținută doar suma disponibilă de ${d.weeklyFeeRon} RON pentru a nu trece curierul pe minus.`}
                        >
                          din {d.baseFeeRon}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-fg-muted">{d.negativeBalanceRon.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums font-bold">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        d.netRon < 0 ? "text-rose-400 font-bold" : d.netRon === 0 ? "text-fg-muted font-normal" : "text-emerald-300",
                      )}>
                        {d.netRon.toFixed(2)}
                      </span>
                      {d.netRon < 0 && (
                        <span
                          className="mt-0.5 rounded bg-rose-500/15 px-1 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-rose-300 border border-rose-500/30 whitespace-nowrap"
                          title={`Curierul a încasat numerar din comenzi de ${d.negativeBalanceRon.toFixed(2)} RON, depășind venitul realizat de ${d.grossRon.toFixed(2)} RON. Diferența de ${Math.abs(d.netRon).toFixed(2)} RON reprezintă bani pe care curierul trebuie să-i predea flotei.`}
                        >
                          datorie cash
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {d.matchedCourierId ? (
                      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                        <CheckCircle2 size={9} /> {d.matchMethod === "uid" ? "UID" : d.matchMethod === "name" ? "Nume" : "Email"}
                      </span>
                    ) : willCreate ? (
                      <span className="inline-flex items-center gap-1 rounded border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">
                        <UserPlus size={9} /> Creare
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                        <AlertTriangle size={9} /> Fără
                      </span>
                    )}
                    <div className="mt-1 flex justify-center gap-1">
                      <button type="button" onClick={() => onToggleSkip(d.uid)} className="text-[9.5px] font-semibold text-fg-muted hover:text-fg">
                        {isSkipped ? "reactivează" : "skip"}
                      </button>
                      {noMatchNoCreate && (
                        <>
                          <span className="text-fg-dim">·</span>
                          <button type="button" onClick={() => onToggleCreate(d.uid)} className="text-[9.5px] font-semibold text-violet-300 hover:text-violet-200">
                            creează
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <DialogFooter>
        <button type="button" onClick={onBack} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg">
          ← Înapoi
        </button>
        <button type="button" onClick={onConfirm} disabled={busy || summary.active === 0}
          className={cn("inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", (busy || summary.active === 0) && "opacity-50")}>
          <Upload size={13} /> Importă {summary.active} plăți
        </button>
      </DialogFooter>
    </div>
  );
}

function DoneStep({ imported, onClose }: { imported: { paymentsCount: number; newCouriers: number }; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
        <CheckCircle2 size={28} />
      </span>
      <div className="text-[16px] font-bold text-fg">Import finalizat</div>
      <div className="text-center text-[12.5px] text-fg-muted">
        <div><b className="text-fg">{imported.paymentsCount}</b> plăți create</div>
        {imported.newCouriers > 0 && <div className="mt-0.5"><b className="text-fg">{imported.newCouriers}</b> curieri noi adăugați</div>}
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white">
          Gata
        </button>
      </DialogFooter>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "sky" | "emerald" | "amber" | "violet" }) {
  const toneClass = {
    sky:     "from-sky-500/15 to-sky-500/5 text-sky-200 border-sky-500/25",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-200 border-emerald-500/25",
    amber:   "from-amber-500/15 to-amber-500/5 text-amber-200 border-amber-500/25",
    violet:  "from-violet-500/15 to-violet-500/5 text-violet-200 border-violet-500/25",
  }[tone];
  return (
    <div className={cn("rounded-lg border bg-gradient-to-br p-2.5", toneClass)}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      <div className="text-[15px] font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-fg-dim">{sub}</div>}
    </div>
  );
}

function StatusChip({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "emerald" | "violet" | "amber" | "rose" }) {
  const toneClass = {
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    violet:  "border-violet-500/40 bg-violet-500/10 text-violet-200",
    amber:   "border-amber-500/40 bg-amber-500/10 text-amber-200",
    rose:    "border-rose-500/40 bg-rose-500/10 text-rose-200",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 font-semibold", toneClass)}>
      {icon} {label}
    </span>
  );
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

/** Panou dedicat: arată curierii NOI de pe raport, cu click pentru salt direct și setare tarife. */
function NewCouriersPanel({
  drafts, skipped, creatingNew, onToggleCreate, onSelectCourier, focusedUid, configuredUids,
}: {
  drafts: Draft[];
  skipped: Set<string>;
  creatingNew: Set<string>;
  onToggleCreate: (uid: string) => void;
  onSelectCourier: (uid: string) => void;
  focusedUid: string | null;
  configuredUids: Set<string>;
}) {
  const newOnes = drafts.filter(
    (d) => !skipped.has(d.uid) && !d.matchedCourierId && creatingNew.has(d.uid) && !d.duplicateOfUid,
  );
  if (newOnes.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-card p-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[13px] font-bold text-amber-200">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/25 text-amber-300">
            <UserPlus size={13} />
          </span>
          <span>
            {newOnes.length} {newOnes.length === 1 ? "curier nou găsit" : "curieri noi găsiți"} pe raport (nu există încă în CRM)
          </span>
        </div>
        <div className="text-[11px] text-amber-300/80">
          Apasă pe un curier ca să mergi direct pe rândul lui și să-i setezi comisionul:
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {newOnes.map((d) => {
          const isConfigured = configuredUids.has(d.uid) || d.commissionPct !== 10 || d.baseFeeRon !== 210;
          const isFocused = focusedUid === d.uid;
          return (
            <div
              key={d.uid}
              className={cn(
                "group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11.5px] transition-all",
                isFocused
                  ? "border-amber-400 bg-amber-400/25 text-white ring-2 ring-amber-400/60 shadow-md shadow-amber-500/20 scale-[1.02]"
                  : isConfigured
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 hover:border-emerald-400"
                  : "border-amber-500/50 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25 hover:border-amber-400",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectCourier(d.uid)}
                className="flex items-center gap-1.5 font-medium hover:underline text-left cursor-pointer"
                title="Apasă pentru a merge la rândul acestui curier"
              >
                {isConfigured ? (
                  <Check size={12} className="text-emerald-400 font-bold" />
                ) : (
                  <UserPlus size={12} className="text-amber-400" />
                )}
                <span className="font-semibold text-fg">{d.fullName || d.uid}</span>
                <span className={cn(
                  "rounded px-1.5 py-0.2 font-mono text-[10px]",
                  isConfigured ? "bg-emerald-500/25 text-emerald-200" : "bg-black/40 text-amber-200",
                )}>
                  {d.commissionPct}% · {d.weeklyFeeRon} RON
                </span>
                <ArrowRight size={10} className="text-fg-dim opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                type="button"
                onClick={() => onToggleCreate(d.uid)}
                className="ml-1 text-[10px] text-fg-dim hover:text-rose-300"
                title="Nu crea acest curier"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Construiește payload-ul Courier dintr-un draft de import. Extras ca să scad complexitatea din confirmImport. */
function buildCourierFromDraft(d: Draft, platformKey: PlatformKey, tenantId: string, createdBy: string) {
  const incompleteFields: IncompleteFieldKey[] = [];
  if (!d.email) incompleteFields.push("email");
  if (!d.phone) incompleteFields.push("phone");
  if (!d.city)  incompleteFields.push("city");
  incompleteFields.push("vehicleType", "vehicleOwnership");
  return {
    fullName: d.fullName || d.uid,
    phone:    d.phone ?? "",
    email:    d.email,
    nationality: "ro" as const,
    city:     d.city ?? "",
    platforms: [platformKey],
    vehicleType: "scooter" as const,
    vehicleOwnership: "own" as const,
    collaboration: "collaboration" as const,
    commissionPct: d.commissionPct,
    weeklyContractFeeRon: d.baseFeeRon,
    status: "active" as const,
    incompleteFields,
    createdBy,
    tenantId,
    ...(platformKey === "bolt" ? { boltUid: d.uid } : {}),
  };
}
