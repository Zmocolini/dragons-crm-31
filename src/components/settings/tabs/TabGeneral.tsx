"use client";

import Image from "next/image";
import { Camera, Globe, Mail, MapPin, Pencil, Phone, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/settings/context";
import { resizeImageFile } from "@/lib/utils/image";
import type { DateFormat, Language, TimeFormat } from "@/lib/profile/types";
import type { OrganizationInfo, PlatformDefaults } from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";
import { useProfile } from "@/lib/profile/context";

// Offset GMT real (DST-aware), aliniat cu ceasul din header.
function tzOffset(timezone: string): string {
  try {
    const tz = new Intl.DateTimeFormat("en", { timeZone: timezone, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return tz ?? "GMT";
  } catch {
    return "GMT";
  }
}

export function TabGeneral() {
  const { settings } = useSettings();
  return (
    <div className="space-y-5">
      <OrganizationCard org={settings.organization} />
      <PreferencesCard defaults={settings.platform} />
      <LogoIdentityCard org={settings.organization} />
    </div>
  );
}

/* ─── ORG INFO ─── */
function OrganizationCard({ org }: { org: OrganizationInfo }) {
  const [editOpen, setEditOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">Informații organizație</h3>
          <p className="text-[11.5px] text-fg-muted">Datele principale ale companiei tale.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          <Pencil size={12} />
          Editează
        </button>
      </header>

      <div className="grid gap-3 px-5 pb-5 md:grid-cols-[160px_1fr_1fr_1fr]">
        <LogoTile logo={org.logoDataUrl} name={org.name} />
        <Field label="Nume companie" value={org.name} />
        <Field label="CUI" value={org.cui} />
        <Field label="Email principal" value={org.email} />
        <div />
        <Field label="Telefon" value={org.phone} />
        <Field label="Adresă" value={org.address} />
        <Field label="Website" value={org.website} />
      </div>

      <EditOrgDialog open={editOpen} onClose={() => setEditOpen(false)} />
    </section>
  );
}

function LogoTile({ logo, name }: { logo: string | null; name: string }) {
  return (
    <div className="relative flex h-[112px] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-gradient-to-br from-orange-500 to-red-600">
      {logo ? (
        <Image src={logo} alt={name} width={160} height={112} className="h-full w-full object-cover" unoptimized />
      ) : (
        <div className="text-center">
          <div className="text-[13px] font-black tracking-wider text-white">DRAGON</div>
          <div className="-mt-0.5 text-[13px] font-black tracking-wider text-white">DELIVERY</div>
        </div>
      )}
      <button
        type="button"
        aria-label="Schimbă logo"
        className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 hover:bg-black/80"
      >
        <Camera size={12} />
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-card-2/50 p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      <div className="mt-1 truncate text-[13px] text-fg">{value}</div>
    </div>
  );
}

function EditOrgDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateOrganization } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [draft, setDraft] = useState<OrganizationInfo>(settings.organization);
  useEffect(() => setDraft(settings.organization), [settings.organization]);

  function save() {
    updateOrganization(draft);
    logActivity("profile.update", "Informații organizație", "Setări");
    toast.success("Informații organizație actualizate.");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Editează organizația" size="lg">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Nume companie" value={draft.name}    onChange={(v) => setDraft({ ...draft, name: v })} />
        <Input label="CUI"           value={draft.cui}     onChange={(v) => setDraft({ ...draft, cui: v })} />
        <Input label="Email"         value={draft.email}   onChange={(v) => setDraft({ ...draft, email: v })} />
        <Input label="Telefon"       value={draft.phone}   onChange={(v) => setDraft({ ...draft, phone: v })} />
        <Input label="Adresă"        value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />
        <Input label="Website"       value={draft.website} onChange={(v) => setDraft({ ...draft, website: v })} />
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">Salvează</button>
      </DialogFooter>
    </Dialog>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
      />
    </div>
  );
}

/* ─── PREFERENCES ─── */
function PreferencesCard({ defaults }: { defaults: PlatformDefaults }) {
  const { updatePlatform } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [draft, setDraft] = useState<PlatformDefaults>(defaults);
  useEffect(() => setDraft(defaults), [defaults]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(defaults);

  function save() {
    updatePlatform(draft);
    logActivity("preferences.update", "Preferințe generale platformă", "Setări");
    toast.success("Preferințele au fost salvate.");
  }
  function reset() {
    setDraft(defaults);
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <header className="mb-4">
        <h3 className="text-[15px] font-semibold text-fg">Preferințe generale</h3>
        <p className="text-[11.5px] text-fg-muted">Configurează setările generale ale platformei.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select label="Limbă implicită" value={draft.language}   onChange={(v) => setDraft({ ...draft, language: v as Language })}
          options={[{ value: "ro", label: "🇷🇴 Română" }, { value: "en", label: "🇬🇧 English" }]} />
        <Select label="Fus orar"        value={draft.timezone}   onChange={(v) => setDraft({ ...draft, timezone: v })}
          options={["Europe/Bucharest","Europe/London","Europe/Berlin","UTC"].map((t) => ({ value: t, label: `${t} (${tzOffset(t)})` }))} />
        <Select label="Format dată"     value={draft.dateFormat} onChange={(v) => setDraft({ ...draft, dateFormat: v as DateFormat })}
          options={[{ value: "DD.MM.YYYY", label: "DD.MM.YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY" }]} />
        <Select label="Format oră"      value={draft.timeFormat} onChange={(v) => setDraft({ ...draft, timeFormat: v as TimeFormat })}
          options={[{ value: "24h", label: "24h" }, { value: "12h", label: "12h" }]} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ToggleRow
          label="Mod mentenanță"
          desc="Restricționează accesul temporar în aplicație."
          checked={draft.maintenanceMode}
          onChange={(v) => setDraft({ ...draft, maintenanceMode: v })}
        />
        <ToggleRow
          label="Afișează anunțuri în aplicație"
          desc="Permite afișarea anunțurilor pentru toți utilizatorii."
          checked={draft.showAnnouncements}
          onChange={(v) => setDraft({ ...draft, showAnnouncements: v })}
        />
        <ToggleRow
          label="Permite înregistrare noi candidați"
          desc="Activează formularul public de înscriere de la /inscriere."
          checked={draft.allowPublicSignup}
          onChange={(v) => setDraft({ ...draft, allowPublicSignup: v })}
        />
      </div>

      {draft.showAnnouncements && (
        <div className="mt-5">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
            Text anunț
          </label>
          <textarea
            value={draft.announcementText}
            onChange={(e) => setDraft({ ...draft, announcementText: e.target.value })}
            rows={2}
            placeholder="Ex: Marți 15 sept, între 10:00–12:00, sistemul de plăți va fi în mentenanță."
            className="mt-1.5 w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-fg-dim">Apare ca banner pe toată aplicația cât timp textul e completat.</p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        {dirty && (
          <button type="button" onClick={reset} className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover hover:text-fg">
            Anulează
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className={cn(
            "rounded-lg px-5 py-2 text-[12.5px] font-semibold text-white transition-colors",
            dirty ? "bg-blue-600 hover:bg-blue-500" : "cursor-not-allowed bg-white/[0.06] text-fg-dim",
          )}
        >
          Salvează modificările
        </button>
      </div>
    </section>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-card-2/50 p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-lg border border-line bg-card px-3 pr-8 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg aria-hidden className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-dim" viewBox="0 0 12 12">
          <path fill="currentColor" d="M6 8L2 4h8z" />
        </svg>
      </div>
    </div>
  );
}

function ToggleRow({
  label, desc, checked, onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Switch checked={checked} onChange={onChange} ariaLabel={label} />
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-fg">{label}</div>
          <div className="mt-0.5 text-[11.5px] text-fg-muted">{desc}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── LOGO + IDENTITATE ─── */
function LogoIdentityCard({ org }: { org: OrganizationInfo }) {
  const { updateOrganization } = useSettings();
  const toast = useToast();
  const { logActivity } = useProfile();

  const logoInput = useRef<HTMLInputElement>(null);
  const faviInput = useRef<HTMLInputElement>(null);

  async function handleUpload(kind: "logo" | "favicon", file?: File) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) {
      toast.error("Format neacceptat", "Alege PNG / JPG / WEBP / ICO.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fișier prea mare", "Limita e 5 MB (în fișier). Se comprimă automat la salvare.");
      return;
    }
    try {
      const dataUrl = await resizeImageFile(file, kind === "logo" ? 400 : 128);
      const listener = () => toast.error(
        "Salvare eșuată",
        "Storage-ul browserului e plin. Șterge alte poze sau folosește unele mai mici.",
      );
      window.addEventListener("crm31:settings-save-failed", listener, { once: true });
      if (kind === "logo") updateOrganization({ logoDataUrl: dataUrl });
      else updateOrganization({ faviconDataUrl: dataUrl });
      // curat listener-ul dacă nu a fost declanșat
      setTimeout(() => window.removeEventListener("crm31:settings-save-failed", listener), 500);
      logActivity("avatar.update", kind === "logo" ? "Logo organizație" : "Favicon", "Setări");
      toast.success(kind === "logo" ? "Logo actualizat." : "Favicon actualizat.");
    } catch (err) {
      toast.error("Eroare la procesare", err instanceof Error ? err.message : "Neștiut");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <header className="mb-4">
        <h3 className="text-[15px] font-semibold text-fg">Logo și identitate vizuală</h3>
        <p className="text-[11.5px] text-fg-muted">Personalizează aspectul aplicației.</p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <UploadTile
          icon={Upload}
          title="Logo principal"
          hint="Recomandat 300x100px · PNG, JPG, max 2MB"
          preview={org.logoDataUrl}
          onClick={() => logoInput.current?.click()}
        />
        <input
          ref={logoInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleUpload("logo", e.target.files?.[0])}
        />

        <UploadTile
          icon={Upload}
          title="Favicon"
          hint="Recomandat 64x64px · PNG, ICO, max 1MB"
          preview={org.faviconDataUrl}
          onClick={() => faviInput.current?.click()}
        />
        <input
          ref={faviInput}
          type="file"
          accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp"
          className="hidden"
          onChange={(e) => handleUpload("favicon", e.target.files?.[0])}
        />

        <div className="rounded-xl border border-line/60 bg-card-2/50 p-4">
          <div className="mb-2 text-[11px] font-semibold text-fg-muted">Previzualizare</div>
          <div className="flex h-[92px] items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-center">
            {org.logoDataUrl ? (
              <Image src={org.logoDataUrl} alt={org.name} width={160} height={80} className="max-h-[80px] w-auto object-contain" unoptimized />
            ) : (
              <div>
                <div className="text-[15px] font-black tracking-wider text-white">DRAGON</div>
                <div className="-mt-0.5 text-[15px] font-black tracking-wider text-white">DELIVERY</div>
                <div className="mt-0.5 text-[8px] font-semibold tracking-widest text-white/90">MORE THAN DELIVERY</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadTile({
  icon: Icon,
  title,
  hint,
  preview,
  onClick,
}: {
  icon: typeof Upload;
  title: string;
  hint: string;
  preview: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-dashed border-line bg-card-2/40 p-4 text-left transition-colors hover:border-violet-500/40 hover:bg-card-hover"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted group-hover:text-violet-300">
        {preview ? (
          <Image src={preview} alt={title} width={44} height={44} className="h-full w-full rounded-md object-cover" unoptimized />
        ) : (
          <Icon size={16} />
        )}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-fg">{title}</div>
        <div className="mt-0.5 text-[11px] text-fg-dim">{hint}</div>
      </div>
    </button>
  );
}

// unused-import guards (icons available pentru future edits)
void Globe;
void Mail;
void MapPin;
void Phone;
