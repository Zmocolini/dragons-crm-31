"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Copy, KeyRound, Save, ShieldOff, Sparkles, Trash2, UserPlus } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Select } from "@/components/reports/controls";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/context";
import { useSettings } from "@/lib/settings/context";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/rbac/roles";
import type { TeamMemberStatus } from "@/lib/settings/types";
import { rbacRoleToTeamRole } from "@/lib/users/role-mapping";
import { USER_STATUS_LABEL, type UserStatus, type AppUser } from "@/lib/users/data";
import { cn } from "@/lib/utils/cn";

export function EditUserDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const toast = useToast();
  const {
    findUserByEmail, updateUser, resetUserPassword, deleteUser, createUserDirect,
  } = useAuth();
  const { updateTeamMember, removeTeamMember } = useSettings();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>((user?.role ?? "viewer") as Role);
  const [status, setStatus] = useState<UserStatus>((user?.status ?? "active") as UserStatus);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [showResetInput, setShowResetInput] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [createLoginPw, setCreateLoginPw] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [showCreateLogin, setShowCreateLogin] = useState(false);

  if (!user) return null;

  const authUser = findUserByEmail(user.email);
  const isAuthLinked = authUser !== null;

  const handleSave = async () => {
    setError(null);
    setBusy(true);
    // 1. Auth-level (dacă e cont real)
    if (isAuthLinked && authUser) {
      const res = updateUser(authUser.id, {
        name: name.trim() || authUser.name,
        email: email.trim() || authUser.email,
        role,
      });
      if (!res.ok) { setError(res.error); setBusy(false); return; }
    }
    // 2. Team-level (mereu, driver-ul afișării)
    // UserStatus → TeamMemberStatus (inactive → suspended, restul se transferă identic)
    const teamStatus: TeamMemberStatus =
      status === "inactive" ? "suspended" :
      status === "invited"  ? "invited"   :
      "active";
    updateTeamMember(user.id, {
      name: name.trim() || user.name,
      email: email.trim() || user.email,
      role: rbacRoleToTeamRole(role),
      status: teamStatus,
    });
    setBusy(false);
    toast.success("Modificări salvate", name || email);
    onClose();
  };

  const generatePw = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPwInput(p);
  };

  const handleReset = async () => {
    if (!authUser) return;
    setError(null);
    setBusy(true);
    const res = await resetUserPassword(authUser.id, pwInput);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setNewPassword(pwInput);
    setShowResetInput(false);
    setPwInput("");
    toast.success("Parolă resetată", user.name);
  };

  const generateCreateLoginPw = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setCreateLoginPw(p);
  };

  const handleCreateLogin = async () => {
    setError(null);
    setBusy(true);
    const res = await createUserDirect({
      name: user.name,
      email: user.email,
      password: createLoginPw,
      role: (user.role as Role),
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setCreatedCreds({ email: res.user.email, password: createLoginPw });
    setCreateLoginPw("");
    setShowCreateLogin(false);
    toast.success("Cont de login creat", res.user.name);
  };

  const copyCredsToClipboard = async () => {
    if (!createdCreds) return;
    const text = `Email: ${createdCreds.email}\nParolă: ${createdCreds.password}\nAutentificare: ${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Credentiale copiate", "Trimite-le utilizatorului.");
    } catch {
      toast.info("Copiază manual", text);
    }
  };

  const handleDelete = () => {
    if (isAuthLinked && authUser) {
      const res = deleteUser(authUser.id);
      if (!res.ok) { setError(res.error); return; }
    }
    removeTeamMember(user.id);
    toast.success("Utilizator șters", user.name);
    onClose();
  };

  return (
    <Dialog open={true} onClose={onClose} title={`Editează: ${user.name}`} size="md">
      <div className="flex flex-col gap-3">
        <AccountStatePanel isAuthLinked={isAuthLinked} status={user.status} email={user.email} />

        {!isAuthLinked && (
          <CreateLoginSection
            email={user.email}
            createdCreds={createdCreds}
            showForm={showCreateLogin}
            password={createLoginPw}
            busy={busy}
            onOpen={() => { setShowCreateLogin(true); generateCreateLoginPw(); }}
            onCancel={() => { setShowCreateLogin(false); setCreateLoginPw(""); }}
            onPasswordChange={setCreateLoginPw}
            onGenerate={generateCreateLoginPw}
            onSubmit={handleCreateLogin}
            onCopy={copyCredsToClipboard}
          />
        )}

        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-fg-muted">Nume</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-violet-500/60" />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-fg-muted">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-violet-500/60" />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-fg-muted">Rol</span>
          <Select value={role} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} onChange={(v) => setRole(v as Role)} ariaLabel="Rol" />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11.5px] font-medium text-fg-muted">Status</span>
          <div className="flex gap-1.5">
            {(["active", "inactive", "invited"] as UserStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-colors",
                  status === s
                    ? s === "active"   ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
                    : s === "inactive" ? "border-rose-500/50 bg-rose-500/15 text-rose-100"
                    :                    "border-amber-500/50 bg-amber-500/15 text-amber-100"
                    : "border-line bg-card-hover text-fg-muted hover:text-fg",
                )}
              >
                <span className={cn(
                  "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                  s === "active" ? "bg-emerald-400" : s === "inactive" ? "bg-rose-400" : "bg-amber-400",
                )} />
                {USER_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {user.status === "invited" && status !== "active" && (
            <button
              type="button"
              onClick={() => setStatus("active")}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-300 hover:underline"
            >
              → Activează contul acum
            </button>
          )}
        </label>

        {/* Reset parolă */}
        {isAuthLinked && (
          <div className="rounded-lg border border-line bg-card-2 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-fg">
              <KeyRound size={12} /> Parolă
            </div>
            {newPassword ? (
              <div className="rounded-md bg-emerald-500/10 p-2 font-mono text-[12px] text-emerald-100">
                Parolă nouă: <b>{newPassword}</b>
                <div className="mt-1 text-[10.5px] font-sans text-fg-muted">Copiaz-o și trimite-o utilizatorului. Nu se mai afișează după închidere.</div>
              </div>
            ) : !showResetInput ? (
              <button
                type="button"
                onClick={() => setShowResetInput(true)}
                className="rounded border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-violet-100 hover:bg-violet-500/15"
              >
                Resetează parolă
              </button>
            ) : (
              <div className="flex flex-wrap items-stretch gap-1.5">
                <input
                  type="text"
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  placeholder="Parolă nouă (min. 6)"
                  className="min-w-0 flex-1 rounded border border-line bg-card px-2.5 py-1.5 font-mono text-[11.5px] text-fg outline-none focus:border-violet-500/60"
                />
                <button type="button" onClick={generatePw} className="rounded border border-line bg-card-hover px-2.5 py-1.5 text-[11px] text-fg-muted hover:text-fg">Random</button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={busy || pwInput.length < 6}
                  className={cn("rounded bg-gradient-to-r from-violet-600 to-blue-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-white", (busy || pwInput.length < 6) && "opacity-50")}
                >
                  Confirmă
                </button>
                <button type="button" onClick={() => { setShowResetInput(false); setPwInput(""); }} className="rounded border border-line px-2.5 py-1.5 text-[11px] text-fg-muted">Anulează</button>
              </div>
            )}
          </div>
        )}

        {/* Danger zone */}
        <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.04] p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-rose-200">
            <AlertTriangle size={12} /> Zonă periculoasă
          </div>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-rose-100 hover:bg-rose-500/15"
            >
              <Trash2 size={12} /> Șterge utilizatorul
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11.5px] text-fg">Sigur? Nu se poate anula.</span>
              <button type="button" onClick={handleDelete} className="rounded bg-rose-500 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-rose-600">
                Da, șterge
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded border border-line px-2.5 py-1 text-[11.5px] text-fg-muted">
                Nu
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100">{error}</div>
        )}
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg">Închide</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className={cn("inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", busy && "opacity-50")}
        >
          <Save size={13} /> Salvează modificările
        </button>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * Secțiune care apare doar când user-ul n-are cont în auth.
 * Owner setează o parolă → user devine login-able instant.
 */
function CreateLoginSection({
  email, createdCreds, showForm, password, busy,
  onOpen, onCancel, onPasswordChange, onGenerate, onSubmit, onCopy,
}: {
  email: string;
  createdCreds: { email: string; password: string } | null;
  showForm: boolean;
  password: string;
  busy: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onPasswordChange: (v: string) => void;
  onGenerate: () => void;
  onSubmit: () => void;
  onCopy: () => void;
}) {
  if (createdCreds) {
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-emerald-100">
          <CheckCircle2 size={13} /> Cont creat — utilizatorul poate face login
        </div>
        <div className="space-y-1 rounded-md bg-card-2 p-2 font-mono text-[12px] text-fg">
          <div><span className="text-fg-dim">Email:</span> {createdCreds.email}</div>
          <div><span className="text-fg-dim">Parolă:</span> {createdCreds.password}</div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-violet-100 hover:bg-violet-500/15"
        >
          <Copy size={11} /> Copiază credențialele
        </button>
        <div className="mt-2 text-[10.5px] text-amber-200">
          Trimite-le acum. După închiderea dialogului nu se mai afișează parola — doar resetată din nou.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-violet-500/40 bg-violet-500/[0.06] p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-violet-100">
        <UserPlus size={13} /> Creează cont de login acum
      </div>
      <div className="mb-2 text-[11px] text-fg-muted">
        Setează o parolă → contul devine imediat funcțional. Utilizatorul poate face login cu <b className="text-fg">{email}</b> + parola aleasă.
      </div>
      {!showForm ? (
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110"
        >
          <KeyRound size={12} /> Setează parolă
        </button>
      ) : (
        <div className="flex flex-wrap items-stretch gap-1.5">
          <input
            type="text"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Parolă (min. 6)"
            className="min-w-0 flex-1 rounded border border-line bg-card px-2.5 py-1.5 font-mono text-[12px] text-fg outline-none focus:border-violet-500/60"
          />
          <button
            type="button"
            onClick={onGenerate}
            title="Generează random"
            className="inline-flex items-center rounded border border-line bg-card-hover px-2 text-[11px] text-fg-muted hover:text-fg"
          >
            <Sparkles size={11} />
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy || password.length < 6}
            className={cn(
              "rounded bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-[11.5px] font-semibold text-white",
              (busy || password.length < 6) && "opacity-50",
            )}
          >
            Creează cont
          </button>
          <button type="button" onClick={onCancel} className="rounded border border-line px-2.5 py-1.5 text-[11px] text-fg-muted">
            Anulează
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Panou clar care spune exact cum stă contul de login al utilizatorului.
 * Fără astea, e ușor să confuzi „statusul" (rol operational) cu „are/nu are parolă".
 */
function AccountStatePanel({ isAuthLinked, status, email }: { isAuthLinked: boolean; status: string; email: string }) {
  // 1) Cont real activ
  if (isAuthLinked && status === "active") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/[0.06] p-2.5 text-[11.5px] text-emerald-100">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-300" />
        <div>
          <div className="font-semibold">Are cont activ — poate face login</div>
          <div className="mt-0.5 text-fg-muted">
            E autentificat cu <b className="text-fg">{email}</b>. Poți reseta parola de mai jos sau schimba rolul/statusul.
          </div>
        </div>
      </div>
    );
  }
  // 2) Cont real dar dezactivat
  if (isAuthLinked) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-line bg-white/[0.04] p-2.5 text-[11.5px] text-fg-muted">
        <ShieldOff size={14} className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-fg">Are cont, dar e dezactivat</div>
          <div className="mt-0.5">
            Nu poate face login până când nu îl reactivezi (mută status pe „Activ" mai jos).
          </div>
        </div>
      </div>
    );
  }
  // 3) Invitație trimisă, n-a acceptat
  if (status === "invited") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/[0.06] p-2.5 text-[11.5px] text-amber-100">
        <Clock size={14} className="mt-0.5 shrink-0 text-amber-300" />
        <div>
          <div className="font-semibold">Așteaptă acceptarea invitației</div>
          <div className="mt-0.5 text-fg-muted">
            Am trimis link către <b className="text-fg">{email}</b> dar încă nu și-a setat parola. Va putea face login abia după ce deschide link-ul. Găsești link-ul de recopiat în „Invitații în așteptare" sub secțiunea flotei.
          </div>
        </div>
      </div>
    );
  }
  // 4) Fără login (mock/legacy)
  return (
    <div className="flex items-start gap-2 rounded-md border border-line bg-white/[0.04] p-2.5 text-[11.5px] text-fg-muted">
      <KeyRound size={14} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold text-fg">Fără cont de login</div>
        <div className="mt-0.5">
          Utilizator din seed-ul de test — <b>nu poate face login</b>. Ca să-l activezi pentru login: trimite-i o invitație pe email, sau șterge-l și adaugă-l din nou prin „Adaugă direct" (îi setezi tu parola).
        </div>
      </div>
    </div>
  );
}
