"use client";

import {
  AlertTriangle, Bike, Check, FileText, Info, Mail, MapPin,
  MessageCircle, Phone, UserPlus, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useToast } from "@/components/ui/Toast";
import { useCandidates } from "@/lib/candidates/context";
import {
  CANDIDATE_SOURCE_LABEL, CANDIDATE_STATUS_LABEL, NATIONALITY_LABEL,
  type Candidate, type CandidateSource, type CandidateStatus,
  type DuplicateMatch, type Nationality,
} from "@/lib/candidates/types";
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

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  nationality: Nationality;
  city: string;
  desiredPlatforms: PlatformKey[];
  source: CandidateSource;
  status: CandidateStatus;
  notes: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  phone: "+40 ",
  email: "",
  nationality: "ro",
  city: "",
  desiredPlatforms: [],
  source: "whatsapp",
  status: "new",
  notes: "",
};

export function AddCandidateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (c: Candidate) => void;
}) {
  const { user } = useSession();
  const { addCandidate, findDuplicates } = useCandidates();
  const { settings } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmClose, setConfirmClose] = useState(false);

  // Reset la deschidere; setează city default din setări
  useEffect(() => {
    if (open) {
      const defaultCity = settings.cities.find((c) => c.status === "active")?.name ?? "";
      setForm({ ...EMPTY_FORM, city: defaultCity });
      setErrors({});
      setConfirmClose(false);
    }
  }, [open, settings.cities]);

  // ESC + body scroll lock
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

  const dirty = useMemo(() => {
    return (
      form.fullName.trim() !== "" ||
      form.phone.trim() !== EMPTY_FORM.phone.trim() ||
      form.email.trim() !== "" ||
      form.desiredPlatforms.length > 0 ||
      form.notes.trim() !== ""
    );
  }, [form]);

  const activeCities = useMemo(
    () => settings.cities.filter((c) => c.status === "active"),
    [settings.cities],
  );
  const activePlatforms = useMemo(
    () => (Object.keys(PLATFORM_NAME) as PlatformKey[]).filter((p) => settings.platforms[p] === "active"),
    [settings.platforms],
  );

  const duplicates: DuplicateMatch[] = useMemo(() => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (phoneDigits.length < 6 && !emailOk) return [];
    return findDuplicates(form.phone, emailOk ? form.email : null);
  }, [form.phone, form.email, findDuplicates]);

  function requestClose() {
    if (dirty) setConfirmClose(true);
    else onClose();
  }

  function validate(): boolean {
    const err: Record<string, string> = {};
    if (!form.fullName.trim()) err.fullName = "Numele este obligatoriu.";
    else if (form.fullName.trim().split(/\s+/).length < 2) err.fullName = "Introdu prenume + nume.";

    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 9) err.phone = "Telefon incomplet.";

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = "Format email invalid.";

    if (!form.city) err.city = "Alege un oraș activ.";

    setErrors(err);
    return Object.keys(err).length === 0;
  }

  function submit(withFollowUp: boolean) {
    if (!validate()) {
      toast.error("Verifică datele", "Câteva câmpuri au erori.");
      return;
    }
    const candidate = addCandidate({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      nationality: form.nationality,
      city: form.city,
      desiredPlatforms: form.desiredPlatforms,
      source: form.source,
      status: form.status,
      notes: form.notes.trim() || null,
      createdBy: user.id,
      tenantId: user.activeTenant.id,
      needsFollowUp: withFollowUp,
    });
    logActivity(
      "candidate.create",
      `${candidate.fullName} (${candidate.phone})${withFollowUp ? " + follow-up" : ""}`,
      "Candidați",
    );
    toast.success(
      withFollowUp ? "Candidat salvat + task follow-up creat." : "Candidat salvat.",
      candidate.fullName,
    );
    onCreated?.(candidate);
    onClose();
  }

  function togglePlatform(p: PlatformKey) {
    setForm((prev) => ({
      ...prev,
      desiredPlatforms: prev.desiredPlatforms.includes(p)
        ? prev.desiredPlatforms.filter((x) => x !== p)
        : [...prev.desiredPlatforms, p],
    }));
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-candidate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
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
            <h2 id="add-candidate-title" className="text-[17px] font-bold text-fg">
              Adaugă candidat
            </h2>
            <p className="mt-0.5 text-[12.5px] text-fg-muted">
              Înregistrează rapid un candidat și continuă procesul de recrutare.
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
        <div className="px-6 py-5 space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-blue-500/10 p-3">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-500/20 text-violet-200">
              <Info size={13} />
            </span>
            <p className="text-[12.5px] text-violet-100/95">
              Poți salva candidatul chiar dacă unele date lipsesc. Completezi restul mai târziu.
            </p>
          </div>

          {duplicates.length > 0 && <DuplicatesBanner matches={duplicates} />}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Card Date de contact */}
            <FormCard title="Date de contact" icon={Phone}>
              <Field label="Nume complet" required error={errors.fullName}>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Ex.: Andrei Popescu"
                  className="input-dark"
                />
              </Field>
              <Field label="Telefon" required error={errors.phone}>
                <div className="relative">
                  <Phone size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+40 7XX XXX XXX"
                    className="input-dark pl-9"
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
                    placeholder="candidat@exemplu.ro"
                    className="input-dark pl-9"
                  />
                </div>
              </Field>
              <Field label="Naționalitate">
                <select
                  value={form.nationality}
                  onChange={(e) => setForm({ ...form, nationality: e.target.value as Nationality })}
                  className="input-dark"
                >
                  {(Object.keys(NATIONALITY_LABEL) as Nationality[]).map((n) => (
                    <option key={n} value={n}>{NATIONALITY_LABEL[n]}</option>
                  ))}
                </select>
              </Field>
            </FormCard>

            {/* Card Recrutare */}
            <FormCard title="Recrutare" icon={Bike}>
              <Field label="Oraș dorit" required error={errors.city}>
                <div className="relative">
                  <MapPin size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="input-dark pl-9"
                  >
                    {activeCities.length === 0 && <option value="">Niciun oraș activ</option>}
                    {activeCities.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Platforme dorite" hint="Selectează una sau mai multe">
                <div className="flex flex-wrap gap-2">
                  {activePlatforms.length === 0 && (
                    <span className="text-[11.5px] italic text-fg-dim">Nicio platformă activă configurată.</span>
                  )}
                  {activePlatforms.map((p) => {
                    const active = form.desiredPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        aria-pressed={active}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                          active
                            ? "border-violet-500/60 bg-violet-500/15 text-violet-100"
                            : "border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg",
                        )}
                      >
                        <PlatformLogo platform={p} size={16} rounded="md" />
                        {PLATFORM_NAME[p]}
                        {active && <Check size={11} strokeWidth={3} className="text-violet-300" />}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Sursă candidat">
                <div className="relative">
                  <MessageCircle size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as CandidateSource })}
                    className="input-dark pl-9"
                  >
                    {(Object.keys(CANDIDATE_SOURCE_LABEL) as CandidateSource[]).map((s) => (
                      <option key={s} value={s}>{CANDIDATE_SOURCE_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CandidateStatus })}
                  className="input-dark"
                >
                  {(Object.keys(CANDIDATE_STATUS_LABEL) as CandidateStatus[]).map((s) => (
                    <option key={s} value={s}>{CANDIDATE_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </Field>
            </FormCard>
          </div>

          {/* Observații */}
          <FormCard title="Observații" icon={FileText}>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Ex.: are bicicletă proprie, disponibil de luni..."
              className="w-full resize-y rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
            />
          </FormCard>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 bg-card-2/40 px-6 py-4">
          <button
            type="button"
            onClick={() => submit(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
          >
            <Check size={13} />
            Salvează și creează task de follow-up
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-lg border border-line bg-card px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
            >
              Salvează candidatul
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
              Ai completat câmpuri. Datele se pierd dacă închizi acum.
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
        :global(.input-dark) {
          height: 40px;
          width: 100%;
          border-radius: 8px;
          border: 1px solid var(--color-line);
          background: var(--color-card-2);
          padding: 0 12px;
          font-size: 13px;
          color: var(--color-fg);
        }
        :global(.input-dark:focus) {
          border-color: color-mix(in oklab, var(--color-accent) 60%, transparent);
          outline: none;
        }
        :global(.input-dark::placeholder) {
          color: var(--color-fg-dim);
        }
        :global(select.input-dark) {
          appearance: none;
        }
      `}</style>
    </div>,
    document.body,
  );
}

/* ═══════════ HELPERS ═══════════ */

function FormCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
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
  label, required, hint, error, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {hint && (
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

function DuplicatesBanner({ matches }: { matches: DuplicateMatch[] }) {
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
          <strong>{first.name}</strong> ({first.entity === "candidate" ? "candidat existent" : "curier activ"}) — {first.detail}
          {rest > 0 && <span className="text-amber-200/80"> + încă {rest}</span>}.
          {" "}Verifică înainte să creezi dublură.
        </div>
      </div>
    </div>
  );
}
