"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, Loader2, Mail, Power, Send, ShieldCheck, Trash2, User, UserPlus } from "lucide-react";
import { useSession } from "@/lib/rbac/session";
import { cn } from "@/lib/utils/cn";

type UserRow = { id: string; email: string; name: string; role: string; active: boolean; lastLoginIso: string | null };
type InviteRow = { id: string; email: string; name: string; status: "pending" | "accepted" | "expired" | "revoked"; createdAtIso: string; expiresAtIso: string; emailSentAtIso: string | null };
type Mode = "invite" | "direct" | null;

const inp = "rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg w-full";
const INV_LABEL: Record<InviteRow["status"], string> = { pending: "În așteptare", accepted: "Acceptată", expired: "Expirată", revoked: "Anulată" };
const INV_STYLE: Record<InviteRow["status"], string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  accepted: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  expired: "border-line bg-white/[0.04] text-fg-dim",
  revoked: "border-line bg-white/[0.04] text-fg-dim",
};

/** Conturi de subcontractori: invitație pe email (link oficial) SAU înregistrare directă de către Global Owner. */
export function AccountsPanel() {
  const { user } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [mailOn, setMailOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; link: string; emailSent: boolean; emailError: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const [u, i] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/invitations").then((r) => r.json()).catch(() => ({})),
    ]);
    setUsers(u.users ?? []);
    setInvites(i.invitations ?? []);
    setMailOn(!!i.mailConfigured);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const open = (m: Mode) => { setMode(m); setError(null); setResult(null); setName(""); setEmail(""); setPassword(""); };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      if (mode === "invite") {
        const res = await fetch("/api/admin/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, name }) });
        const j = await res.json();
        if (!res.ok) { setError(j.error ?? "Eroare"); return; }
        setResult({ email, link: j.link, emailSent: j.emailSent, emailError: j.emailError });
        setMode(null);
      } else {
        const res = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, name, password, role: "subcontractor_owner" }) });
        const j = await res.json();
        if (!res.ok) { setError(j.error ?? "Eroare"); return; }
        setMode(null);
      }
      await refresh();
    } finally { setBusy(false); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocat */ }
  };
  const revoke = async (id: string) => { await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" }); await refresh(); };
  const resend = async (i: InviteRow) => {
    const res = await fetch("/api/admin/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: i.email, name: i.name }) });
    const j = await res.json();
    if (res.ok) setResult({ email: i.email, link: j.link, emailSent: j.emailSent, emailError: j.emailError });
    await refresh();
  };
  const toggleActive = async (u: UserRow) => {
    await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !u.active }) });
    await refresh();
  };
  const remove = async (u: UserRow) => {
    if (!confirm(`Ștergi definitiv contul ${u.email}?`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    await refresh();
  };

  if (user.role !== "global_owner") {
    return <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-[13px] text-rose-100">Doar Global Owner poate gestiona conturile.</div>;
  }
  const pending = invites.filter((i) => i.status === "pending");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => open("invite")} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-[12.5px] font-semibold text-white"><Mail size={13} /> Trimite invitație pe email</button>
        <button type="button" onClick={() => open("direct")} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-semibold text-fg hover:bg-white/[0.06]"><UserPlus size={13} /> Înregistrează direct</button>
        {!mailOn && <span className="text-[11.5px] text-amber-300">Trimiterea automată pe email nu e configurată — vei primi linkul de copiat.</span>}
      </div>

      {result && (
        <div className={cn("rounded-xl border p-4 text-[12.5px]", result.emailSent ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-amber-500/40 bg-amber-500/[0.06]")}>
          <div className="font-semibold text-fg">{result.emailSent ? `Invitație trimisă pe email la ${result.email}.` : `Invitația pentru ${result.email} e creată, dar emailul nu a plecat.`}</div>
          {result.emailError && <div className="mt-0.5 text-fg-muted">{result.emailError}</div>}
          <div className="mt-2 text-fg-muted">Link oficial (valabil 7 zile, de unică folosință — se afișează doar acum):</div>
          <div className="mt-1 flex items-center gap-2">
            <input readOnly value={result.link} onFocus={(e) => e.currentTarget.select()} className={cn(inp, "font-mono text-[11.5px]")} />
            <button type="button" onClick={() => copy(result.link)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-2 text-[12px] text-fg hover:bg-white/[0.06]">{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copiat" : "Copiază"}</button>
            {!result.emailSent && <a href={`mailto:${result.email}?subject=${encodeURIComponent("Invitație în Dragon Delivery CRM")}&body=${encodeURIComponent(`Creează-ți contul de subcontractor aici (link valabil 7 zile):\n${result.link}`)}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-3 py-2 text-[12px] text-fg hover:bg-white/[0.06]"><Send size={13} /> Deschide în mail</a>}
          </div>
        </div>
      )}

      {mode && (
        <div className="rounded-xl border border-violet-500/40 bg-violet-500/[0.06] p-4">
          <div className="mb-3 text-[13px] font-bold text-fg">{mode === "invite" ? "Invită un subcontractor pe email" : "Înregistrează un subcontractor"}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold text-fg-dim">Nume / firmă</span><input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="ex. Husein SRL" /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold text-fg-dim">Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} placeholder="contact@firma.ro" /></label>
            {mode === "direct" && (
              <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold text-fg-dim">Parolă (min. 8)</span>
                <div className="relative"><input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={cn(inp, "pr-9")} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg">{showPw ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
              </label>
            )}
          </div>
          {mode === "invite" && <p className="mt-2 text-[11.5px] text-fg-dim">Subcontractorul primește un link oficial și își alege singur parola. Parola nu trece prin tine.</p>}
          {error && <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">{error}</div>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : mode === "invite" ? <Send size={13} /> : <UserPlus size={13} />} {mode === "invite" ? "Trimite invitația" : "Creează contul"}</button>
            <button type="button" onClick={() => setMode(null)} className="rounded-lg border border-line px-3 py-2 text-[12.5px] text-fg-muted hover:text-fg">Anulează</button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="rounded-xl border border-line bg-card">
          <div className="border-b border-line/60 px-3 py-2 text-[12px] font-semibold text-fg">Invitații în așteptare ({pending.length})</div>
          <ul className="divide-y divide-line/40">{invites.filter((i) => i.status !== "accepted").map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[12.5px]">
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-fg">{i.name || i.email}</div><div className="truncate text-[11px] text-fg-dim">{i.email} · expiră {new Date(i.expiresAtIso).toLocaleDateString("ro-RO")}{i.emailSentAtIso ? " · trimis pe email" : ""}</div></div>
              <span className={cn("rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold", INV_STYLE[i.status])}>{INV_LABEL[i.status]}</span>
              <button type="button" onClick={() => resend(i)} title="Generează un link nou" className="rounded border border-line px-2 py-1 text-[11px] text-fg-muted hover:text-fg">Retrimite</button>
              {i.status === "pending" && <button type="button" onClick={() => revoke(i.id)} title="Anulează invitația" className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">Anulează</button>}
            </li>))}</ul>
        </div>
      )}

      <div className="rounded-xl border border-line bg-card">
        <div className="border-b border-line/60 px-3 py-2 text-[12px] font-semibold text-fg">Conturi CRM ({users.length})</div>
        {loading ? <div className="p-6 text-center text-[12.5px] text-fg-muted">Se încarcă…</div> : (
          <ul className="divide-y divide-line/40">{users.map((u) => (
            <li key={u.id} className={cn("flex items-center gap-3 px-3 py-2 text-[12.5px]", !u.active && "opacity-50")}>
              {u.role === "global_owner" ? <ShieldCheck size={14} className="shrink-0 text-amber-300" /> : <User size={14} className="shrink-0 text-cyan-300" />}
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-fg">{u.name}</div><div className="truncate text-[11px] text-fg-dim">{u.email} · {u.role === "global_owner" ? "Global Owner" : "Subcontractor"} · ultimul login {u.lastLoginIso ? new Date(u.lastLoginIso).toLocaleDateString("ro-RO") : "—"}</div></div>
              {u.id !== user.id && (<>
                <button type="button" onClick={() => toggleActive(u)} title={u.active ? "Dezactivează" : "Activează"} className="inline-flex h-6 w-6 items-center justify-center rounded border border-line text-fg-muted hover:bg-white/[0.06] hover:text-fg"><Power size={11} /></button>
                <button type="button" onClick={() => remove(u)} title="Șterge" className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"><Trash2 size={11} /></button>
              </>)}
            </li>))}</ul>
        )}
      </div>
    </div>
  );
}
