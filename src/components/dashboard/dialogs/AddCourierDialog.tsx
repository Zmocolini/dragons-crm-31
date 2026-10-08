"use client";

import {
  AlertTriangle, Bike, Building2, Car, Check, Clock, FileText, Home, Info, Key,
  Mail, Paperclip, Phone, Settings, Trash2, Upload, UserPlus, X, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IdCardScan, type ScannedIdDoc } from "@/components/couriers/IdCardScan";
import { RentProfitPanel, VehicleCostCalculator } from "@/components/couriers/VehicleCostCalculator";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useToast } from "@/components/ui/Toast";
import { useCandidates } from "@/lib/candidates/context";
import type { Nationality } from "@/lib/candidates/types";
import { NATIONALITY_LABEL, NATIONALITY_OPTIONS } from "@/lib/candidates/types";
import { useCouriers } from "@/lib/couriers/context";
import { useDocuments } from "@/lib/documents/context";
import { resizeImageFile } from "@/lib/utils/image";
import { DOCUMENT_TYPE_LABEL, type DocumentType } from "@/lib/documents/types";
import {
  COURIER_STATUS_LABEL, INCOMPLETE_FIELD_LABEL,
  VEHICLE_OWNERSHIP_LABEL, VEHICLE_TYPE_LABEL,
  type Courier, type CourierDuplicateMatch, type CourierStatus,
  type IncompleteFieldKey, type VehicleOwnership, type VehicleType,
} from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import { cn } from "@/lib/utils/cn";
import { isValidCnp, type IdCardFields } from "@/lib/couriers/id-card";
import { costDefaults, rentProfit, weeklyVehicleCost, type VehicleCost } from "@/lib/couriers/vehicle-cost";

const PLATFORM_NAME: Record<PlatformKey, string> = {
  bolt:  "Bolt Food",
  wolt:  "Wolt",
  glovo: "Glovo",
};

const VEHICLE_ICON: Record<VehicleType, LucideIcon> = {
  bike:    Bike,
  e_bike:  Zap,
  scooter: Bike,
  car:     Car,
};

const COUNTRY_CODES: { code: string; flag: string; label: string }[] = [
  { code: "+40",  flag: "🇷🇴", label: "România" },
  { code: "+373", flag: "🇲🇩", label: "Moldova" },
  { code: "+359", flag: "🇧🇬", label: "Bulgaria" },
  { code: "+36",  flag: "🇭🇺", label: "Ungaria" },
  { code: "+380", flag: "🇺🇦", label: "Ucraina" },
  { code: "+381", flag: "🇷🇸", label: "Serbia" },
  { code: "+90",  flag: "🇹🇷", label: "Turcia" },
  { code: "+44",  flag: "🇬🇧", label: "Marea Britanie" },
  { code: "+49",  flag: "🇩🇪", label: "Germania" },
  { code: "+39",  flag: "🇮🇹", label: "Italia" },
  { code: "+34",  flag: "🇪🇸", label: "Spania" },
  { code: "+33",  flag: "🇫🇷", label: "Franța" },
  { code: "+880", flag: "🇧🇩", label: "Bangladesh" },
  { code: "+977", flag: "🇳🇵", label: "Nepal" },
  { code: "+94",  flag: "🇱🇰", label: "Sri Lanka" },
  { code: "+91",  flag: "🇮🇳", label: "India" },
  { code: "+92",  flag: "🇵🇰", label: "Pakistan" },
  { code: "+63",  flag: "🇵🇭", label: "Filipine" },
  { code: "+84",  flag: "🇻🇳", label: "Vietnam" },
];

