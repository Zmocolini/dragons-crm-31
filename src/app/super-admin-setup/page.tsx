"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Loader2, ShieldCheck } from "lucide-react";

export default function SuperAdminSetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [hint, setHint] = useState("");
  const [showHintField, setShowHintField] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/auth/create-super-admin").then((r) => r.json()).then((j) => {
      setAlreadyExists(!!j.exists);
      setChecking(false);
    }).catch(() => setChecking(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/create-super-admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, password, hint: hint.trim() || undefined }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Eroare la creare"); return; }
      setDone(true);
      setTimeout(() => router.replace("/"), 1500);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally { setBusy(false); }
  };

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-fg-dim">Verific...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-app via-panel to-app p-4">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-600 text-white shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-[22px] font-bold text-fg">Super Admin — cont unic</h1>
          <p className="mt-1 text-[12.5px] text-fg-muted">
            Rol strict pentru tine. Un singur cont pe tot sistemul.
          </p>
        </div>

        {alreadyExists ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
            <div className="text-[14px] font-bold text-amber-100">Super Admin există deja</div>
            <p className="mt-2 text-[12px] text-amber-200/80">Fost deja creat. Rotirea se face din contul curent.</p>
            <button
              type="button" onClick={() => router.replace("/login")}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-[12.5px] font-semibold text-amber-100 hover:bg-white/15"
            >
              La login
            </button>
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
            <div className="text-[14px] font-bold text-emerald-100">Cont creat ✓</div>
            <p className="mt-2 text-[12px] text-emerald-200/80">Ești logat ca Super Admin. Te redirecționez...</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/40">
            <label className="mb-3 flex flex-col gap-1">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-fg-dim">Nume</span>
              <input
                type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="ex. Ioan"
                className="rounded-md border border-line bg-card-2 px-3 py-2 text-[14px] text-fg placeholder:text-fg-dim focus:border-rose-500/60 focus:outline-none"
              />
            </label>

            <label className="mb-3 flex flex-col gap-1">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-fg-dim">Parolă (min. 10 caractere)</span>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password" placeholder="minim 10 caractere, unică"
                className="rounded-md border border-line bg-card-2 px-3 py-2 text-[14px] text-fg placeholder:text-fg-dim focus:border-rose-500/60 focus:outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowHintField((v) => !v)}
              className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[12px] font-semibold text-amber-200 hover:bg-amber-500/15"
            >
              <Lightbulb size={12} /> {showHintField ? "Ascunde hint" : "Adaugă hint parolă (opțional)"}
            </button>

            {showHintField && (
              <label className="mb-3 flex flex-col gap-1">
                <span className="text-[10.5px] uppercase tracking-wider text-fg-dim">Hint parolă</span>
                <textarea
                  value={hint} onChange={(e) => setHint(e.target.value)}
                  rows={2} maxLength={200}
                  placeholder='ex. "prima literă cu majuscule + anul nașterii + simbol"'
                  className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-amber-500/60 focus:outline-none"
                />
                <span className="text-[10px] text-fg-dim">Vizibil pe pagina de login când clichezi „Hint". Nu-l face prea explicit.</span>
              </label>
            )}

            {error && (
              <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">{error}</div>
            )}

            <button
              type="submit" disabled={busy}
              className="w-full rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 px-4 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? <><Loader2 size={15} className="inline animate-spin" /> Se creează...</> : "Creează Super Admin"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
