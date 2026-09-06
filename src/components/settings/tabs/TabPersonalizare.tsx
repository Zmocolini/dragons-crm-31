"use client";

import Image from "next/image";
import { Bell, Camera, Home, LayoutDashboard, Moon, Palette, Sun, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSettings } from "@/lib/settings/context";
import type { Density, Theme } from "@/lib/profile/types";
import { cn } from "@/lib/utils/cn";

const PRESET_COLORS = ["#7c3aed", "#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

export function TabPersonalizare() {
  return (
    <div className="space-y-5">
      <IdentitateVizualaCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <AspectAplicatieCard />
        <TexteOrganizatieCard />
      </div>

      <PreviewCard />

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </div>
  );
}

/* ═══════════ IDENTITATE VIZUALĂ ═══════════ */

function IdentitateVizualaCard() {
  const { settings, updateOrganization, updateBranding } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();

  const logoInput    = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);

  function handleUpload(kind: "logo" | "favicon", file?: File) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) {
      toast.error("Format neacceptat", "Alege PNG / JPG / WEBP / ICO.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fișier prea mare", "Limita este 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateOrganization(kind === "logo" ? { logoDataUrl: dataUrl } : { faviconDataUrl: dataUrl });
      logActivity("avatar.update", kind === "logo" ? "Logo organizație" : "Favicon", "Setări");
      toast.success(kind === "logo" ? "Logo actualizat." : "Favicon actualizat.");
    };
    reader.readAsDataURL(file);
  }

  const branding = settings.branding;

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <header className="mb-4">
        <h3 className="text-[15px] font-semibold text-fg">Identitate vizuală</h3>
        <p className="text-[11.5px] text-fg-muted">Personalizează aspectul organizației.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-line/60 bg-card-2/40 p-4">
          <div className="flex h-[120px] w-full items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
            {settings.organization.logoDataUrl ? (
              <Image src={settings.organization.logoDataUrl} alt="Logo" width={200} height={100} className="max-h-full w-auto object-contain" unoptimized />
            ) : (
              <div className="text-center">
                <div className="text-[16px] font-black tracking-widest text-white">DRAGON</div>
                <div className="-mt-0.5 text-[16px] font-black tracking-widest text-white">DELIVERY</div>
              </div>
            )}
          </div>
          <div className="text-[11px] text-fg-muted">Preview logo curent</div>
        </div>

        <UploadTile
          label="Logo principal"
          hint="Recomandat 300x100px · PNG, JPG, max 2 MB"
          preview={settings.organization.logoDataUrl}
          onClick={() => logoInput.current?.click()}
        />
        <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(e) => handleUpload("logo", e.target.files?.[0])} />

        <UploadTile
          label="Favicon"
          hint="Recomandat 64x64px · PNG, ICO, max 1 MB"
          preview={settings.organization.faviconDataUrl}
          onClick={() => faviconInput.current?.click()}
        />
        <input ref={faviconInput} type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp" className="hidden"
          onChange={(e) => handleUpload("favicon", e.target.files?.[0])} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <ColorPickerCard
          label="Culoare principală"
          desc="Folosită pentru accente și butoane primare."
          value={branding.primaryColor}
          onChange={(v) => updateBranding({ primaryColor: v })}
        />
        <ColorPickerCard
          label="Culoare accent"
          desc="Folosită pentru linkuri, chart-uri și highlight-uri."
          value={branding.accentColor}
          onChange={(v) => updateBranding({ accentColor: v })}
        />
      </div>
    </section>
  );
}

function UploadTile({
  label, hint, preview, onClick,
}: {
  label: string;
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
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted group-hover:text-violet-300">
        {preview ? (
          <Image src={preview} alt={label} width={48} height={48} className="h-full w-full rounded-md object-cover" unoptimized />
        ) : (
          <Upload size={16} />
        )}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-fg">{label}</div>
        <div className="mt-0.5 text-[11px] text-fg-dim">{hint}</div>
      </div>
    </button>
  );
}

