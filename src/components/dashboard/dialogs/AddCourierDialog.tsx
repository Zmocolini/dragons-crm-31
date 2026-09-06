"use client";

import {
  AlertTriangle, Bike, Building2, Car, Check, FileText, Home, Info, Key,
  Mail, Phone, Settings, UserPlus, X, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useToast } from "@/components/ui/Toast";
import { useCandidates } from "@/lib/candidates/context";
import type { Nationality } from "@/lib/candidates/types";
import { NATIONALITY_LABEL } from "@/lib/candidates/types";
import { useCouriers } from "@/lib/couriers/context";
import {
  COLLABORATION_LABEL, COURIER_STATUS_LABEL, INCOMPLETE_FIELD_LABEL,
  VEHICLE_OWNERSHIP_LABEL, VEHICLE_TYPE_LABEL,
  type CollaborationType, type Courier, type CourierDuplicateMatch, type CourierStatus,
  type IncompleteFieldKey, type VehicleOwnership, type VehicleType,
} from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import { cn } from "@/lib/utils/cn";

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

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  nationality: Nationality;
  city: string;
  platforms: PlatformKey[];
  vehicleType: VehicleType;
  vehicleOwnership: VehicleOwnership;
  collaboration: CollaborationType;
  status: CourierStatus;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  phone: "+40 ",
  email: "",
  nationality: "ro",
  city: "",
  platforms: [],
  vehicleType: "bike",
  vehicleOwnership: "own",
  collaboration: "collaboration",
  status: "in_activation",
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
  const { user } = useSession();
  const { settings } = useSettings();
  const { addCourier, findDuplicates } = useCouriers();
  const { candidates } = useCandidates();
  void candidates; // duplicate check e în findDuplicates
  const { logActivity } = useProfile();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmClose, setConfirmClose] = useState(false);
  const [step]  = useState<Step>(1);
  // Step 2/3 sunt vizuale (indicator) — form-ul e single-page. TODO(real-users): sub-fluxuri Activare + Documente reale.

  useEffect(() => {
    if (open) {
      const defaultCity = settings.cities.find((c) => c.status === "active")?.name ?? "";
      setForm({ ...EMPTY_FORM, city: defaultCity });
      setErrors({});
      setConfirmClose(false);
    }
  }, [open, settings.cities]);

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
    form.phone.trim() !== EMPTY_FORM.phone.trim() ||
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
    return findDuplicates(form.phone, emailOk ? form.email : null);
  }, [form.phone, form.email, findDuplicates]);

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
    if (phoneDigits.length < 9) incomplete.push("phone");

    // Email este OPȚIONAL. Doar formatul valid este cerut dacă e completat.
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      hardErrors.email = "Format email invalid.";
    }

    if (!form.city) incomplete.push("city");
    if (form.platforms.length === 0) incomplete.push("platforms");

    return { hardErrors, incomplete };
  }

  function submit(asDraft: boolean) {
    const { hardErrors, incomplete } = analyzeForm();

    // Cel puțin nume SAU telefon trebuie completat ca să existe identificator util
    if (incomplete.includes("fullName") && incomplete.includes("phone")) {
      setErrors({ fullName: "Completează cel puțin numele sau telefonul." });
      toast.error("Nu pot salva", "Introdu cel puțin numele sau telefonul curierului.");
      return;
    }

    // Erori HARD (format invalid) — blochează pentru a nu polua DB
    if (Object.keys(hardErrors).length > 0) {
      setErrors(hardErrors);
      toast.error("Corectează câmpurile cu erori", "Formatul unor câmpuri este invalid.");
      return;
    }
    setErrors({});

    const courier = addCourier({
      fullName: form.fullName.trim() || "Curier nou (fără nume)",
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      nationality: form.nationality,
      city: form.city,
      platforms: form.platforms,
      vehicleType: form.vehicleType,
      vehicleOwnership: form.vehicleOwnership,
      collaboration: form.collaboration,
      status: asDraft ? "draft" : form.status,
      incompleteFields: incomplete,
      createdBy: user.id,
      tenantId: user.activeTenant.id,
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
  const liveIncomplete = useMemo(() => analyzeForm().incomplete, [form]);
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

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-courier-title"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={requestClose}
    >
      <div
        className="relative my-6 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
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

        {/* Wizard steps */}
        <div className="border-b border-line/60 px-6 py-4">
          <ol className="flex items-center justify-between gap-4">
            <WizardStep n={1} label="Date de bază" active={step === 1} done={step > 1} />
            <div className={cn("h-px flex-1 bg-line/60", step > 1 && "bg-violet-500/50")} />
            <WizardStep n={2} label="Activare"     active={step === 2} done={step > 2} />
            <div className={cn("h-px flex-1 bg-line/60", step > 2 && "bg-violet-500/50")} />
            <WizardStep n={3} label="Documente"    active={step === 3} done={false} />
          </ol>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-500/20 text-sky-200">
              <Info size={13} />
            </span>
            <div className="flex-1 text-[12.5px] text-sky-100/95">
              <div>Salvează acum, iar datele lipsă vor fi marcate pentru completare.</div>
              {liveIncomplete.length > 0 && (
                <div className="mt-1 text-[11.5px] text-amber-200/90">
                  <strong>{liveIncomplete.length}</strong>{" "}
                  {liveIncomplete.length === 1 ? "câmp incomplet" : "câmpuri incomplete"} vor fi
                  marcate pe fișa curierului:{" "}
                  <span className="font-semibold text-amber-100">
                    {liveIncomplete.map((k) => INCOMPLETE_FIELD_LABEL[k]).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {duplicates.length > 0 && <DuplicatesBanner matches={duplicates} />}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Date curier */}
            <FormCard title="Date curier" icon={UserPlus}>
              <Field label="Nume complet" required incomplete={isIncomplete("fullName")} error={errors.fullName}>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ex.: Andrei Popescu"
                  className="dd-input"
                />
              </Field>

              <Field label="Telefon" required incomplete={isIncomplete("phone")} error={errors.phone}>
                <div className="flex overflow-hidden rounded-lg border border-line bg-card-2 focus-within:border-violet-500/60">
                  <span className="flex items-center gap-1 border-r border-line bg-card-2 px-2.5 text-[13px]">
                    <span className="text-[14px]">🇷🇴</span>
                    <span className="text-fg-dim text-[11px]">▾</span>
                  </span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+40 7XX XXX XXX"
                    className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[13px] text-fg placeholder:text-fg-dim focus:outline-none"
                  />
                </div>
              </Field>

              <Field label="E-mail" hint="Opțional" error={errors.email}>
                <div className="relative">
                  <Mail size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ex: andrei.popescu@email.ro"
                    className="dd-input pl-9"
                  />
                </div>
              </Field>

              <Field label="Naționalitate">
                <select
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value as Nationality })}
                  className="dd-input"
                >
                  {(Object.keys(NATIONALITY_LABEL) as Nationality[]).map((n) => (
                    <option key={n} value={n}>{NATIONALITY_LABEL[n]}</option>
                  ))}
                </select>
              </Field>
            </FormCard>

            {/* Configurare activare */}
            <FormCard title="Configurare activare" icon={Settings}>
              <Field label="Oraș activare" required incomplete={isIncomplete("city")}>
                <div className="relative">
                  <Building2 size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="dd-input pl-9"
                  >
                    {activeCities.length === 0 && <option value="">Niciun oraș activ</option>}
                    {activeCities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
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

              <Field label="Vehicul" required>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[]).map((v) => {
                    const Icon = VEHICLE_ICON[v];
                    const on = form.vehicleType === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm({ ...form, vehicleType: v })}
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
                  {(Object.keys(VEHICLE_OWNERSHIP_LABEL) as VehicleOwnership[]).map((o) => {
                    const on = form.vehicleOwnership === o;
                    const Icon = o === "own" ? Home : Key;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setForm({ ...form, vehicleOwnership: o })}
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
            </FormCard>
          </div>

          {/* Contract și statut */}
          <FormCard title="Contract și statut" icon={FileText}>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Tip colaborare" required>
                <select
                  value={form.collaboration}
                  onChange={(e) => setForm({ ...form, collaboration: e.target.value as CollaborationType })}
                  className="dd-input"
                >
                  {(Object.keys(COLLABORATION_LABEL) as CollaborationType[]).map((c) => (
                    <option key={c} value={c}>{COLLABORATION_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status" required>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CourierStatus })}
                  className="dd-input"
                >
                  {(Object.keys(COURIER_STATUS_LABEL) as CourierStatus[])
                    .filter((s) => s !== "draft")
                    .map((s) => (
                      <option key={s} value={s}>{COURIER_STATUS_LABEL[s]}</option>
                    ))}
                </select>
              </Field>
            </div>
          </FormCard>
        </div>

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
              Creează curier
            </button>
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
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {incomplete && !error && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-amber-300">
            Va fi marcat
          </span>
        )}
        {hint && !incomplete && !error && (
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-fg-dim">
            {hint}
          </span>
        )}
      </div>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
      {incomplete && !error && (
        <span className="text-[11px] text-amber-400/85">
          Poți salva acum; îl completezi mai târziu.
        </span>
      )}
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

// unused-import guard pentru lint
void Phone;
