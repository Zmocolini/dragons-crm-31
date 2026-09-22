"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";

// Pagină publică (nu e sub /(app), deci nu cere sesiune).
// Citește flag-ul allowPublicSignup din localStorage settings.
// Salvează direct în cheia crm31-candidates ca s-o preia CandidatesProvider la login.

type Candidate = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  city: string;
  platform: string;
  vehicleType: string;
  source: string;
  status: string;
  createdBy: string;
  fleetId: string;
  tenantId: string;
  createdAtIso: string;
};

function readSettings(): { allowPublicSignup: boolean; orgName: string; cities: string[] } {
  try {
    const raw = localStorage.getItem("crm31-settings");
    if (!raw) return { allowPublicSignup: true, orgName: "Dragon Delivery", cities: ["București"] };
    const s = JSON.parse(raw);
    return {
      allowPublicSignup: s?.platform?.allowPublicSignup ?? true,
      orgName: s?.organization?.name ?? "Dragon Delivery",
      cities: (s?.cities ?? []).filter((c: { status: string }) => c.status === "active").map((c: { name: string }) => c.name),
    };
  } catch {
    return { allowPublicSignup: true, orgName: "Dragon Delivery", cities: ["București"] };
  }
}

export default function InscrierePage() {
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<{ allowPublicSignup: boolean; orgName: string; cities: string[] }>({
    allowPublicSignup: true, orgName: "Dragon Delivery", cities: [],
  });
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", city: "", vehicleType: "bike" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(readSettings());
    setMounted(true);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("Numele și telefonul sunt obligatorii.");
      return;
    }
    const c: Candidate = {
      id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      city: form.city || config.cities[0] || "București",
      platform: "bolt",
      vehicleType: form.vehicleType,
      source: "public_signup",
      status: "new",
      createdBy: "Public Signup",
      fleetId: "t_dragon",
      tenantId: "t_dragon",
      createdAtIso: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("crm31-candidates");
      const list: Candidate[] = raw ? JSON.parse(raw) : [];
      list.unshift(c);
      localStorage.setItem("crm31-candidates", JSON.stringify(list));
      setSubmitted(true);
    } catch {
      setError("Nu s-a putut salva înregistrarea. Reîncearcă.");
    }
  }

  if (!mounted) return null;

  if (!config.allowPublicSignup) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
          <Lock size={22} />
        </span>
        <h1 className="text-[20px] font-bold text-fg">Înregistrările sunt suspendate momentan</h1>
        <p className="text-[13px] text-fg-muted">
          {config.orgName} nu acceptă înscrieri noi în acest moment. Revino mai târziu sau contactează echipa.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 size={22} />
        </span>
        <h1 className="text-[20px] font-bold text-fg">Mulțumim!</h1>
        <p className="text-[13px] text-fg-muted">
          Am primit înregistrarea ta. Te vom contacta la <strong>{form.phone}</strong> în scurt timp.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-6">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <h1 className="text-[22px] font-bold text-fg">{config.orgName}</h1>
        <p className="mt-1 text-[13px] text-fg-muted">
          Alătură-te echipei — completează formularul și te contactăm.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <Field label="Nume complet *" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <Field label="Telefon *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim">Oraș</label>
            <select
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
            >
              <option value="">Selectează</option>
              {config.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim">Vehicul</label>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
            >
              <option value="bike">Bicicletă</option>
              <option value="e_bike">E-Bike</option>
              <option value="scooter">Scuter</option>
              <option value="car">Auto</option>
            </select>
          </div>

          {error && <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">{error}</div>}

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-violet-600 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Trimite înregistrarea
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-fg-dim">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
      />
    </div>
  );
}
