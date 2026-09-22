"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles, UserPlus, X } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils/cn";

const FLAG_PRESETS = ["🐉", "🚀", "⚡", "🔥", "🌟", "🦁", "🐺", "🦅", "🇷🇴", "🇬🇧", "🇺🇸", "🇩🇪", "🇮🇹", "🇫🇷"];
const COLOR_PRESETS = ["#f97316", "#8b5cf6", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4"];

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nu am putut citi fișierul."));
    reader.readAsDataURL(file);
  });
}

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fleetName, setFleetName] = useState("");
  const [fleetCity, setFleetCity] = useState("");
  const [fleetCountry, setFleetCountry] = useState("România");
  const [fleetCui, setFleetCui] = useState("");
  const [flagEmoji, setFlagEmoji] = useState<string>("🐉");
  const [brandColor, setBrandColor] = useState<string>("#f97316");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300_000) {
      setError("Logo prea mare (max 300 KB).");
      return;
    }
    setError(null);
    try {
      const url = await fileToDataUrl(file);
      setLogoDataUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await register({
      name, email, password,
      fleetName, fleetCity, fleetCountry,
      fleetCui: fleetCui.trim() || null,
      flagEmoji, brandColor, logoDataUrl,
    });
    setBusy(false);
    if (res.ok) router.replace("/");
    else setError(res.error);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-app via-panel to-app p-4">
      <div className="w-full max-w-[560px]">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg">
            <UserPlus size={26} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-fg">Înregistrează flotă nouă</h1>
          <p className="mt-1 text-[12.5px] text-fg-muted">
            Devii Global Owner al flotei. Alege un logo sau flag ca să o recunoști rapid.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/40">
          {/* Cont personal */}
          <div className="mb-4">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-fg-dim">Cont personal</div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Field label="Nume complet">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="Ex: Ioan Varga" />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="tu@firma.ro" />
              </Field>
              <Field label="Parolă (min. 6 caractere)">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="••••••••" />
              </Field>
            </div>
          </div>

          {/* Flotă */}
          <div className="mb-4">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-fg-dim">Flota ta</div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Field label="Nume flotă">
                <input type="text" value={fleetName} onChange={(e) => setFleetName(e.target.value)} required className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="Ex: Dragon Delivery" />
              </Field>
              <Field label="Oraș principal">
                <input type="text" value={fleetCity} onChange={(e) => setFleetCity(e.target.value)} className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="București" />
              </Field>
              <Field label="Țară">
                <input type="text" value={fleetCountry} onChange={(e) => setFleetCountry(e.target.value)} className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="România" />
              </Field>
              <Field label="CUI (opțional)">
                <input type="text" value={fleetCui} onChange={(e) => setFleetCui(e.target.value)} className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none" placeholder="RO12345678" />
              </Field>
            </div>
          </div>

          {/* Branding */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-fg-dim">
              <Sparkles size={11} /> Branding flotă
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              {/* Preview */}
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-line"
                style={{ background: brandColor + "22", borderColor: brandColor + "60" }}
              >
                {logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoDataUrl} alt="Logo" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <span className="text-[28px]">{flagEmoji}</span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg-muted hover:text-fg"
                >
                  <ImagePlus size={12} /> Încarcă logo (max 300 KB)
                </button>
                {logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoDataUrl(null)}
                    className="inline-flex items-center gap-1 text-[10.5px] text-rose-300 hover:underline"
                  >
                    <X size={10} /> Elimină logo
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
              </div>
            </div>

            <Field label="Sau alege un flag emoji">
              <div className="flex flex-wrap gap-1">
                {FLAG_PRESETS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlagEmoji(f)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-md border text-[16px]",
                      flagEmoji === f
                        ? "border-violet-500/60 bg-violet-500/15"
                        : "border-line bg-card-2 hover:border-violet-500/30",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Culoare brand">
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBrandColor(c)}
                    aria-label={`Culoare ${c}`}
                    style={{ background: c }}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full border-2",
                      brandColor === c ? "border-white/80" : "border-transparent",
                    )}
                  />
                ))}
              </div>
            </Field>
          </div>

          {error && (
            <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-110",
              busy && "opacity-50",
            )}
          >
            <UserPlus size={15} /> {busy ? "Creez cont…" : "Creează cont + flotă"}
          </button>

          <div className="mt-3 text-center text-[12px] text-fg-muted">
            Ai deja cont?{" "}
            <Link href="/login" className="font-semibold text-violet-300 hover:underline">
              Autentifică-te
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