type FormState = {
  fullName: string;
  cnp: string;
  phoneCode: string;
  phone: string;
  email: string;
  nationality: Nationality;
  city: string;
  platforms: PlatformKey[];
  waitlistedPlatforms: PlatformKey[];
  vehicleType: VehicleType;
  vehicleOwnership: VehicleOwnership;
  vehicleCost: Omit<VehicleCost, "weeklyRon">;
  collaboration: string;
  commissionPct: number;
  /** Gol = nesetat (la import se aplică regula implicită a flotei). */
  weeklyContractFeeRon: string;
  iban: string;
  status: CourierStatus;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  cnp: "",
  phoneCode: "+40",
  phone: "",
  email: "",
  nationality: "ro",
  city: "",
  platforms: [],
  waitlistedPlatforms: [],
  vehicleType: "bike",
  vehicleOwnership: "own",
  vehicleCost: {},
  collaboration: "",
  commissionPct: 10,
  weeklyContractFeeRon: "",
  iban: "",
  status: "active",
};

type Step = 1 | 2 | 3;

export function AddCourierDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (c: Courier) => void;
}) {
  const { user, activeFleetId } = useSession();
  const { settings } = useSettings();
  const { addCourier, findDuplicates } = useCouriers();
  const { candidates } = useCandidates();
  void candidates; // duplicate check e în findDuplicates
  const { addDocument } = useDocuments();
  const { logActivity } = useProfile();
  const toast = useToast();

  type PendingDoc = { id: string; name: string; size: number; type: string; dataUrl: string; docType?: DocumentType; expiryIso?: string | null };

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [showCountry, setShowCountry] = useState(false);
  const [step]  = useState<Step>(1);
  // Step 2/3 sunt vizuale (indicator) — form-ul e single-page. TODO(real-users): sub-fluxuri Activare + Documente reale.

  useEffect(() => {
    if (open) {
      const defaultCity = settings.cities.find((c) => c.status === "active")?.name ?? "";
      setForm({ ...EMPTY_FORM, city: defaultCity });
      setErrors({});
      setConfirmClose(false);
      setPendingDocs([]);
    }
  }, [open, settings.cities]);

  async function handlePickDocs(fileList?: FileList | null) {
    if (!fileList) return;
    for (const f of Array.from(fileList)) {
      if (f.size > 10 * 1024 * 1024) {
        toast.error("Fișier prea mare", `${f.name} depășește 10 MB.`);
        continue;
      }
      try {
        const isImage = f.type.startsWith("image/");
        let dataUrl: string;
        if (isImage) {
          // Compresie agresivă JPEG 800px q0.75 → 30-100 KB per poză, încape multe în localStorage.
          dataUrl = await resizeImageFile(f, 800, { format: "jpeg", quality: 0.75 });
        } else {
          dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(new Error("read fail"));
            r.readAsDataURL(f);
          });
        }
        setPendingDocs((prev) => [...prev, {
          id: `pdoc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: f.name, size: f.size, type: f.type || "application/octet-stream",
          dataUrl,
        }]);
      } catch {
        toast.error("Eroare", `Nu s-a putut citi ${f.name}.`);
      }
    }
  }

  function applyIdCard(f: IdCardFields, doc: ScannedIdDoc) {
    setForm((prev) => ({ ...prev, fullName: f.fullName ?? prev.fullName, cnp: f.cnp ?? prev.cnp }));
    // Un singur act de identitate per curier nou: rescanarea îl înlocuiește.
    setPendingDocs((prev) => [
      ...prev.filter((d) => d.docType !== "id_card"),
      { id: `pdoc_id_${Date.now()}`, ...doc, docType: "id_card", expiryIso: f.expiryIso ?? null },
    ]);
  }

  function setVehicle(patch: Partial<Pick<FormState, "vehicleType" | "vehicleOwnership">>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      // Valorile de pornire ale calculatorului se schimbă cu tipul (mașină vs scuter); chiria rămâne.
      const typeChanged = patch.vehicleType && patch.vehicleType !== prev.vehicleType;
      return typeChanged ? { ...next, vehicleCost: { ...costDefaults(next.vehicleType), rentWeeklyRon: prev.vehicleCost.rentWeeklyRon, rentCostRon: prev.vehicleCost.rentCostRon } } : next;
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dirty = useMemo(() =>
    form.fullName.trim() !== "" ||
    form.phone.trim() !== "" ||
    form.email.trim() !== "" ||
    form.platforms.length > 0,
  [form]);

  const activeCities = useMemo(
    () => settings.cities.filter((c) => c.status === "active"),
    [settings.cities],
  );
  const activePlatforms = useMemo(
    () => (Object.keys(PLATFORM_NAME) as PlatformKey[]).filter((p) => settings.platforms[p] === "active"),
    [settings.platforms],
  );

  const duplicates: CourierDuplicateMatch[] = useMemo(() => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (phoneDigits.length < 6 && !emailOk) return [];
    return findDuplicates(`${form.phoneCode} ${form.phone}`, emailOk ? form.email : null);
  }, [form.phoneCode, form.phone, form.email, findDuplicates]);

  function requestClose() {
    if (dirty) setConfirmClose(true);
    else onClose();
  }

  /**
   * Detectează câmpurile lipsă/incomplete + erorile HARD (format greșit — email invalid).
   * Câmpurile required cu asterisc NU blochează salvarea; se marchează pentru completare ulterioară.
   */
  function analyzeForm(): { hardErrors: Record<string, string>; incomplete: IncompleteFieldKey[] } {
    const hardErrors: Record<string, string> = {};
    const incomplete: IncompleteFieldKey[] = [];

    if (!form.fullName.trim()) incomplete.push("fullName");
    else if (form.fullName.trim().split(/\s+/).length < 2) {
      incomplete.push("fullName");
    }

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 6) incomplete.push("phone");

    // Email este OPȚIONAL. Doar formatul valid este cerut dacă e completat.
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      hardErrors.email = "Format email invalid.";
    }
    if (form.cnp && !isValidCnp(form.cnp)) hardErrors.cnp = "CNP invalid (13 cifre, cifra de control nu se potrivește).";

    if (!form.city) incomplete.push("city");
    if (form.platforms.length === 0) incomplete.push("platforms");
    if (!form.collaboration.trim()) incomplete.push("collaboration");

    return { hardErrors, incomplete };
  }

  function submit(asDraft: boolean) {
    const { incomplete } = analyzeForm();
    setErrors({});
    const isSubcontractor = user.role === "subcontractor_owner";
    const courierStatus: CourierStatus = isSubcontractor ? "pending" : (asDraft ? "draft" : form.status);

    const courier = addCourier({
      fullName: form.fullName.trim() || "Curier nou (fără nume)",
      phone: form.phone.trim() ? `${form.phoneCode} ${form.phone.trim().replace(/^\+\d{1,3}[\s-]?/, "").replace(/^0+/, "")}` : "",
      email: form.email.trim() || null,
      nationality: form.nationality,
      city: form.city,
      platforms: form.platforms,
      waitlistedPlatforms: form.waitlistedPlatforms,
      vehicleType: form.vehicleType,
      vehicleOwnership: form.vehicleOwnership,
      collaboration: form.collaboration.trim(),
      commissionPct: form.commissionPct,
      weeklyContractFeeRon: form.weeklyContractFeeRon === "" ? undefined : Math.max(0, Number(form.weeklyContractFeeRon) || 0),
      iban: form.iban.trim() || undefined,
      cnp: form.cnp || undefined,
      vehicleCost: form.vehicleOwnership === "rented"
        ? { ...form.vehicleCost, weeklyRon: weeklyVehicleCost("rented", form.vehicleType, form.vehicleCost), profitWeeklyRon: rentProfit(form.vehicleCost.rentWeeklyRon, form.vehicleCost.rentCostRon) }
        : undefined,
      status: courierStatus,
      incompleteFields: incomplete,
      createdBy: user.id,
      tenantId: user.activeTenant.id,
    });

    // Atașez documentele de curierul nou creat.
    const subject = { id: courier.id, name: courier.fullName, kind: "courier" as const, city: courier.city, platform: null };
    pendingDocs.forEach((pd) => {
      addDocument({
        tenantId: user.activeTenant.id, fleetId: activeFleetId, subject, type: pd.docType ?? "other", status: "in_review",
        expiryIso: pd.expiryIso ?? null,
        file: { name: pd.name, size: pd.size, type: pd.type, objectUrl: pd.dataUrl },
        ocrEnabled: false, ocrProposed: null, verifiedManually: false, notes: null,
        createdBy: user.name,
      }, user.name);
    });

    logActivity(
      "candidate.create",
      `Curier nou: ${courier.fullName} (${courier.phone || "—"})${asDraft ? " — draft" : ""}${incomplete.length ? ` · ${incomplete.length} câmpuri lipsă` : ""}`,
      "Curieri",
    );

    if (incomplete.length > 0) {
      toast.success(
        asDraft ? "Draft salvat." : "Curier creat cu date parțiale.",
        `${courier.fullName} · ${incomplete.length} câmpuri de completat: ${incomplete.slice(0, 3).map((k) => INCOMPLETE_FIELD_LABEL[k]).join(", ")}${incomplete.length > 3 ? "..." : ""}`,
      );
    } else {
      toast.success(
        asDraft ? "Draft salvat." : "Curier creat.",
        `${courier.fullName} · ${VEHICLE_TYPE_LABEL[courier.vehicleType]}`,
      );
    }

    onCreated?.(courier);
    onClose();
  }

  // Live warnings — soft, nu blochează
  const live = useMemo(() => analyzeForm(), [form]);
  const liveIncomplete = live.incomplete;
  const liveErrors = live.hardErrors;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isIncomplete = (key: IncompleteFieldKey) => liveIncomplete.includes(key);

  function togglePlatform(p: PlatformKey) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  }

  function toggleWaitlist(p: PlatformKey) {
    setForm((prev) => ({
      ...prev,
      waitlistedPlatforms: prev.waitlistedPlatforms.includes(p)
        ? prev.waitlistedPlatforms.filter((x) => x !== p)
        : [...prev.waitlistedPlatforms, p],
    }));
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-courier-title"
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={requestClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="relative my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-line/60 px-6 py-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white">
            <UserPlus size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="add-courier-title" className="text-[17px] font-bold text-fg">Curier nou</h2>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              Adaugă un curier și configurează datele inițiale.
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {duplicates.length > 0 && <DuplicatesBanner matches={duplicates} />}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Date curier */}
            <FormCard title="Date curier" icon={UserPlus}>
              <IdCardScan onScanned={applyIdCard} onPickName={(fullName) => setForm((prev) => ({ ...prev, fullName }))} />
              <Field label="Nume complet" required incomplete={isIncomplete("fullName")} error={errors.fullName}>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ex.: Andrei Popescu"
                  className="dd-input"
                />
              </Field>

              <Field label="CNP" hint="Din buletin sau manual" error={liveErrors.cnp}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.cnp}
                  onChange={(e) => setForm({ ...form, cnp: e.target.value.replace(/\D/g, "").slice(0, 13) })}
                  placeholder="13 cifre"
                  className="dd-input font-mono tracking-wider"
                />
              </Field>

              <Field label="Telefon" required incomplete={isIncomplete("phone")} error={errors.phone}>
                <div className="flex overflow-hidden rounded-lg border border-line bg-card-2 focus-within:border-violet-500/60">
                  {showCountry ? (
                    <select
                      value={form.phoneCode}
                      onChange={(e) => { setForm({ ...form, phoneCode: e.target.value }); setShowCountry(false); }}
                      onBlur={() => setShowCountry(false)}
                      autoFocus
                      aria-label="Prefix țară"
                      className="h-10 shrink-0 border-r border-line bg-card-2 pl-2 pr-1 text-[12.5px] text-fg focus:outline-none"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCountry(true)}
                      aria-label="Schimbă țara"
                      title="Schimbă țara"
                      className="h-10 shrink-0 border-r border-line bg-card-2 px-2 text-[12.5px] font-medium text-fg-muted hover:text-fg focus:outline-none"
                    >
                      {COUNTRY_CODES.find((c) => c.code === form.phoneCode)?.flag ?? "🇷🇴"} {form.phoneCode}
                    </button>
                  )}
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={form.phone}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const m = raw.match(/^\+(\d{1,3})[\s-]?/);
                      if (m) {
                        const code = "+" + m[1];
                        const known = COUNTRY_CODES.find((c) => c.code === code);
                        if (known) {
                          setForm({ ...form, phoneCode: code, phone: raw.slice(m[0].length) });
                          return;
                        }
                      }
                      setForm({ ...form, phone: raw });
                    }}
                    placeholder="07XX XXX XXX"
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
                  />
                </div>
              </Field>

              <Field label="E-mail" hint="Opțional" error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ex: andrei.popescu@email.ro"
                  className="dd-input"
                />
              </Field>

              <Field label="Naționalitate">
                <select
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value as Nationality })}
                  className="dd-input"
                >
                  {NATIONALITY_OPTIONS.map((n) => (
                    <option key={n} value={n}>{NATIONALITY_LABEL[n]}</option>
                  ))}
                </select>
              </Field>
            </FormCard>

            {/* Configurare activare */}
            <FormCard title="Configurare activare" icon={Settings}>
              <Field label="Oraș activare" required incomplete={isIncomplete("city")}>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value, ...(e.target.value === "Chișinău" ? { phoneCode: "+373" } : {}) })}
                  className="dd-input"
                >
                  {activeCities.length === 0 && <option value="">Niciun oraș activ</option>}
                  {activeCities.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Platforme" required incomplete={isIncomplete("platforms")}>
                <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2 py-1.5">
                  {form.platforms.length === 0 && (
                    <span className="px-1 text-[11.5px] italic text-fg-dim">
                      Nicio platformă selectată
                    </span>
                  )}
                  {form.platforms.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/15 pl-1.5 pr-2 py-0.5 text-[11px] font-semibold text-violet-100"
                    >
                      <PlatformLogo platform={p} size={14} rounded="md" />
                      {PLATFORM_NAME[p]}
                      <button
                        type="button"
                        onClick={() => togglePlatform(p)}
                        aria-label={`Elimină ${PLATFORM_NAME[p]}`}
                        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded text-violet-200 hover:bg-violet-500/30"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <div className="ml-auto flex items-center gap-1">
                    {activePlatforms.filter((p) => !form.platforms.includes(p)).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        aria-label={`Adaugă ${PLATFORM_NAME[p]}`}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
                        title={`Adaugă ${PLATFORM_NAME[p]}`}
                      >
                        <PlatformLogo platform={p} size={12} rounded="md" />
                        +
                      </button>
                    ))}
                  </div>
                </div>
              </Field>

              <Field label="Așteaptă și pe" hint="Opțional">
                <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2 py-1.5">
                  {form.waitlistedPlatforms.length === 0 && (
                    <span className="px-1 text-[11.5px] italic text-fg-dim">
                      Nicio platformă în așteptare
                    </span>
                  )}
                  {form.waitlistedPlatforms.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 pl-1.5 pr-2 py-0.5 text-[11px] font-semibold text-amber-100"
                    >
                      <Clock size={11} className="text-amber-300" />
                      <PlatformLogo platform={p} size={14} rounded="md" />
                      {PLATFORM_NAME[p]}
                      <button
                        type="button"
                        onClick={() => toggleWaitlist(p)}
                        aria-label={`Scoate ${PLATFORM_NAME[p]} din așteptare`}
                        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded text-amber-200 hover:bg-amber-500/30"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <div className="ml-auto flex items-center gap-1">
                    {activePlatforms.filter((p) => !form.platforms.includes(p) && !form.waitlistedPlatforms.includes(p)).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleWaitlist(p)}
                        aria-label={`Așteaptă ${PLATFORM_NAME[p]}`}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-muted hover:bg-amber-500/15 hover:text-amber-200"
                        title={`Așteaptă ${PLATFORM_NAME[p]}`}
                      >
                        <PlatformLogo platform={p} size={12} rounded="md" />
                        +
                      </button>
                    ))}
                  </div>
                </div>
              </Field>

              <Field label="Vehicul" required>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).filter((v) => settings.fleet.vehicleTypesAllowed[v]).map((v) => {
                    const Icon = VEHICLE_ICON[v];
                    const on = form.vehicleType === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVehicle({ vehicleType: v })}
                        aria-pressed={on}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-xl border p-2 text-[10.5px] font-medium leading-tight transition-colors",
                          on
                            ? "border-violet-500/60 bg-violet-500/[0.15] text-violet-100"
                            : "border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
                        )}
                      >
                        <Icon size={16} className={on ? "text-violet-200" : "text-fg-dim"} />
                        {VEHICLE_TYPE_LABEL[v]}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Tip vehicul" required>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(VEHICLE_OWNERSHIP_LABEL) as VehicleOwnership[]).filter((o) => (o === "own" ? settings.fleet.allowOwnVehicle : settings.fleet.allowRentedVehicle)).map((o) => {
                    const on = form.vehicleOwnership === o;
                    const Icon = o === "own" ? Home : Key;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setVehicle({ vehicleOwnership: o })}
                        aria-pressed={on}
                        className={cn(
                          "inline-flex items-center justify-center gap-2 rounded-lg border py-2 text-[12px] font-semibold transition-colors",
                          on
                            ? "border-violet-500/60 bg-violet-500/[0.18] text-violet-100"
                            : "border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
                        )}
                      >
                        <Icon size={13} />
                        {VEHICLE_OWNERSHIP_LABEL[o]}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {form.vehicleOwnership === "rented" && (
                <RentProfitPanel value={form.vehicleCost} onChange={(vehicleCost) => setForm({ ...form, vehicleCost })} />
              )}
            </FormCard>
          </div>

          {/* Evidență vehicul — doar la închiriat; la „propriu" nu se ține nimic. */}
          {form.vehicleOwnership === "rented" && <FormCard title={`Evidență vehicul · ${VEHICLE_TYPE_LABEL[form.vehicleType]} (${VEHICLE_OWNERSHIP_LABEL[form.vehicleOwnership].toLowerCase()})`} icon={Car}>
            <VehicleCostCalculator
              ownership={form.vehicleOwnership}
              type={form.vehicleType}
              value={form.vehicleCost}
              onChange={(vehicleCost) => setForm({ ...form, vehicleCost })}
              commissionPct={form.commissionPct}
              contractFeeRon={Number(form.weeklyContractFeeRon) || 0}
            />
          </FormCard>}

          {/* Documente (opțional) */}
          <FormCard title="Documente" icon={FileText}>
            <div className="space-y-2">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-card-2/40 py-6 text-[12px] text-fg-muted transition-colors hover:border-violet-500/50 hover:text-violet-200">
                <Upload size={14} />
                <span>Adaugă documente</span>
                <span className="text-[10.5px] text-fg-dim">PDF sau imagini, max 10 MB / fișier</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => { handlePickDocs(e.target.files); e.target.value = ""; }}
                />
              </label>
              {pendingDocs.length > 0 && (
                <ul className="space-y-1.5">
                  {pendingDocs.map((pd) => (
                    <li key={pd.id} className="flex items-center gap-2 rounded-lg border border-line bg-card-2/50 px-2 py-1.5">
                      <FileText size={13} className="shrink-0 text-fg-dim" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-[12px] text-fg">{pd.name}</div>
                        <div className="text-[10px] text-fg-dim">{(pd.size / 1024).toFixed(0)} KB</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingDocs((prev) => prev.filter((x) => x.id !== pd.id))}
                        aria-label="Șterge"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-fg-dim hover:bg-rose-500/15 hover:text-rose-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormCard>

          {/* Contract */}
          <FormCard title="Contract" icon={FileText}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tip colaborare" required>
                <input
                  type="text"
                  value={form.collaboration}
                  onChange={(e) => setForm({ ...form, collaboration: e.target.value })}
                  placeholder="Ex.: Contract colaborare, PFA, CIM 8h"
                  className="dd-input"
                />
              </Field>
              <Field label="Comision flotă (%)" required>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.commissionPct}
                    onChange={(e) => setForm({ ...form, commissionPct: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                    className="dd-input pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-fg-dim">%</span>
                </div>
              </Field>
              <Field label="Taxă contract / săptămână">
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={form.weeklyContractFeeRon}
                    onChange={(e) => setForm({ ...form, weeklyContractFeeRon: e.target.value })}
                    placeholder="Suma dorită"
                    className="dd-input pr-14 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-fg-dim">RON</span>
                </div>
                <span className="text-[10.5px] text-fg-dim">Se scade din plata săptămânală.</span>
              </Field>
            </div>
            <Field label="IBAN" hint="Opțional">
              <input
                type="text"
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
                placeholder="RO49 AAAA 1B31 0075 9384 0000"
                className="dd-input font-mono tracking-wider"
              />
            </Field>
          </FormCard>
        </div>

        {/* Subcontractor notice */}
        {user.role === "subcontractor_owner" && (
          <div className="flex items-center gap-2 border-t border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-[12px] text-amber-200">
            <Info size={14} className="shrink-0 text-amber-400" />
            <span>Curierul va fi adăugat cu statusul <b>În așteptare (Pending)</b> până la confirmarea și activarea de către flotă.</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 bg-card-2/40 px-6 py-4">
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg border border-line bg-card px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
          >
            Anulează
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => submit(true)}
              className="text-[12.5px] font-semibold text-violet-300 underline-offset-4 hover:text-violet-200 hover:underline"
            >
              Salvează ca draft
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
            >
              {user.role === "subcontractor_owner" ? "Trimite spre aprobare flotă" : "Creează curier"}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Confirm close */}
      {confirmClose && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setConfirmClose(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-bold text-fg">Închizi fără să salvezi?</h3>
            <p className="mt-2 text-[12.5px] text-fg-muted">
              Ai completat câmpuri. Datele se pierd dacă închizi acum — sau apasă „Salvează ca draft".
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClose(false)}
                className="rounded-lg border border-line bg-card-2 px-3.5 py-2 text-[12px] font-medium text-fg-muted hover:bg-card-hover"
              >
                Rămân
              </button>
              <button
                type="button"
                onClick={() => { setConfirmClose(false); onClose(); }}
                className="rounded-lg bg-rose-600 px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-rose-500"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.dd-input) {
          height: 40px;
          width: 100%;
          border-radius: 8px;
          border: 1px solid var(--color-line);
          background: var(--color-card-2);
          padding: 0 12px;
          font-size: 13px;
          color: var(--color-fg);
        }
        :global(.dd-input:focus) {
          border-color: color-mix(in oklab, var(--color-accent) 60%, transparent);
          outline: none;
        }
        :global(.dd-input::placeholder) { color: var(--color-fg-dim); }
        :global(select.dd-input) { appearance: none; padding-right: 32px; background-image: linear-gradient(45deg, transparent 50%, #64748b 50%), linear-gradient(135deg, #64748b 50%, transparent 50%); background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
      `}</style>
    </div>,
    document.body,
  );
}

/* ═══════════ HELPERS ═══════════ */

function WizardStep({
  n, label, active, done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5 shrink-0">
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold",
          active ? "border-violet-400/70 bg-violet-500/25 text-violet-100"
            : done ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
            : "border-line bg-card-2 text-fg-dim",
        )}
      >
        {done ? <Check size={12} strokeWidth={3} /> : n}
      </span>
      <span className={cn(
        "text-[12.5px] font-semibold",
        active ? "text-fg" : done ? "text-fg-muted" : "text-fg-dim",
      )}>{label}</span>
      {active && <span className="ml-1 hidden h-[2px] w-10 rounded-full bg-violet-400 md:inline-block" />}
    </li>
  );
}

