"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailCheck, ShieldAlert, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type InviteInfo = { status: "pending" | "accepted" | "expired" | "revoked" | "missing"; email?: string; name?: string };

export function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [invitation, setInvitation] = useState<InviteInfo | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setInvitation({ status: "missing" }); return; }
    fetch(`/api/auth/invitation/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j: InviteInfo) => { setInvitation(j); if (j.name) setName(j.name); })
      .catch(() => setInvitation({ status: "missing" }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Parola trebuie să aibă minim 8 caractere."); return; }
    if (password !== password2) { setError("Parolele nu coincid."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/invitation/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { window.location.replace("/"); return; }
      setError(j.error ?? "Nu s-a putut crea contul.");
    } finally {
      setBusy(false);
    }
  }

  const status = invitation?.status;
  const isUsed = status === "accepted";
  const isExpired = status === "expired" || status === "revoked";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-app via-panel to-app p-4">
      <div className="w-full max-w-[440px]">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-lg">
            <MailCheck size={26} />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-fg">Ai primit o invitație</h1>
          <p className="mt-1 text-[12.5px] text-fg-muted">Setează parola pentru a intra în echipă.</p>
        </div>

        {invitation && status === "missing" && (
          <ErrorCard
            title="Invitație inexistentă"
            body="Token-ul din link nu se regăsește. Cere-i owner-ului o invitație nouă."
          />
        )}

        {invitation && isUsed && (
          <ErrorCard
            title="Invitație deja folosită"
            body="Contul a fost creat. Autentifică-te normal cu emailul primit."
            actionHref="/login"
            actionLabel="Mergi la login"
          />
        )}

        {invitation && isExpired && (
          <ErrorCard
            title={status === "revoked" ? "Invitație anulată" : "Invitație expirată"}
            body="Linkul nu mai este valabil. Cere-i administratorului o invitație nouă."
          />
        )}

        {invitation && status === "pending" && (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-card p-6 shadow-2xl shadow-black/40">
            <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/[0.06] p-3">
              <div className="text-[11px] font-semibold text-violet-200">Ai fost invitat/ă</div>
              <div className="mt-1 text-[13px] font-bold text-fg">{invitation.email}</div>
              <div className="text-[11px] text-fg-muted">
                Rol: <b className="text-fg">Subcontractor</b>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Nume complet</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
                placeholder="Ex: Ana Popescu"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Parolă (min. 8 caractere)</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
                placeholder="••••••••"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11.5px] font-semibold text-fg-muted">Confirmă parola</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
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
              <UserPlus size={15} /> {busy ? "Se creează contul…" : "Acceptă și creează cont"}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-fg-dim">
              <CheckCircle2 size={11} className="text-emerald-300" />
              După acceptare vei fi conectat automat.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ title, body, actionHref, actionLabel }: {
  title: string; body: string; actionHref?: string; actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-rose-500/40 bg-rose-500/[0.06] p-6 text-center shadow-2xl shadow-black/40">
      <ShieldAlert size={28} className="mx-auto text-rose-300" />
      <div className="mt-2 text-[15px] font-bold text-fg">{title}</div>
      <div className="mt-1 text-[12.5px] text-fg-muted">{body}</div>
      {actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
