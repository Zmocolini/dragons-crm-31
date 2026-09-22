"use client";

import { Edit, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Candidate } from "@/lib/candidates/types";
import { cn } from "@/lib/utils/cn";

type Patch = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
};

export function EditCandidateDialog({
  candidate, onCancel, onSave,
}: {
  candidate: Candidate | null;
  onCancel: () => void;
  onSave: (candidateId: string, patch: Partial<Candidate>) => void;
}) {
  const [form, setForm] = useState<Patch>({ fullName: "", phone: "", email: "", city: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Patch, string>>>({});

  useEffect(() => {
    if (!candidate) return;
    setForm({
      fullName: candidate.fullName,
      phone:    candidate.phone,
      email:    candidate.email ?? "",
      city:     candidate.city,
    });
    setErrors({});
  }, [candidate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!candidate || typeof document === "undefined") return null;

  const submit = () => {
    const e: Partial<Record<keyof Patch, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Nume obligatoriu.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 9) e.phone = "Telefon invalid.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalid.";
    if (!form.city.trim()) e.city = "Oraș obligatoriu.";
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    onSave(candidate.id, {
      fullName: form.fullName.trim(),
      phone:    form.phone.trim(),
      email:    form.email.trim() || null,
      city:     form.city.trim(),
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Edit size={15} className="text-violet-300" />
            <h2 className="text-[15px] font-bold text-fg">Editează candidat</h2>
          </div>
          <button type="button" onClick={onCancel} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05]"><X size={14} /></button>
        </div>

        <div className="space-y-3">
          <F label="Nume complet" error={errors.fullName}>
            <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:border-violet-500/50 focus:outline-none" />
          </F>
          <F label="Telefon" error={errors.phone}>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:border-violet-500/50 focus:outline-none" />
          </F>
          <F label="Email" error={errors.email}>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:border-violet-500/50 focus:outline-none" />
          </F>
          <F label="Oraș" error={errors.city}>
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg focus:border-violet-500/50 focus:outline-none" />
          </F>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-line bg-card-hover px-3 py-1.5 text-[12.5px] text-fg">Anulează</button>
          <button type="button" onClick={submit} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-[12.5px] font-semibold text-white">Salvează</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</label>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