function FormCard({
  title, icon: Icon, children,
}: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line/70 bg-card-2/40">
      <header className="flex items-center gap-2.5 border-b border-line/50 px-4 py-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-card text-fg-muted">
          <Icon size={13} />
        </span>
        <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

function Field({
  label, required, hint, error, incomplete, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Soft warning — câmp important dar nu blochează salvarea */
  incomplete?: boolean;
  children: React.ReactNode;
}) {
  void required;
  void incomplete;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
          {label}
        </label>
        {hint && !error && (
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-fg-dim">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}

function DuplicatesBanner({ matches }: { matches: CourierDuplicateMatch[] }) {
  const first = matches[0];
  const rest = matches.length - 1;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-200">
        <AlertTriangle size={13} />
      </span>
      <div className="min-w-0 flex-1 text-[12px]">
        <div className="font-semibold text-amber-100">
          Am găsit {matches.length === 1 ? "o potrivire" : `${matches.length} potriviri`} pentru{" "}
          {first.matchType === "phone" ? "telefon" : "email"}.
        </div>
        <div className="mt-0.5 text-amber-100/85">
          <strong>{first.name}</strong> ({first.entity === "courier" ? "curier existent" : "candidat"}) — {first.detail}
          {rest > 0 && <span className="text-amber-200/80"> + încă {rest}</span>}.
          {" "}Verifică înainte să creezi dublură.
        </div>
      </div>
    </div>
  );
}

function SlotUpload({
  label, hint, slot, accept, onPick, onClear,
}: {
  label: string;
  hint: string;
  slot: { name: string; size: number; type: string; dataUrl: string } | null;
  accept: string;
  onPick: (f?: File) => void;
  onClear: () => void;
}) {
  const inputId = `slot-${label.replace(/\s+/g, "-")}`;
  const isImage = slot?.type.startsWith("image/");
  return (
    <div className="rounded-lg border border-line/60 bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="leading-tight">
          <div className="text-[12.5px] font-semibold text-fg">{label}</div>
          <div className="text-[10.5px] text-fg-dim">{hint}</div>
        </div>
        {slot && (
          <button type="button" onClick={onClear} aria-label="Șterge" className="inline-flex h-6 w-6 items-center justify-center rounded-md text-fg-dim hover:bg-rose-500/15 hover:text-rose-300">
            <Trash2 size={11} />
          </button>
        )}
      </div>
      {slot ? (
        <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-card-2/50 p-2 hover:bg-card-hover">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.dataUrl} alt={slot.name} className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-line bg-card text-fg-muted">
              <FileText size={14} />
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[12px] text-fg">{slot.name}</div>
            <div className="text-[10px] text-fg-dim">{(slot.size / 1024).toFixed(0)} KB · click pentru înlocuire</div>
          </div>
        </label>
      ) : (
        <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-line bg-card-2/40 py-4 text-[11.5px] text-fg-muted hover:border-violet-500/50 hover:text-violet-200">
          <Upload size={13} />
          <span>Click pentru încărcare</span>
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}

// unused-import guard pentru lint
void Phone;
