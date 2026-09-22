"use client";

import {
  AlertTriangle, ArrowRight, Ban, ChevronRight, Crown, Globe,
  Lock, Mail, MoreHorizontal, Pencil, RotateCcw, Send, Shield,
  ShieldCheck, Trash2, UserCog, Users, UserX, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/dashboard/Avatar";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { ACCESS_MATRIX, ROLE_LABELS as RBAC_ROLE_LABELS, type Permission, type Role } from "@/lib/rbac/roles";
import { NAV_ITEMS } from "@/lib/nav/nav-items";
import { useSettings } from "@/lib/settings/context";
import {
  TEAM_ROLE_DESC, TEAM_ROLE_LABEL,
  type Invitation, type TeamMember, type TeamMemberStatus, type TeamRoleKey,
} from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

const ROLE_TONE: Record<TeamRoleKey, string> = {
  global_owner:         "border-violet-500/30 bg-violet-500/10 text-violet-200",
  fleet_admin:          "border-blue-500/30 bg-blue-500/10 text-blue-200",
  subcontractor_admin:  "border-orange-500/30 bg-orange-500/10 text-orange-200",
  hr:                   "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200",
  payments:             "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  viewer:               "border-white/10 bg-white/[0.05] text-fg-muted",
};

const ROLE_ICON: Record<TeamRoleKey, LucideIcon> = {
  global_owner:         Crown,
  fleet_admin:          Shield,
  subcontractor_admin:  Users,
  hr:                   UserCog,
  payments:             Wallet,
  viewer:               ShieldCheck,
};

const STATUS_LABEL: Record<TeamMemberStatus, string> = {
  active:    "Activ",
  invited:   "Invitație trimisă",
  suspended: "Suspendat",
  expired:   "Expirat",
};

const STATUS_STYLE: Record<TeamMemberStatus, string> = {
  active:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  invited:   "border-amber-500/30 bg-amber-500/10 text-amber-300",
  suspended: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  expired:   "border-white/10 bg-white/[0.05] text-fg-dim",
};

const STATUS_DOT: Record<TeamMemberStatus, string> = {
  active: "bg-emerald-400", invited: "bg-amber-400", suspended: "bg-rose-400", expired: "bg-fg-dim",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min  = Math.round(diff / 60_000);
  if (min < 1)  return "Acum";
  if (min < 60) return `Acum ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24)   return `Acum ${h} ore`;
  const days = Math.round(h / 24);
  if (days < 7) return `Acum ${days} zile`;
  return `${String(d.getDate()).padStart(2, "0")} ${["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"][d.getMonth()]} ${d.getFullYear()}`;
}

export function TabUtilizatori() {
  const { settings } = useSettings();
  return (
    <div className="space-y-5">
      <MembriiEchipeiCard />

      <RoluriPermisiuniCard />
    </div>
  );
}

/* ═══════════ MEMBRII ECHIPEI ═══════════ */

function MembriiEchipeiCard() {
  const { settings } = useSettings();
  const [addOpen, setAddOpen]     = useState(false);
  const [menuFor, setMenuFor]     = useState<string | null>(null);
  const [editRole, setEditRole]   = useState<TeamMember | null>(null);
  const [confirm, setConfirm]     = useState<{ kind: "suspend" | "reactivate" | "remove"; member: TeamMember } | null>(null);

  const total = settings.team.members.length;
  const activi = settings.team.members.filter((m) => m.status === "active").length;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">Membrii echipei</h3>
          <p className="text-[11.5px] text-fg-muted">
            Gestionează utilizatorii care au acces la această flotă.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label={`${total} utilizatori`} tone="border-line bg-card-2/60 text-fg-muted" />
          <Stat label={`${activi} activi`}    tone="border-emerald-500/30 bg-emerald-500/10 text-emerald-300" />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
          >
            + Adaugă utilizator
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead className="border-b border-line/50">
            <tr>
              <TH>Utilizator</TH>
              <TH>Rol</TH>
              <TH>Flotă / workspace</TH>
              <TH>Ultima activitate</TH>
              <TH>Status</TH>
              <TH className="text-right pr-6">Acțiuni</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {settings.team.members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                menuOpen={menuFor === m.id}
                onOpenMenu={() => setMenuFor(m.id)}
                onCloseMenu={() => setMenuFor(null)}
                onEditRole={() => setEditRole(m)}
                onSuspend={() => setConfirm({ kind: "suspend", member: m })}
                onReactivate={() => setConfirm({ kind: "reactivate", member: m })}
                onRemove={() => setConfirm({ kind: "remove", member: m })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AddUserDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editRole && <EditRoleDialog member={editRole} onClose={() => setEditRole(null)} />}
      {confirm  && <ConfirmActionDialog target={confirm} onClose={() => setConfirm(null)} />}
    </section>
  );
}

function Stat({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2.5 py-1 text-[11.5px] font-semibold", tone)}>
      {label}
    </span>
  );
}

function MemberRow({
  member, menuOpen, onOpenMenu, onCloseMenu,
  onEditRole, onSuspend, onReactivate, onRemove,
}: {
  member: TeamMember;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onEditRole: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onRemove: () => void;
}) {
  const { user } = useSession();
  const { resendInvitation, settings, cancelInvitation } = useSettings();
  const toast = useToast();
  // Fallback defensiv: dacă role e un TeamRoleKey necunoscut (legacy sau salvat greșit
  // dintr-un flow care a folosit rol RBAC), afișăm ca Viewer în loc să crashe.
  const RoleIcon = ROLE_ICON[member.role] ?? ROLE_ICON.viewer;
  const roleTone = ROLE_TONE[member.role] ?? ROLE_TONE.viewer;
  const roleLabel = TEAM_ROLE_LABEL[member.role] ?? `Rol necunoscut (${member.role})`;

  const isSelf = member.email.toLowerCase() === user.email.toLowerCase();
  const isProtectedGO = member.role === "global_owner" && !isSelf;

  const invitation = member.status === "invited"
    ? settings.team.invitations.find((i) => i.email === member.email && i.status === "sent")
    : null;

  function resend() {
    if (invitation) {
      resendInvitation(invitation.id);
      toast.success("Invitație retrimisă", member.email);
    }
    onCloseMenu();
  }

  function cancel() {
    if (invitation) {
      cancelInvitation(invitation.id);
      toast.error("Invitație anulată", member.email);
    }
    onCloseMenu();
  }

  return (
    <tr className="text-[12.5px]">
      <TD>
        <div className="flex items-center gap-3">
          <Avatar name={member.name} size={32} />
          <div className="min-w-0 leading-tight">
            <div className="truncate font-semibold text-fg">{member.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-fg-dim">{member.email}</div>
          </div>
        </div>
      </TD>
      <TD>
        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold", roleTone)}>
          <RoleIcon size={11} />
          {roleLabel}
        </span>
      </TD>
      <TD className="text-fg-muted">
        {member.workspaceAll ? (
          <span className="inline-flex items-center gap-1.5 text-fg">
            <Globe size={12} className="text-violet-300" />
            Toate flotele
          </span>
        ) : member.workspace}
      </TD>
      <TD className="font-mono text-fg-muted">{formatRelative(member.lastActiveIso)}</TD>
      <TD>
        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-semibold", STATUS_STYLE[member.status])}>
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", STATUS_DOT[member.status])} />
          {STATUS_LABEL[member.status]}
        </span>
      </TD>
      <TD className="relative text-right pr-4">
        <button
          type="button"
          onClick={menuOpen ? onCloseMenu : onOpenMenu}
          aria-label={`Acțiuni pentru ${member.name}`}
          aria-expanded={menuOpen}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.05] hover:text-fg"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            onMouseLeave={onCloseMenu}
            className="absolute right-2 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-card shadow-2xl"
          >
            {isProtectedGO && (
              <div className="flex items-start gap-2 border-b border-line/60 bg-amber-500/10 px-3 py-2 text-[10.5px] text-amber-200">
                <Lock size={11} className="mt-0.5 shrink-0" />
                Global Owner nu poate fi editat sau eliminat de la un rol inferior.
              </div>
            )}
            <MenuItem
              icon={Pencil}
              label="Editează rolul"
              onClick={() => { onEditRole(); onCloseMenu(); }}
              disabled={isProtectedGO}
            />
            {member.status === "invited" && (
              <>
                <MenuItem icon={Send}    label="Retrimite invitația" onClick={resend} />
                <MenuItem icon={Ban}     label="Anulează invitația"  onClick={cancel} tone="danger" />
              </>
            )}
            {member.status === "active" && !isSelf && !isProtectedGO && (
              <MenuItem icon={UserX} label="Suspendă accesul" onClick={() => { onSuspend(); onCloseMenu(); }} tone="warn" />
            )}
            {member.status === "suspended" && (
              <MenuItem icon={RotateCcw} label="Reactivează accesul" onClick={() => { onReactivate(); onCloseMenu(); }} />
            )}
            {!isSelf && !isProtectedGO && (
              <MenuItem icon={Trash2} label="Elimină utilizator" onClick={() => { onRemove(); onCloseMenu(); }} tone="danger" />
            )}
          </div>
        )}
      </TD>
    </tr>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger" | "warn";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors",
        disabled
          ? "cursor-not-allowed text-fg-dim"
          : tone === "danger"
            ? "text-rose-300 hover:bg-rose-500/10"
            : tone === "warn"
              ? "text-amber-200 hover:bg-amber-500/10"
              : "text-fg hover:bg-white/[0.03]",
      )}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

/* ═══════════ ADD USER DIALOG ═══════════ */

function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTeamMember, settings } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name,   setName]      = useState("");
  const [email,  setEmail]     = useState("");
  const [role,   setRole]      = useState<TeamRoleKey>("viewer");
  const [wksp,   setWksp]      = useState(settings.organization.name);
  const [invite, setInvite]    = useState(true);
  const [error,  setError]     = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 60);
      setError({});
    } else {
      setName(""); setEmail(""); setRole("viewer"); setInvite(true);
    }
  }, [open]);

  function submit() {
    const err: Record<string, string> = {};
    if (!name.trim()) err.name = "Numele este obligatoriu.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = "Email invalid.";
    if (settings.team.members.some((m) => m.email.toLowerCase() === email.toLowerCase())) err.email = "Există deja un utilizator cu acest email.";
    setError(err);
    if (Object.keys(err).length) return;
    addTeamMember({ name: name.trim(), email: email.trim(), role, workspace: wksp, sendInvite: invite });
    logActivity("preferences.update", `Utilizator nou: ${email} (${TEAM_ROLE_LABEL[role]})`, "Setări");
    toast.success(invite ? "Invitație trimisă." : "Utilizator adăugat.", email);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Adaugă utilizator" description="Invită un membru nou în echipă și setează-i accesul." size="lg">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nume complet" required error={error.name}>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Email" required error={error.email}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Rol">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRoleKey)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {(Object.keys(TEAM_ROLE_LABEL) as TeamRoleKey[]).map((r) => (
              <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>
            ))}
          </select>
        </Field>
        <Field label="Flotă / workspace">
          <input
            type="text"
            value={wksp}
            onChange={(e) => setWksp(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-line/60 bg-card-2/40 p-3.5">
        <div className="min-w-0 leading-tight">
          <div className="text-[13px] font-semibold text-fg">Trimite invitație prin email</div>
          <div className="mt-0.5 text-[11.5px] text-fg-muted">
            Utilizatorul primește un email cu link de activare (expiră în 7 zile).
          </div>
        </div>
        <Switch checked={invite} onChange={setInvite} ariaLabel="Trimite invitație" />
      </div>

      <div className="mt-3 rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 text-[11.5px] text-sky-100">
        <Mail size={12} className="mr-1 inline align-[-2px]" />
        Rolul controlează ce vede și ce poate face acest utilizator în flotă.
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={submit} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
          {invite ? "Trimite invitație" : "Adaugă"}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}

/* ═══════════ EDIT ROLE DIALOG ═══════════ */

function EditRoleDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const { updateTeamMember, settings } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [role, setRole] = useState<TeamRoleKey>(member.role);
  const [wksp, setWksp] = useState(member.workspace);

  function save() {
    updateTeamMember(member.id, { role, workspace: wksp });
    logActivity("preferences.update", `${member.email} → ${TEAM_ROLE_LABEL[role]}`, "Setări");
    toast.success("Rol actualizat.", `${member.name}: ${TEAM_ROLE_LABEL[role]}`);
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={`Editează ${member.name}`} description="Rolul și flota utilizatorului.">
      <div className="grid gap-3">
        <Field label="Rol">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRoleKey)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {(Object.keys(TEAM_ROLE_LABEL) as TeamRoleKey[]).map((r) => (
              <option key={r} value={r}>{TEAM_ROLE_LABEL[r]}</option>
            ))}
          </select>
        </Field>
        <Field label="Flotă / workspace">
          <input
            type="text"
            value={wksp}
            onChange={(e) => setWksp(e.target.value)}
            className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 text-[11.5px] text-sky-100">
          <Shield size={12} className="mr-1 inline align-[-2px]" />
          Modificările intră imediat în efect. Utilizatorul va vedea noul rol la următoarea reîncărcare.
        </div>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
          Salvează
        </button>
      </DialogFooter>
      <VoidGuard hidden={settings.team.members.length} />
    </Dialog>
  );
}

function VoidGuard({ hidden }: { hidden: number }) {
  useMemo(() => { void hidden; }, [hidden]);
  return null;
}

/* ═══════════ CONFIRM ACTION DIALOG ═══════════ */

function ConfirmActionDialog({
  target, onClose,
}: {
  target: { kind: "suspend" | "reactivate" | "remove"; member: TeamMember };
  onClose: () => void;
}) {
  const { updateTeamMember, removeTeamMember } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const m = target.member;
  const config = {
    suspend:    { title: "Suspendă accesul",    body: `Utilizatorul ${m.name} nu va mai putea accesa aplicația până la reactivare.`, cta: "Suspendă",     tone: "warn" as const },
    reactivate: { title: "Reactivează accesul", body: `Utilizatorul ${m.name} va putea din nou accesa aplicația.`,                    cta: "Reactivează",  tone: "success" as const },
    remove:     { title: "Elimină utilizator",  body: `Contul ${m.name} va fi eliminat din flotă. Datele istorice rămân intacte.`,     cta: "Elimină",      tone: "danger" as const },
  }[target.kind];

  function confirm() {
    if (target.kind === "suspend") {
      updateTeamMember(m.id, { status: "suspended" });
      logActivity("preferences.update", `Suspendat ${m.email}`, "Setări");
      toast.error("Utilizator suspendat.", m.email);
    }
    if (target.kind === "reactivate") {
      updateTeamMember(m.id, { status: "active" });
      logActivity("preferences.update", `Reactivat ${m.email}`, "Setări");
      toast.success("Utilizator reactivat.", m.email);
    }
    if (target.kind === "remove") {
      removeTeamMember(m.id);
      logActivity("preferences.update", `Eliminat ${m.email}`, "Setări");
      toast.error("Utilizator eliminat.", m.email);
    }
    onClose();
  }

  return (
    <Dialog open onClose={onClose} title={config.title}>
      <div className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-[13px]",
        config.tone === "danger"  ? "border-rose-500/30 bg-rose-500/10 text-rose-100" :
        config.tone === "warn"    ? "border-amber-500/30 bg-amber-500/10 text-amber-100" :
                                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
      )}>
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div>{config.body}</div>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button
          type="button"
          onClick={confirm}
          className={cn(
            "rounded-lg px-4 py-2 text-[12.5px] font-semibold text-white",
            config.tone === "danger"  ? "bg-rose-600 hover:bg-rose-500" :
            config.tone === "warn"    ? "bg-amber-600 hover:bg-amber-500" :
                                        "bg-emerald-600 hover:bg-emerald-500",
          )}
        >
          {config.cta}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

/* ═══════════ ROLURI ȘI PERMISIUNI ═══════════ */

// Mapare rol team → rol RBAC (pentru citirea permisiunilor din ACCESS_MATRIX).
const TEAM_TO_RBAC: Record<TeamRoleKey, Role> = {
  global_owner:        "global_owner",
  fleet_admin:         "subcontractor_owner",
  subcontractor_admin: "subcontractor_owner",
  hr:                  "operator_recruitment",
  payments:            "operator_payments",
  viewer:              "viewer",
};

// Etichete prietenoase pentru permisiuni.
const PERMISSION_LABEL: Partial<Record<Permission, string>> = {
  "dashboard.view":       "Vede Dashboard",
  "couriers.view":        "Vede curieri",
  "couriers.create":      "Adaugă curieri",
  "couriers.edit":        "Editează curieri",
  "candidates.view":      "Vede candidați",
  "candidates.create":    "Adaugă candidați",
  "payments.view":        "Vede plăți",
  "payments.create":      "Înregistrează plăți",
  "reports.view":         "Vede rapoarte",
  "documents.view":       "Vede documente",
  "documents.upload":     "Încarcă documente",
  "vehicles.view":        "Vede vehicule",
  "cazari.view":          "Vede cazări",
  "subcontractors.view":  "Vede subcontractori",
  "users.view":           "Vede utilizatori",
  "issues.view":          "Vede probleme / suport",
  "calendar.view":        "Vede calendar",
  "ai.use":               "Folosește AI Copilot",
  "settings.view":        "Acces setări organizație",
  "tenant.switch":        "Schimbă flota activă",
};

function RoluriPermisiuniCard() {
  const { settings } = useSettings();
  const [openRole, setOpenRole] = useState<TeamRoleKey | null>(null);

  const roles = Object.keys(TEAM_ROLE_LABEL) as TeamRoleKey[];

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Roluri și permisiuni</h3>
        <p className="text-[11.5px] text-fg-muted">Apasă pe un rol pentru a vedea permisiunile detaliate și modulele accesibile.</p>
      </header>
      <ul className="divide-y divide-line/40">
        {roles.map((r) => {
          const Icon = ROLE_ICON[r];
          const rbacRole = TEAM_TO_RBAC[r];
          const perms = Array.from(ACCESS_MATRIX[rbacRole]);
          const memberCount = settings.team.members.filter((m) => m.role === r).length;
          const accessibleModules = NAV_ITEMS.filter((n) => perms.includes(n.permission));
          const isOpen = openRole === r;
          return (
            <li key={r}>
              <button
                type="button"
                onClick={() => setOpenRole(isOpen ? null : r)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.02]"
              >
                <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", ROLE_TONE[r])}>
                  <Icon size={14} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-fg">{TEAM_ROLE_LABEL[r]}</span>
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                      {memberCount} {memberCount === 1 ? "utilizator" : "utilizatori"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-fg-muted">{TEAM_ROLE_DESC[r]}</div>
                </div>
                <span className="flex items-center gap-2 text-[10.5px] font-medium text-fg-dim">
                  <span>{perms.length} permisiuni</span>
                  <ChevronRight size={14} className={cn("transition-transform", isOpen && "rotate-90")} />
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-line/40 bg-card-2/30 px-5 py-4">
                  {/* Module accesibile */}
                  <div>
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">Module accesibile ({accessibleModules.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {accessibleModules.map((m) => {
                        const NavIcon = m.icon;
                        return (
                          <span key={m.href} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card-2 px-2 py-1 text-[11px] text-fg-muted">
                            <NavIcon size={11} />
                            {m.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Permisiuni detaliate */}
                  <div>
                    <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">Permisiuni detaliate</div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {perms.map((p) => (
                        <div key={p} className="flex items-center gap-2 rounded-md border border-line/60 bg-card-2/50 px-2 py-1 text-[11.5px] text-fg-muted">
                          <ShieldCheck size={11} className="text-emerald-400" />
                          <span>{PERMISSION_LABEL[p] ?? p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Mapare RBAC */}
                  <div className="flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2 text-[11px] text-sky-200">
                    <Shield size={11} />
                    <span>Mapat pe rolul RBAC intern: <strong className="text-fg">{RBAC_ROLE_LABELS[rbacRole]}</strong></span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ═══════════ ACCES ȘI INVITAȚII ═══════════ */

function AccesInvitatiiCard() {
  const { settings, updateAccessConfig } = useSettings();
  const [invOpen, setInvOpen]         = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);

  const pending = settings.team.invitations.filter((i) => i.status === "sent").length;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Acces și invitații</h3>
        <p className="text-[11.5px] text-fg-muted">
          Controlează modul în care utilizatorii obțin și își păstrează accesul.
        </p>
      </header>

      <ul className="divide-y divide-line/40">
        <li>
          <button
            type="button"
            onClick={() => setInvOpen(true)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
              <Send size={14} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[13px] font-semibold text-fg">Invitații în așteptare</div>
              <div className="mt-0.5 text-[11.5px] text-fg-muted">Vezi cine încă nu a acceptat invitația.</div>
            </div>
            {pending > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10.5px] font-bold text-black">
                {pending}
              </span>
            )}
            <ChevronRight size={14} className="text-fg-dim" />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => setDomainsOpen(true)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white/[0.03]"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
              <Globe size={14} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[13px] font-semibold text-fg">Domenii de e-mail permise</div>
              <div className="mt-0.5 text-[11.5px] text-fg-muted">
                Acceptă doar utilizatori cu email pe:{" "}
                <span className="font-mono text-fg">{settings.team.access.allowedDomains.join(", ") || "orice"}</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-fg-dim" />
          </button>
        </li>
        <li className="flex items-center gap-3 px-5 py-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
            <UserX size={14} />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-semibold text-fg">Dezactivează accesul la plecare</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">
              Suspendă automat contul când utilizatorul e marcat ca plecat din echipă.
            </div>
          </div>
          <Switch
            checked={settings.team.access.disableOnLeave}
            onChange={(v) => updateAccessConfig({ disableOnLeave: v })}
            ariaLabel="Dezactivează accesul la plecare"
          />
        </li>
      </ul>

      <div className="border-t border-line/60 p-4">
        <button
          type="button"
          onClick={() => setInvOpen(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-card-2 px-4 py-2.5 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          Vezi invitațiile
          <ArrowRight size={12} />
        </button>
      </div>

      <InvitationsDialog open={invOpen} onClose={() => setInvOpen(false)} />
      <DomainsDialog open={domainsOpen} onClose={() => setDomainsOpen(false)} />
    </section>
  );
}

/* ═══════════ INVITATIONS DIALOG ═══════════ */

function InvitationsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, resendInvitation, cancelInvitation } = useSettings();
  const toast = useToast();
  const list = settings.team.invitations;

  return (
    <Dialog open={open} onClose={onClose} title="Invitații" description="Toate invitațiile trimise din această flotă." size="lg">
      {list.length === 0 ? (
        <div className="rounded-xl border border-line bg-card-2/40 p-8 text-center text-[13px] text-fg-muted">
          Nicio invitație trimisă încă.
        </div>
      ) : (
        <ul className="divide-y divide-line/50 overflow-hidden rounded-xl border border-line">
          {list.map((i) => (
            <li key={i.id} className="flex items-center gap-3 bg-card-2/40 px-4 py-3">
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] font-semibold text-fg">{i.email}</div>
                <div className="mt-0.5 text-[11px] text-fg-dim">
                  {TEAM_ROLE_LABEL[i.role]} · {i.workspace} · trimisă {formatRelative(i.sentAtIso)}
                </div>
              </div>
              <InvitationStatusPill status={i.status} />
              {i.status === "sent" && (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => { resendInvitation(i.id); toast.success("Invitație retrimisă.", i.email); }}
                    className="rounded-md border border-line bg-card-2 px-2.5 py-1 text-[11px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
                  >
                    Retrimite
                  </button>
                  <button
                    type="button"
                    onClick={() => { cancelInvitation(i.id); toast.error("Invitație anulată.", i.email); }}
                    className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    Anulează
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Închide</button>
      </DialogFooter>
    </Dialog>
  );
}

function InvitationStatusPill({ status }: { status: Invitation["status"] }) {
  const cfg = {
    sent:      { label: "Trimisă",   tone: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
    accepted:  { label: "Acceptată", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
    expired:   { label: "Expirată",  tone: "border-white/10 bg-white/[0.05] text-fg-dim" },
    cancelled: { label: "Anulată",   tone: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
  }[status];
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold", cfg.tone)}>
      {cfg.label}
    </span>
  );
}

/* ═══════════ DOMAINS DIALOG ═══════════ */

function DomainsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateAccessConfig } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [text, setText] = useState(settings.team.access.allowedDomains.join(", "));

  useEffect(() => setText(settings.team.access.allowedDomains.join(", ")), [settings.team.access.allowedDomains]);

  function save() {
    const domains = text
      .split(/[,;\n\s]+/)
      .map((d) => d.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean);
    updateAccessConfig({ allowedDomains: domains });
    logActivity("preferences.update", `Domenii permise: ${domains.join(", ") || "orice"}`, "Setări");
    toast.success("Lista de domenii salvată.");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Domenii de e-mail permise" description="Restricționează invitațiile la anumite domenii.">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="ex: dragondelivery.ro, partener.ro"
        className="w-full resize-y rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] font-mono text-fg focus:border-violet-500/60 focus:outline-none"
      />
      <div className="mt-2 text-[11px] text-fg-dim">
        Introdu domeniile separate prin virgulă. Lasă gol pentru a permite orice email.
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">Salvează</button>
      </DialogFooter>
    </Dialog>
  );
}

/* ═══════════ SAVE BUTTON ═══════════ */



/* ═══════════ TABLE PRIMITIVES ═══════════ */

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim",
        className,
      )}
    >
      {children}
    </th>
  );
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3 align-middle", className)}>{children}</td>;
}
