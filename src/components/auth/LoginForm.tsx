"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function LoginForm() {
  const searchParams = useSearchParams();
  // doar căi interne (fără //host sau http:) — altfel ?next= ar fi un open redirect
  const rawNext = searchParams.get("next") ?? "/";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // Auto-login: dacă sesiunea e încă validă (cookie persistent), sari direct în aplicație.
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me").then((r) => r.json()).then((j) => { if (alive && j?.user) window.location.replace(nextPath); }).catch(() => {});
    return () => { alive = false; };
  }, [nextPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      if (res.ok) {
        // navigare completă: contextul de auth se reîncarcă din /api/auth/me, iar managerul de parole vede login-ul reușit
        window.location.replace(nextPath);
        return;
      }
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Autentificare eșuată.");
    } catch {
      setError("Server indisponibil. Încearcă din nou.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-app via-panel to-app p-4">
      <div className="fixed right-3 top-3 z-50"><LanguageSwitcher /></div>
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg">
            <span className="text-[26px]">🐉</span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-fg">Dragon Delivery CRM</h1>
          <p className="mt-1 text-[12.5px] text-fg-muted">Autentifică-te ca să-ți gestionezi flota.</p>
        </div>

        <form
          id="login-form"
          method="post"
          action="/login"
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/40"
        >
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Utilizator (email sau nume)</span>
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
              placeholder="Admin sau contact@firma.ro"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Parolă</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 pr-10 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ascunde parola" : "Vezi parola"}
                title={showPassword ? "Ascunde parola" : "Vezi parola"}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-white/[0.06] hover:text-fg"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-fg-muted">
            <input type="checkbox" name="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-3.5 w-3.5 accent-violet-500" />
            Ține-mă conectat
          </label>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{ backgroundColor: "#dc2626", color: "#000000" }}
              className="mt-3 flex items-center gap-3 rounded-lg border-2 border-red-800 px-4 py-3 shadow-xl shadow-red-500/40 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <AlertCircle size={22} className="shrink-0" style={{ color: "#000000" }} />
              <div>
                <div className="text-[15px] font-black uppercase tracking-wide" style={{ color: "#000000" }}>
                  Credențiale invalide
                </div>
                <div className="mt-0.5 text-[12.5px] font-semibold" style={{ color: "#000000" }}>
                  {error}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-110",
              busy && "opacity-50",
            )}
          >
            <LogIn size={15} /> {busy ? "Se autentifică…" : "Autentificare"}
          </button>

          <div className="mt-4 text-center text-[11.5px] text-fg-dim">
            Accesul se acordă exclusiv de administrator. Contactează-l pentru a primi cont.
          </div>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[10.5px] text-fg-dim">
          <Link href="/politica-cookies" className="hover:text-fg">Cookie-uri</Link>
          <span className="text-fg-dim/60">·</span>
          <Link href="/politica-confidentialitate" className="hover:text-fg">Confidențialitate</Link>
          <span className="text-fg-dim/60">·</span>
          <Link href="/termeni" className="hover:text-fg">Termeni</Link>
        </div>
        <div className="mt-3 text-center text-[10.5px] text-fg-dim">
          © {new Date().getFullYear()} <span className="font-semibold">Dragons Delivery</span>. Toate drepturile rezervate.
        </div>
      </div>
    </div>
  );
}
