"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPaste, FileSpreadsheet, Info, Loader2, Search, Upload, UserPlus, Wand2 } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { usePayments } from "@/lib/payments/context";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import type { IncompleteFieldKey } from "@/lib/couriers/types";
import { EMPTY_BREAKDOWN } from "@/lib/payments/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import {
  PARSERS, autoDetect, autoDetectText, computeImportRowMath, defaultCommissionFor, defaultWeeklyFeeFor, getParser,
  type ParserKey, type PlatformImportRow, type PlatformParser,
} from "@/lib/payments/imports";
import { useDuplicatePairs } from "@/lib/subcontractors/duplicate-pairs-context";
import { cn } from "@/lib/utils/cn";

type Draft = PlatformImportRow & {
  matchedCourierId: string | null;
  matchMethod: "uid" | "name" | "email" | "phone" | "none";
  commissionPct: number;
  weeklyFeeRon: number;
  grossRon: number;
  commissionRon: number;
  netRon: number;
  /** Marcaj: rândul e ignorat pentru că e duplicat al altui rând din același fișier. */
  duplicateOfUid?: string;
};

/** Perioadă săptămâna curentă (Luni-Duminică) ISO local. */
function currentWeekIso(): { start: string; end: string } {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return { start: iso(monday), end: iso(sunday) };
}

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
  // 2. Nume normalizat (case + diacritice + spații)
  const target = normalizeName(row.fullName);
  if (target) {
    const byName = fleet.find((c) => normalizeName(c.fullName) === target);
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
  open, onClose, onlyGroup,
}: {
  open: boolean;
  onClose: () => void;
  /** Filtrează parserele afișate doar la grupul specificat (TTG sau Gusty). */
  onlyGroup?: "ttg" | "gusty";
}) {
  const toast = useToast();
  const { user, activeFleetId } = useSession();
  const { allRows, addCourier } = useCouriers();
  const { addPayment, payments: allPayments } = usePayments();
  const { groupFor: duplicateGroupFor, pairOptionsFor } = useDuplicatePairs();

  const [platform, setPlatform] = useState<ParserKey | "auto">("auto");
  // Când open devine true sau se schimbă grupul, resetează
  useEffect(() => {
    if (open) setPlatform("auto");
  }, [open, onlyGroup]);
  const [resolvedParser, setResolvedParser] = useState<PlatformParser | null>(null);
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
    onClose();
  };

  function buildDrafts(parser: PlatformParser, parsed: PlatformImportRow[]) {
    setResolvedParser(parser);
    // Perioada curentă (aceeași folosită la confirmImport)
    const { start: currentStart } = currentWeekIso();
    // Dedupe INTRA-FIȘIER: dacă același UID apare de mai multe ori, îl păstrez pe primul.
    const seenUids = new Set<string>();
    // Verificare conturi duble: dacă persoana e într-o pereche cu unifyFee=true
    // și are deja o plată în perioadă pe alt alias, taxa se aplică o singură dată.
    const feeAlreadyPaidForPerson = (fullName: string): boolean => {
      const opts = pairOptionsFor(fullName);
      if (opts?.feeOnce == null) return false;
      const group = duplicateGroupFor(fullName);
      if (!group) return false;
      const aliasNames = new Set(group.aliases.map((a) => normalizeName(a.name)));
      return allPayments.some((p) =>
        p.fleetId === activeFleetId
        && p.periodStartIso === currentStart
        && p.recipient.kind === "courier"
        && aliasNames.has(normalizeName(p.recipient.name)),
      );
    };
    const nextDrafts: Draft[] = parsed.map((r) => {
      const match = matchCourier(r, parser.platform, allRows, activeFleetId);
      const courier = match ? allRows.find((c) => c.id === match.id) : null;
      const pct = courier?.commissionPct ?? defaultCommissionFor(r.fullName);
      const baseFee = courier?.weeklyContractFeeRon ?? defaultWeeklyFeeFor(r.fullName);
      const fee = feeAlreadyPaidForPerson(r.fullName) ? 0 : baseFee;
      const derived = computeImportRowMath(r, pct, fee);
      const uidKey = r.uid.toLowerCase();
      const isDupInFile = seenUids.has(uidKey);
      if (!isDupInFile) seenUids.add(uidKey);
      return {
        ...r,
        matchedCourierId: match?.id ?? null,
        matchMethod: match?.method ?? "none",
        commissionPct: pct,
        weeklyFeeRon: fee,
        ...derived,
        duplicateOfUid: isDupInFile ? r.uid : undefined,
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
      const merged = { ...d, ...patch };
      const derived = computeImportRowMath(merged, merged.commissionPct, merged.weeklyFeeRon);
      return { ...merged, ...derived };
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
    const totalNet = active.reduce((s, d) => s + d.netRon, 0);
    const matched = active.filter((d) => d.matchedCourierId).length;
    const willCreate = active.filter((d) => !d.matchedCourierId && creatingNew.has(d.uid)).length;
    const noMatchIgnored = active.filter((d) => !d.matchedCourierId && !creatingNew.has(d.uid)).length;
    return {
      totalRows: drafts.length, active: active.length, skipped: skipped.size,
      matched, willCreate, noMatchIgnored,
      totalGross: round2(totalGross), totalCommission: round2(totalCommission), totalNet: round2(totalNet),
    };
  }, [drafts, skipped, creatingNew]);

  async function confirmImport() {
    if (!resolvedParser) return;
    setBusy(true);
    let newCouriers = 0;
    let paymentsCount = 0;
    const { start: periodStart, end: periodEnd } = currentWeekIso();
    const platformKey = resolvedParser.platform;
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
        paymentDateIso: periodEnd,
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
        reference: `${resolvedParser.label} import · UID ${d.uid}`,
        notes: `Import automat din raport ${resolvedParser.label} (perioada ${periodStart} → ${periodEnd}).`,
        overrideReason: null,
        ordersCount: d.ordersCount,
        platforms: [platformKey],
        commissionPercentage: d.commissionPct,
        currency: "RON",
        ibanSnapshot: courier?.iban ?? null,
        operatorName: user.name,
      });
      paymentsCount++;
    }
    setImported({ paymentsCount, newCouriers });
    setStep("done");
    setBusy(false);
    toast.success("Import finalizat", `${paymentsCount} plăți create, ${newCouriers} curieri noi.`);
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
  parserLabel, drafts, skipped, creatingNew, summary,
  onUpdate, onToggleSkip, onToggleCreate, onBack, onConfirm, busy,
}: {
  parserLabel: string;
  drafts: Draft[];
  skipped: Set<string>;
  creatingNew: Set<string>;
  summary: { totalRows: number; active: number; skipped: number; matched: number; willCreate: number; noMatchIgnored: number; totalGross: number; totalCommission: number; totalNet: number };
  onUpdate: (uid: string, patch: Partial<Pick<Draft, "commissionPct" | "weeklyFeeRon">>) => void;
  onToggleSkip: (uid: string) => void;
  onToggleCreate: (uid: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = drafts.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return d.fullName.toLowerCase().includes(q) || d.uid.toLowerCase().includes(q);
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] text-fg-muted">
        Sursă: <b className="text-fg">{parserLabel}</b>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Rânduri" value={String(summary.active)} sub={`din ${summary.totalRows}`} tone="sky" />
        <SummaryCard label="Brut total" value={`${summary.totalGross.toFixed(2)}`} sub="RON" tone="emerald" />
        <SummaryCard label="Comision total" value={`${summary.totalCommission.toFixed(2)}`} sub="RON" tone="amber" />
        <SummaryCard label="Net de plată" value={`${summary.totalNet.toFixed(2)}`} sub="RON" tone="violet" />
      </div>
      <div className="flex flex-wrap gap-2 text-[11px]">
        <StatusChip icon={<CheckCircle2 size={11} />} label={`${summary.matched} găsiți`} tone="emerald" />
        {summary.willCreate > 0 && <StatusChip icon={<UserPlus size={11} />} label={`${summary.willCreate} creați automat`} tone="violet" />}
        {summary.skipped > 0 && <StatusChip icon={<Info size={11} />} label={`${summary.skipped} skip`} tone="amber" />}
        {summary.noMatchIgnored > 0 && <StatusChip icon={<AlertTriangle size={11} />} label={`${summary.noMatchIgnored} fără match`} tone="rose" />}
      </div>

      {/* Panou dedicat: curieri noi care vor fi adăugați în baza de date */}
      <NewCouriersPanel drafts={drafts} skipped={skipped} creatingNew={creatingNew} onToggleCreate={onToggleCreate} />
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-dim" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Caută nume sau UID…"
          className="w-full rounded-md border border-line bg-card-2 py-1.5 pl-8 pr-2.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
        />
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
              return (
                <tr key={d.uid} className={cn("border-b border-line/60", isSkipped && "opacity-40")}>
                  <td className="px-2 py-1.5">
                    <div className="font-semibold text-fg">{d.fullName}</div>
                    <div className="font-mono text-[10px] text-fg-dim">{d.uid}</div>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-fg">{d.grossRon.toFixed(2)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <input type="number" min={0} max={100} step={0.5} value={d.commissionPct}
                        onChange={(e) => onUpdate(d.uid, { commissionPct: Number(e.target.value) })}
                        className="w-12 rounded border border-line bg-card-2 px-1 py-0.5 text-right font-mono text-[11px] text-fg" />
                      <span className="font-mono text-[10.5px] tabular-nums text-fg-muted whitespace-nowrap">
                        = {d.commissionRon.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <input type="number" min={0} step={10} value={d.weeklyFeeRon}
                      onChange={(e) => onUpdate(d.uid, { weeklyFeeRon: Number(e.target.value) })}
                      className="w-16 rounded border border-line bg-card-2 px-1 py-0.5 text-right font-mono text-[11px] text-fg" />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-fg-muted">{d.negativeBalanceRon.toFixed(2)}</td>
                  <td className={cn("px-2 py-1.5 text-right font-mono tabular-nums font-bold", d.netRon < 0 ? "text-rose-300" : "text-emerald-300")}>
                    {d.netRon.toFixed(2)}
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

/** Panou dedicat: arată clar ce curieri NOI se vor adăuga în baza de date. */
function NewCouriersPanel({
  drafts, skipped, creatingNew, onToggleCreate,
}: {
  drafts: Draft[];
  skipped: Set<string>;
  creatingNew: Set<string>;
  onToggleCreate: (uid: string) => void;
}) {
  const newOnes = drafts.filter(
    (d) => !skipped.has(d.uid) && !d.matchedCourierId && creatingNew.has(d.uid) && !d.duplicateOfUid,
  );
  if (newOnes.length === 0) return null;
  return (
    <div className="rounded-xl border border-violet-500/40 bg-violet-500/[0.06] p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-violet-100">
          <UserPlus size={13} /> {newOnes.length} curieri noi vor fi adăugați în CRM
        </div>
        <div className="text-[10.5px] text-fg-muted">
          Se salvează cu datele din raport. Poți completa profilul (IBAN, oraș etc.) ulterior din pagina Curieri.
        </div>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {newOnes.map((d) => (
          <li key={d.uid} className="flex items-center gap-2 rounded-md border border-violet-500/25 bg-card-2/50 px-2 py-1.5 text-[11.5px]">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-fg">{d.fullName || d.uid}</span>
              <span className="block truncate text-[10px] text-fg-dim">
                {d.uid} · {d.city ?? "fără oraș"}{d.phone ? ` · ${d.phone}` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onToggleCreate(d.uid)}
              className="rounded border border-line bg-card px-1.5 py-0.5 text-[9.5px] font-semibold text-fg-muted hover:text-fg"
              title="Nu crea acest curier"
            >
              nu crea
            </button>
          </li>
        ))}
      </ul>
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
    nationality: "RO" as const,
    city:     d.city ?? "",
    platforms: [platformKey],
    vehicleType: "scooter" as const,
    vehicleOwnership: "personal" as const,
    collaboration: "pfa" as const,
    commissionPct: d.commissionPct,
    weeklyContractFeeRon: d.weeklyFeeRon,
    status: "active" as const,
    incompleteFields,
    createdBy,
    tenantId,
    ...(platformKey === "bolt" ? { boltUid: d.uid } : {}),
  };
}
