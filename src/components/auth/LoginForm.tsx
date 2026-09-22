"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils/cn";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login({ email, password });
    setBusy(false);
    if (res.ok) router.replace(nextPath);
    else setError(res.error);
  }

  function useDemo() {
    setEmail("demo@dragondelivery.ro");
    setPassword("demo1234");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-app via-panel to-app p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg">
            <span className="text-[26px]">🐉</span>
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-fg">Dragon Delivery CRM</h1>
          <p className="mt-1 text-[12.5px] text-fg-muted">Autentifică-te ca să-ți gestionezi flota.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/40"
        >
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
              placeholder="contact@firma.ro"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Parolă</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100">
              {error}
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

          <button
            type="button"
            onClick={useDemo}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-card-hover px-4 py-2 text-[12px] font-medium text-fg-muted hover:text-fg"
          >
            <Sparkles size={13} /> Completează cu demo (demo@dragondelivery.ro / demo1234)
          </button>

          <div className="mt-4 text-center text-[12px] text-fg-muted">
            Nu ai cont încă?{" "}
            <Link href="/register" className="font-semibold text-violet-300 hover:underline">
              Înregistrează flota
            </Link>
          </div>
        </form>

        <div className="mt-4 text-center text-[10.5px] text-fg-dim">
          Auth mock — parolele sunt hash SHA-256 în localStorage. Nu folosi date reale.
        </div>
      </div>
    </div>
  );
}
