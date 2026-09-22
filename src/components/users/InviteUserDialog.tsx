"use client";

import { useState } from "react";
import { Check, Copy, Link2, Mail, Send, X } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Select } from "@/components/reports/controls";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/rbac/roles";
import { rbacRoleToTeamRole } from "@/lib/users/role-mapping";
import { cn } from "@/lib/utils/cn";

export function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createInvitation } = useAuth();
  const { user } = useSession();
  const { addTeamMember } = useSettings();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ link: string; email: string } | null>(null);

  const reset = () => {
    setEmail(""); setName(""); setRole("viewer"); setError(null); setSent(null);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = createInvitation({ email, name: name || null, role });
    if (!res.ok) { setError(res.error); return; }
    // Mirror în settings.team ca să apară imediat în tabela Utilizatori cu status="invited".
    addTeamMember({
      name: name || email.split("@")[0],
      email,
      role: rbacRoleToTeamRole(role),
      workspace: user.activeTenant.name,
      sendInvite: true,   // → creează entry cu status="invited"
    });
    setSent({ link: res.link, email: res.invitation.email });
    toast.success("Invitație creată", email);
  };

  const copyLink = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.link);
      toast.success("Link copiat", "Poți să-l trimiți pe orice canal.");
    } catch {
      toast.info("Copiază manual", sent.link);
    }
  };

  const mockSendEmail = () => {
    if (!sent) return;
    // TODO(real-users): apel real la /api/invitations/send cu SendGrid/Resend/Postmark.
    toast.success("Email trimis", `Către ${sent.email}. (mock — în producție se trimite real.)`);
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Invită utilizator" size="md">
      {!sent ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Email *</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-violet-500/60"
              placeholder="colaborator@firma.ro"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Nume (opțional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-violet-500/60"
              placeholder="Ex: Ana Popescu"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Rol atribuit *</span>
            <Select
              value={role}
              options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
              onChange={(v) => setRole(v as Role)}
              ariaLabel="Rol"
            />
          </label>

          <div className="rounded-md border border-sky-500/30 bg-sky-500/[0.06] p-2.5 text-[11.5px] text-sky-100">
            La click pe „Trimite invitație", generăm un link unic valabil 7 zile. Îl poți trimite direct pe email
            sau copia și partaja pe orice canal (WhatsApp, Slack etc.).
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100">
              {error}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white"
            >
              <Send size={13} /> Generează invitație
            </button>
          </DialogFooter>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] p-3">
            <Check size={16} className="shrink-0 text-emerald-300" />
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-fg">Invitație creată pentru {sent.email}</div>
              <div className="text-[11px] text-fg-muted">Valabilă 7 zile.</div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Link invitație</span>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={sent.link}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-line bg-card-2 px-3 py-2 font-mono text-[11px] text-fg"
              />
              <button
                type="button"
                onClick={copyLink}
                aria-label="Copiază link"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12px] font-semibold text-fg hover:bg-white/[0.06]"
              >
                <Copy size={13} /> Copiază
              </button>
            </div>
          </label>

          <button
            type="button"
            onClick={mockSendEmail}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-[12.5px] font-semibold text-violet-100 hover:bg-violet-500/15",
            )}
          >
            <Mail size={13} /> Trimite pe email către {sent.email}
          </button>

          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-2.5 text-[11px] text-amber-100">
            <b>Mod dev:</b> trimiterea email-ului e mock. În producție se trimite real cu SendGrid/Resend.
            Momentan copiază link-ul și trimite-l manual (WhatsApp, Slack, email personal).
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white"
            >
              Gata
            </button>
          </DialogFooter>
        </div>
      )}
    </Dialog>
  );
}

/** Listă compactă a invitațiilor emise — de folosit sub tabelul de useri. */
export function InvitationsList() {
  const { invitations, revokeInvitation } = useAuth();
  const toast = useToast();
  const pending = invitations.filter((i) => !i.acceptedAtIso);
  if (pending.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
        <Link2 size={11} /> Invitații în așteptare ({pending.length})
      </div>
      <ul className="flex flex-col gap-1">
        {pending.map((inv) => {
          const link = typeof window !== "undefined" ? `${window.location.origin}/invite?token=${inv.token}` : "";
          const daysLeft = Math.max(0, Math.round((new Date(inv.expiresAtIso).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          return (
            <li key={inv.token} className="flex flex-wrap items-center gap-2 rounded-md bg-card-hover px-2 py-1.5 text-[11.5px]">
              <span className="font-semibold text-fg">{inv.email}</span>
              <span className="rounded border border-line bg-card px-1.5 py-0.5 text-[10px] text-fg-muted">
                {ROLE_LABELS[inv.role]}
              </span>
              <span className="text-[10.5px] text-fg-dim">expiră în {daysLeft} zile</span>
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(link); toast.success("Link copiat", inv.email); }
                    catch { toast.info("Copiază manual", link); }
                  }}
                  className="inline-flex items-center gap-1 rounded border border-line bg-card px-1.5 py-0.5 text-[10.5px] text-fg hover:bg-white/[0.06]"
                >
                  <Copy size={10} /> Copiază link
                </button>
                <button
                  type="button"
                  onClick={() => { revokeInvitation(inv.token); toast.info("Invitație revocată", inv.email); }}
                  aria-label="Revocă"
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-line bg-card text-rose-300 hover:bg-rose-500/10"
                >
                  <X size={11} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
