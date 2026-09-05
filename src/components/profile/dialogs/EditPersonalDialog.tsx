"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";

const COMMON_TIMEZONES = [
  "Europe/Bucharest",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export function EditPersonalDialog({
  open,
  onClose,
  initialName,
}: {
  open: boolean;
  onClose: () => void;
  initialName: string;
}) {
  const { profile, updateProfile, logActivity } = useProfile();
  const toast = useToast();
  const [name, setName]         = useState(initialName);
  const [phone, setPhone]       = useState(profile.phone);
  const [location, setLocation] = useState(profile.location);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  function validate() {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Numele este obligatoriu.";
    if (name.trim().split(/\s+/).length < 2) err.name = "Introdu prenume și nume.";
    if (phone && !/^\+?[0-9\s.-]{7,}$/.test(phone))
      err.phone = "Format telefon invalid.";
    if (timezone && !COMMON_TIMEZONES.includes(timezone))
      err.timezone = "Timezone necunoscut.";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  function save() {
    if (!validate()) return;
    // TODO(real-users): server action updateProfile({ name, phone, location, timezone }) + revalidate session.
    updateProfile({ phone: phone.trim(), location: location.trim(), timezone });
    logActivity("profile.update", "Detalii personale");
    toast.success("Profilul a fost actualizat.");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Editează detalii personale"
      description="Rolul se gestionează prin User Management, nu poate fi modificat aici."
      size="lg"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Nume complet"
          value={name}
          onChange={setName}
          required
          error={errors.name}
        />
        <Field
          label="Telefon"
          value={phone}
          onChange={setPhone}
          placeholder="+40 7XX XXX XXX"
          error={errors.phone}
        />
        <Field
          label="Locație"
          value={location}
          onChange={setLocation}
          placeholder="Oraș, țară"
        />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
            Fus orar
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {errors.timezone && (
            <span className="text-[11px] text-rose-400">{errors.timezone}</span>
          )}
        </div>
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500"
        >
          Salvează modificările
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
      />
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