function ColorPickerCard({
  label, desc, value, onChange,
}: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-card-2/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[13px] font-semibold text-fg">{label}</div>
          <div className="mt-0.5 text-[11px] text-fg-muted">{desc}</div>
        </div>
        <label className="relative inline-flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
          <span
            className="inline-block h-8 w-14 rounded-lg border-2 border-line shadow-inner"
            style={{ background: value }}
          />
          <span className="font-mono text-[11.5px] text-fg">{value}</span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Culoare ${c}`}
            className={cn(
              "h-6 w-6 rounded-md border-2 transition-transform hover:scale-110",
              value.toLowerCase() === c.toLowerCase() ? "border-white shadow-lg" : "border-line",
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════ ASPECT APLICAȚIE ═══════════ */

function AspectAplicatieCard() {
  const { profile, updateProfile } = useProfile();
  const { settings, updateBranding } = useSettings();
  const b = settings.branding;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Aspect aplicație</h3>
        <p className="text-[11.5px] text-fg-muted">Alege experiența vizuală pentru echipă.</p>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <ThemeCard
          icon={Moon}
          label="Mod întunecat"
          desc="Fundal aproape negru, contrast ridicat."
          selected={profile.theme === "dark"}
          onSelect={() => updateProfile({ theme: "dark" as Theme })}
        />
        <ThemeCard
          icon={Sun}
          label="Mod luminos"
          desc="Fundal alb, ideal pentru zi."
          selected={profile.theme === "light"}
          onSelect={() => updateProfile({ theme: "light" as Theme })}
        />
      </div>

      <div className="grid gap-3 border-t border-line/60 p-5">
        <SettingRow
          label="Densitate interfață"
          desc="Personalizează spațierea."
          control={
            <select
              value={profile.density}
              onChange={(e) => updateProfile({ density: e.target.value as Density })}
              className="h-9 rounded-lg border border-line bg-card-2 px-3 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
            >
              <option value="compact">Compactă</option>
              <option value="comfortable">Normală</option>
              <option value="aerisit">Aerisită</option>
            </select>
          }
        />
        <SettingRow
          label="Meniu lateral"
          desc="Cum apare sidebar-ul la login."
          control={
            <select
              value={b.sidebarExpandedByDefault ? "expanded" : "collapsed"}
              onChange={(e) => updateBranding({ sidebarExpandedByDefault: e.target.value === "expanded" })}
              className="h-9 rounded-lg border border-line bg-card-2 px-3 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
            >
              <option value="expanded">Extins</option>
              <option value="collapsed">Colapsat</option>
            </select>
          }
        />
        <ToggleRow
          label="Afișează animații"
          desc="Activează tranzițiile și animațiile din interfață."
          checked={!profile.reduceMotion}
          onChange={(v) => updateProfile({ reduceMotion: !v })}
        />
        <ToggleRow
          label="Afișează slogan în footer"
          desc="Adaugă sloganul organizației în footerul aplicației."
          checked={b.showSloganInFooter}
          onChange={(v) => updateBranding({ showSloganInFooter: v })}
        />
      </div>
    </section>
  );
}

function ThemeCard({
  icon: Icon,
  label,
  desc,
  selected,
  onSelect,
}: {
  icon: typeof Sun;
  label: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
        selected ? "border-violet-500/50 bg-violet-500/[0.08]" : "border-line/60 bg-card-2/40 hover:bg-card-hover",
      )}
    >
      <span className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border",
        selected ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-line bg-card text-fg-muted",
      )}>
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <div className="text-[13.5px] font-semibold text-fg">{label}</div>
          {selected && (
            <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              Selectat
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-muted">{desc}</div>
      </div>
    </button>
  );
}

function SettingRow({ label, desc, control }: { label: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-card-2/40 p-3.5">
      <div className="min-w-0 leading-tight">
        <div className="text-[13px] font-semibold text-fg">{label}</div>
        <div className="mt-0.5 text-[11px] text-fg-muted">{desc}</div>
      </div>
      {control}
    </div>
  );
}
function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-card-2/40 p-3.5">
      <div className="min-w-0 leading-tight">
        <div className="text-[13px] font-semibold text-fg">{label}</div>
        <div className="mt-0.5 text-[11px] text-fg-muted">{desc}</div>
      </div>
      <Switch checked={checked} onChange={onChange} ariaLabel={label} />
    </div>
  );
}

/* ═══════════ TEXTE ORGANIZAȚIE ═══════════ */

function TexteOrganizatieCard() {
  const { settings, updateBranding } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const b = settings.branding;

  const [displayName, setDisplayName] = useState(b.displayName);
  const [slogan, setSlogan]           = useState(b.slogan);
  useEffect(() => { setDisplayName(b.displayName); setSlogan(b.slogan); }, [b.displayName, b.slogan]);

  const dirty = displayName !== b.displayName || slogan !== b.slogan;

  function save() {
    updateBranding({ displayName: displayName.trim(), slogan: slogan.trim() });
    logActivity("preferences.update", "Texte organizație", "Personalizare");
    toast.success("Texte salvate.");
  }

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Texte organizație</h3>
        <p className="text-[11.5px] text-fg-muted">Numele afișat și sloganul organizației.</p>
      </header>
      <div className="grid gap-3 p-5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">Nume afișat</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">Slogan</label>
          <input
            type="text"
            value={slogan}
            maxLength={80}
            onChange={(e) => setSlogan(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
          <div className="text-right text-[10.5px] text-fg-dim">{slogan.length}/80</div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className={cn(
              "rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white transition-colors",
              dirty ? "bg-violet-600 hover:bg-violet-500" : "cursor-not-allowed bg-white/[0.06] text-fg-dim",
            )}
          >
            Aplică textele
          </button>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ PREVIEW ═══════════ */

function PreviewCard() {
  const { settings } = useSettings();
  const b = settings.branding;
  const org = settings.organization;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Previzualizare</h3>
        <p className="text-[11.5px] text-fg-muted">Vezi live cum se aplică setările.</p>
      </header>
      <div className="p-5">
        <div className="flex overflow-hidden rounded-xl border border-line" style={{ height: 260 }}>
          {/* Mini sidebar */}
          <div className="flex w-[190px] flex-col border-r border-line bg-panel p-3">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg" style={{ background: b.primaryColor }}>
                {org.logoDataUrl ? (
                  <Image src={org.logoDataUrl} alt="Logo" width={32} height={32} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <span className="text-[11px] font-black text-white">DD</span>
                )}
              </span>
              <div className="leading-tight">
                <div className="text-[11px] font-bold tracking-wide text-fg">
                  {b.displayName.toUpperCase().slice(0, 14)}
                </div>
                {b.showSloganInFooter && (
                  <div className="text-[7.5px] font-semibold tracking-widest" style={{ color: b.accentColor }}>
                    {b.slogan.slice(0, 22)}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {[
                { i: LayoutDashboard, l: "Dashboard", active: true },
                { i: Home, l: "Curieri" },
                { i: Bell, l: "Notificări" },
                { i: Palette, l: "Setări" },
              ].map((it, k) => {
                const IconC = it.i;
                return (
                  <div key={k} className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px]",
                    it.active ? "text-fg" : "text-fg-muted",
                  )} style={it.active ? { background: `${b.primaryColor}22`, color: b.accentColor } : undefined}>
                    <IconC size={12} />
                    {it.l}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Mini main */}
          <div className="flex flex-1 flex-col p-3">
            <div className="flex items-center justify-between border-b border-line/60 pb-2">
              <div className="text-[12px] font-bold text-fg">Bun venit, Ioan!</div>
              <span className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: b.primaryColor }}>
                {b.displayName}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[1,2,3].map((k) => (
                <div key={k} className="rounded-lg border border-line/60 bg-card-2/40 p-2.5">
                  <div className="text-[9px] uppercase tracking-wider text-fg-dim">Metric {k}</div>
                  <div className="mt-1 text-[16px] font-bold text-fg">
                    {[324, 48, 12][k - 1]}
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{
                      background: b.accentColor,
                      width: `${[64, 25, 12][k - 1]}%`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button className="rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white" style={{ background: b.primaryColor }}>
                Primar
              </button>
              <button className="rounded-lg border px-3 py-1.5 text-[10px] font-semibold" style={{
                borderColor: b.accentColor, color: b.accentColor,
              }}>
                Accent
              </button>
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-line/60 pt-2 text-[9px] text-fg-dim">
              <span>{b.displayName} CRM</span>
              {b.showSloganInFooter && <span className="italic">{b.slogan}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ SAVE ═══════════ */

function SaveButton() {
  const toast = useToast();
  const { logActivity } = useProfile();
  function save() {
    logActivity("preferences.update", "Personalizare organizație", "Setări");
    toast.success("Modificări salvate.", "Aspectul se aplică în întreaga aplicație.");
  }
  return (
    <button
      type="button"
      onClick={save}
      className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-[13px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
    >
      Salvează modificările
    </button>
  );
}

// unused-import guards
void Camera;
