"use client";

import { useMemo, useState } from "react";
import { Building2, Check, ChevronRight, Clock, Crown, Download, KeyRound, Mail, MapPin, MoreHorizontal, Phone, Plus, Search, Shield, UserCog, Users, X } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState, Popover, Select } from "@/components/reports/controls";
import { CourierAvatar } from "@/components/reports/bits";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import type { TeamRoleKey } from "@/lib/settings/types";
import { ROLES, ROLE_LABELS, hasPermission, type Role } from "@/lib/rbac/roles";
import { NAV_ITEMS } from "@/lib/nav/nav-items";
import { ROLE_BADGE_STYLE, ROLE_GROUPS, ROLE_SUBTITLE, USER_STATUS_LABEL, teamMembersToAppUsers, type AppUser, type UserStatus } from "@/lib/users/data";
import { rbacRoleToTeamRole } from "@/lib/users/role-mapping";
import { formatInt } from "@/lib/reports/analytics";
import { cn } from "@/lib/utils/cn";
import { InviteUserDialog, InvitationsList } from "./InviteUserDialog";
import { EditUserDialog } from "./EditUserDialog";

const PAGE = 10;
const TABS: Array<[UserStatus | "all", string]> = [["all", "Toți"], ["active", "Activi"], ["inactive", "Inactivi"], ["invited", "Invitați"]];
const ROLE_COLORS: Record<Role, string> = { global_owner: "#8b5cf6", subcontractor_owner: "#22c55e", operator_recruitment: "#e879f9", operator_payments: "#38bdf8", viewer: "#94a3b8" };

export function UsersPage() {
  const toast = useToast();
  const { user, can } = useSession();
  const { settings, addTeamMember } = useSettings();
  const canManage = can("users.view") && user.role === "global_owner";
  const list = useMemo(() => teamMembersToAppUsers(settings.team.members), [settings.team.members]);

  const [q, setQ] = useState(""); const [tab, setTab] = useState<UserStatus | "all">("all"); const [role, setRole] = useState<Role | "all">("all"); const [dept, setDept] = useState("all"); const [status, setStatus] = useState<UserStatus | "all">("all");
  const [, setPage] = useState(1); const [selected, setSelected] = useState<AppUser | null>(null); const [addOpen, setAddOpen] = useState(false); const [inviteOpen, setInviteOpen] = useState(false); const [editFor, setEditFor] = useState<AppUser | null>(null);

  const depts = useMemo(() => Array.from(new Set(list.map((u) => u.department))).sort(), [list]);
  const counts = useMemo(() => ({ all: list.length, active: list.filter((u) => u.status === "active").length, inactive: list.filter((u) => u.status === "inactive").length, invited: list.filter((u) => u.status === "invited").length }), [list]);

  const filtered = useMemo(() => list.filter((u) => {
    if (tab !== "all" && u.status !== tab) return false;
    const term = q.trim().toLowerCase();
    if (term && !`${u.name} ${u.email}`.toLowerCase().includes(term)) return false;
    if (role !== "all" && u.role !== role) return false;
    if (dept !== "all" && u.department !== dept) return false;
    if (status !== "all" && u.status !== status) return false;
    return true;
  }), [list, tab, q, role, dept, status]);

  // Ierarhie: Global Owner vede toate flotele + toți subcontractorii.
  // Subcontractor Owner vede DOAR grupul lui (workspace = tenantul lui). Nu vede Global Owner.
  // Alte roluri văd doar oamenii din workspace-ul lor.
  const groups = useMemo(() => {
    const myFleet = user.activeTenant.name;
    const isGlobal = user.role === "global_owner";
    type Group = { key: string; title: string; subtitle: string; users: AppUser[]; kind: "mine" | "sub" };
    const map = new Map<string, Group>();
    const MINE = "__mine__";
    map.set(MINE, {
      key: MINE,
      title: isGlobal ? `Flota mea — ${myFleet}` : myFleet,
      subtitle: isGlobal ? `Global Owner: ${user.name}` : `Owner: ${user.name}`,
      users: [],
      kind: "mine",
    });
    for (const u of filtered) {
      if (isGlobal) {
        // Owner-ul global: „Flota mea" = user-ii cu workspaceAll=true (Toate flotele) sau workspace=flota principală.
        if (u.department === "Toate flotele" || u.department === myFleet) {
          map.get(MINE)!.users.push(u); continue;
        }
        const key = u.department;
        if (!map.has(key)) map.set(key, { key, title: key, subtitle: "Subcontractor", users: [], kind: "sub" });
        map.get(key)!.users.push(u);
      } else {
        // Subcontractor owner: vede DOAR user-ii cu workspace = tenantul lui.
        // Sare peste user-ii „Toate flotele" (Global Owner-ul de deasupra) și peste alți subcontractori.
        if (u.department === myFleet) map.get(MINE)!.users.push(u);
      }
    }
    // Pentru grupurile subcontractor găsim owner-ul lor pentru subtitle
    for (const g of map.values()) {
      if (g.kind !== "sub") continue;
      const owner = g.users.find((u) => u.role === "subcontractor_owner");
      if (owner) g.subtitle = `Owner: ${owner.name}`;
    }
    const arr = Array.from(map.values()).filter((g) => g.users.length > 0);
    return arr.sort((a, b) => (a.kind === "mine" ? -1 : b.kind === "mine" ? 1 : a.title.localeCompare(b.title)));
  }, [filtered, user]);

  const stats = useMemo(() => {
    const roleDonut = ROLE_GROUPS.map((g) => ({ key: g.key, label: g.label, color: ROLE_COLORS[g.roles[0]], value: list.filter((u) => g.roles.includes(u.role)).length })).filter((d) => d.value > 0);
    const statusDonut = (["active", "inactive", "invited"] as UserStatus[]).map((s) => ({ key: s, label: USER_STATUS_LABEL[s], color: s === "active" ? "#22c55e" : s === "inactive" ? "#ef4444" : "#f59e0b", value: counts[s] })).filter((d) => d.value > 0);
    const activity = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map((d, i) => ({ day: d, logins: 8 + ((i * 7) % 11), unique: 5 + ((i * 5) % 7) }));
    return { roleDonut, statusDonut, activity };
  }, [list, counts]);

  const kpiValue = (key: string) => key === "total" ? list.length : list.filter((u) => ROLE_GROUPS.find((g) => g.key === key)?.roles.includes(u.role)).length;

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[26px] font-bold tracking-tight text-fg">Utilizatori</h1><p className="mt-1 max-w-2xl text-[13px] text-fg-muted">Gestionează utilizatorii platformei. Atribuie roluri, permisiuni și controlează accesul la module.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => toast.success("Export", `${filtered.length} utilizatori.`)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"><Download size={14} className="text-fg-dim" /> Exportă</button>
          <button type="button" onClick={() => setInviteOpen(true)} disabled={!canManage} className={cn("inline-flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-[12.5px] font-semibold text-violet-100 hover:bg-violet-500/15", !canManage && "opacity-50")}><Mail size={14} /> Invită prin email</button>
          <button type="button" onClick={() => setAddOpen(true)} disabled={!canManage} className={cn("inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white", !canManage && "opacity-50")}><Plus size={15} /> Adaugă direct</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} tint="bg-info/12" color="text-[color:var(--color-info)]" label="Total utilizatori" value={kpiValue("total")} />
        {ROLE_GROUPS.map((g) => <Kpi key={g.key} icon={Shield} tint="bg-accent/15" color="text-[color:var(--color-accent-3)]" label={g.label} value={kpiValue(g.key)} />)}
      </div>

      <div className="overflow-x-auto border-b border-line"><div className="flex min-w-max gap-1">{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => { setTab(k); setPage(1); }} className={cn("relative px-3 py-2.5 text-[13px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{l}<span className="ml-1.5 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] tabular-nums text-fg-muted">{counts[k]}</span>{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}</button>)}</div></div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Caută utilizator..." className="w-full rounded-lg border border-line bg-card-hover py-2 pl-9 pr-3 text-[12.5px] text-fg outline-none focus:border-accent/60" /></div>
        <Select value={role} options={[{ value: "all", label: "Toate rolurile" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))]} onChange={(v) => { setRole(v); setPage(1); }} className="w-[170px]" ariaLabel="Rol" />
        <Select value={dept} options={[{ value: "all", label: "Toate departamentele" }, ...depts.map((d) => ({ value: d, label: d }))]} onChange={(v) => { setDept(v); setPage(1); }} className="w-[180px]" ariaLabel="Departament" />
        <Select value={status} options={[{ value: "all", label: "Toate statusurile" }, ...(["active", "inactive", "invited"] as UserStatus[]).map((s) => ({ value: s, label: USER_STATUS_LABEL[s] }))]} onChange={(v) => { setStatus(v); setPage(1); }} className="w-[160px]" ariaLabel="Status" />
      </div>

      <div className={cn("flex flex-col gap-6", selected && "lg:pr-[340px]")}>
        {groups.length === 0 && (
          <Card className="p-8 text-center text-[13px] text-fg-muted">
            Niciun utilizator pentru filtrele curente.
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECȚIUNEA 1 — FLOTA MEA (mother fleet) — panou violet distinct  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {groups.some((g) => g.kind === "mine") && (
          <section className="relative overflow-hidden rounded-2xl border-2 border-violet-500/40 bg-gradient-to-br from-violet-500/[0.10] via-indigo-500/[0.05] to-transparent p-4 shadow-lg shadow-violet-500/5 md:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-violet-500/30">
                <Crown size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md border border-violet-400/60 bg-violet-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-100">
                    Flota mea
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-200/70">principală</span>
                </div>
                <div className="mt-1 text-[18px] font-black tracking-tight text-fg">{user.activeTenant.name}</div>
                <div className="text-[11.5px] text-fg-muted">
                  Tu ești <b className="text-fg">Global Owner</b> — administrezi această flotă și vezi tot ce se întâmplă aici + în subflote.
                </div>
              </div>
            </div>
            <InvitationsList />
            {groups.filter((g) => g.kind === "mine").map((g) => (
              <Card key={g.key} className="overflow-hidden border-violet-500/25">
                <div className="flex flex-wrap items-center gap-3 border-b border-violet-500/20 bg-violet-500/[0.06] px-4 py-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/25 text-violet-200">
                    <Shield size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-fg">Echipa mea directă</div>
                    <div className="text-[10.5px] text-fg-muted">{g.subtitle}</div>
                  </div>
                  <span className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-2.5 py-0.5 text-[11.5px] font-bold text-violet-100">
                    {g.users.length} {g.users.length === 1 ? "utilizator" : "utilizatori"}
                  </span>
                </div>
                <UsersTable users={g.users} selected={selected} setSelected={setSelected} onEdit={setEditFor} />
              </Card>
            ))}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SEPARATOR — arată clar unde se termină flota mea și încep sub. */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {groups.some((g) => g.kind === "mine") && groups.some((g) => g.kind === "sub") && (
          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line to-line" />
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-fg-muted">
              <ChevronRight size={12} className="rotate-90" />
              Sub flota mea
              <ChevronRight size={12} className="rotate-90" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-line to-line" />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECȚIUNEA 2 — SUBFLOTELE (subcontractors) — panou verde        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {groups.some((g) => g.kind === "sub") && (
          <section className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] to-transparent p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                <Building2 size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                    Subflote
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-200/70">
                    lucrează pentru tine
                  </span>
                </div>
                <div className="mt-1 text-[18px] font-black tracking-tight text-fg">
                  {groups.filter((g) => g.kind === "sub").length} {groups.filter((g) => g.kind === "sub").length === 1 ? "subcontractor" : "subcontractori"}
                </div>
                <div className="text-[11.5px] text-fg-muted">
                  Fiecare are propriul <b className="text-fg">Subcontractor Owner</b>. Ei văd doar echipa lor; tu îi vezi pe toți.
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {groups.filter((g) => g.kind === "sub").map((g) => (
                <Card key={g.key} className="overflow-hidden border-emerald-500/20">
                  <div className="flex flex-wrap items-center gap-3 border-b border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-200">
                      <Building2 size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-fg">{g.title}</div>
                      <div className="text-[10.5px] text-fg-muted">{g.subtitle}</div>
                    </div>
                    <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11.5px] font-bold text-emerald-200">
                      {g.users.length} {g.users.length === 1 ? "utilizator" : "utilizatori"}
                    </span>
                  </div>
                  <UsersTable users={g.users} selected={selected} setSelected={setSelected} onEdit={setEditFor} />
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Old scaffold preserved as no-op for structural sanity — nu se randează. */}
        {false && groups.map((g) => (
          <div key={g.key} className="hidden">
            <Card className={cn(
              "overflow-hidden",
              g.kind === "mine" ? "border-2 border-violet-500/40 shadow-lg shadow-violet-500/5" : "ml-0 md:ml-6",
            )}>
              <div className={cn(
                "flex flex-wrap items-center gap-3 border-b px-4 py-3",
                g.kind === "mine"
                  ? "border-violet-500/25 bg-gradient-to-r from-violet-500/[0.12] via-indigo-500/[0.08] to-transparent"
                  : "border-line/70 bg-gradient-to-r from-emerald-500/[0.05] to-transparent",
              )}>
                <span className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-md",
                  g.kind === "mine"
                    ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                    : "bg-gradient-to-br from-emerald-500 to-teal-500 text-white",
                )}>
                  {g.kind === "mine" ? <Crown size={17} /> : <Building2 size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn(
                      "rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-widest",
                      g.kind === "mine"
                        ? "border-violet-400/60 bg-violet-500/25 text-violet-100"
                        : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
                    )}>
                      {g.kind === "mine" ? "Flota mamă" : "Subflotă"}
                    </span>
                    <span className="text-[14.5px] font-bold text-fg">{g.title.replace(/^Flota mea — /, "")}</span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-fg-muted">{g.subtitle}</div>
                </div>
                <span className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11.5px] font-bold",
                  g.kind === "mine"
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-100"
                    : "border-line bg-card text-fg-muted",
                )}>
                  {g.users.length} {g.users.length === 1 ? "utilizator" : "utilizatori"}
                </span>
              </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[12px]">
                <thead>
                  <tr className="border-b border-line/50 text-left text-[10.5px] uppercase tracking-wide text-fg-dim">
                    <th className="px-4 py-2.5">Nume</th>
                    <th className="py-2.5 pr-2 font-medium">Email</th>
                    <th className="py-2.5 pr-2 font-medium">Rol</th>
                    <th className="py-2.5 pr-2 font-medium">Status</th>
                    <th className="py-2.5 pr-2 font-medium">Ultima conectare</th>
                    <th className="px-4 py-2.5 text-right font-medium">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {g.users.map((u) => (
                    <tr key={u.id} className={cn("border-b border-line/40 hover:bg-white/[0.02]", selected?.id === u.id && "bg-accent/[0.06]")}>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => setSelected(u)} className="flex items-center gap-2">
                          <CourierAvatar name={u.name} size={24} />
                          <span className="font-medium text-fg hover:underline">{u.name}</span>
                        </button>
                      </td>
                      <td className="py-2.5 pr-2 text-fg-muted">{u.email}</td>
                      <td className="py-2.5 pr-2">
                        <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", ROLE_BADGE_STYLE[u.role])}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2">
                        <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", u.status === "active" ? "text-[color:var(--color-success)]" : u.status === "inactive" ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-warn)]")}>
                          <span className={cn("h-2 w-2 rounded-full", u.status === "active" ? "bg-emerald-400" : u.status === "inactive" ? "bg-rose-400" : "bg-amber-400")} />
                          {USER_STATUS_LABEL[u.status]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-fg-muted">{u.lastLoginLabel}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Popover align="right" className="w-[170px] p-1" trigger={({ toggle }) => (
                          <button type="button" onClick={toggle} aria-label="Acțiuni" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg">
                            <MoreHorizontal size={16} />
                          </button>
                        )}>
                          {(close) => (
                            <div className="flex flex-col">
                              <button type="button" onClick={() => { setSelected(u); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Vezi detalii</button>
                              <button type="button" onClick={() => { toast.info("Editează utilizator", u.name); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Editează</button>
                            </div>
                          )}
                        </Popover>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Distribuția pe roluri</CardTitle></CardHeader><CardBody><Donut data={stats.roleDonut} center={list.length} label="utilizatori" /></CardBody></Card>
        <Card><CardHeader><CardTitle>Activitate (ultimele 7 zile)</CardTitle></CardHeader><CardBody><div className="h-[170px]"><ResponsiveContainer><BarChart data={stats.activity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="day" tickLine={false} axisLine={false} /><Bar dataKey="logins" fill="#3b82f6" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="unique" fill="#8b5cf6" radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><div className="mt-2 flex gap-4 text-[11px]"><span className="flex items-center gap-1.5 text-fg-muted"><span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" /> Conectări</span><span className="flex items-center gap-1.5 text-fg-muted"><span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" /> Utilizatori unici</span></div></CardBody></Card>
        <Card><CardHeader><CardTitle>Statut utilizatori</CardTitle></CardHeader><CardBody><Donut data={stats.statusDonut} center={list.length} label="total" /></CardBody></Card>
      </div>

      {selected && <UserDrawer u={selected} onClose={() => setSelected(null)} onEdit={() => { setEditFor(selected); setSelected(null); }} />}
      {editFor && <EditUserDialog user={editFor} onClose={() => setEditFor(null)} />}
      <InviteUserDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <AddUserDirectDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(created) => {
          // Mirror în settings.team pentru compatibilitate cu componentele care citesc de acolo.
          addTeamMember({
            name: created.name,
            email: created.email,
            role: rbacRoleToTeamRole(created.role),
            workspace: user.activeTenant.name,
            sendInvite: false,
          });
        }}
      />
    </div>
  );
}

/**
 * Distinge vizual dacă un user are cont real (poate face login) sau doar așteaptă acceptarea.
 * Alegerea afișării:
 *  - hasAccount + status="active"  → verde „Are cont"
 *  - hasAccount + status="inactive"→ gri  „Cont dezactivat"
 *  - !hasAccount + status="invited"→ ambar „Așteaptă accept" (invitația e trimisă, n-a setat parolă)
 *  - !hasAccount + orice altceva   → alb  „Fără login" (mock/legacy)
 */
function LoginBadge({ hasAccount, status }: { hasAccount: boolean; status: string }) {
  if (hasAccount && status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-200">
        <KeyRound size={10} /> Are cont
      </span>
    );
  }
  if (hasAccount) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-muted">
        <KeyRound size={10} /> Cont dezactivat
      </span>
    );
  }
  if (status === "invited") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-200">
        <Clock size={10} /> Așteaptă accept
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-line bg-white/[0.03] px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-dim">
      Fără login
    </span>
  );
}

/** Tabelul cu utilizatori pentru un grup (mine sau sub). Extras ca să fie reutilizat. */
function UsersTable({ users, selected, setSelected, onEdit }: {
  users: AppUser[];
  selected: AppUser | null;
  setSelected: (u: AppUser | null) => void;
  onEdit: (u: AppUser) => void;
}) {
  const { findUserByEmail } = useAuth();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-[12px]">
        <thead>
          <tr className="border-b border-line/50 text-left text-[10.5px] uppercase tracking-wide text-fg-dim">
            <th className="px-4 py-2.5">Nume</th>
            <th className="py-2.5 pr-2 font-medium">Email</th>
            <th className="py-2.5 pr-2 font-medium">Rol</th>
            <th className="py-2.5 pr-2 font-medium">Login</th>
            <th className="py-2.5 pr-2 font-medium">Status</th>
            <th className="py-2.5 pr-2 font-medium">Ultima conectare</th>
            <th className="px-4 py-2.5 text-right font-medium">Acțiuni</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className={cn("border-b border-line/40 hover:bg-white/[0.02]", selected?.id === u.id && "bg-accent/[0.06]")}>
              <td className="px-4 py-2.5">
                <button type="button" onClick={() => setSelected(u)} className="flex items-center gap-2">
                  <CourierAvatar name={u.name} size={24} />
                  <span className="font-medium text-fg hover:underline">{u.name}</span>
                </button>
              </td>
              <td className="py-2.5 pr-2 text-fg-muted">{u.email}</td>
              <td className="py-2.5 pr-2">
                <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", ROLE_BADGE_STYLE[u.role])}>
                  {ROLE_LABELS[u.role]}
                </span>
              </td>
              <td className="py-2.5 pr-2">
                <LoginBadge hasAccount={findUserByEmail(u.email) !== null} status={u.status} />
              </td>
              <td className="py-2.5 pr-2">
                <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", u.status === "active" ? "text-[color:var(--color-success)]" : u.status === "inactive" ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-warn)]")}>
                  <span className={cn("h-2 w-2 rounded-full", u.status === "active" ? "bg-emerald-400" : u.status === "inactive" ? "bg-rose-400" : "bg-amber-400")} />
                  {USER_STATUS_LABEL[u.status]}
                </span>
              </td>
              <td className="py-2.5 pr-2 text-fg-muted">{u.lastLoginLabel}</td>
              <td className="px-4 py-2.5 text-right">
                <Popover align="right" className="w-[170px] p-1" trigger={({ toggle }) => (
                  <button type="button" onClick={toggle} aria-label="Acțiuni" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg">
                    <MoreHorizontal size={16} />
                  </button>
                )}>
                  {(close) => (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => { setSelected(u); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Vezi detalii</button>
                      <button type="button" onClick={() => { onEdit(u); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Editează</button>
                    </div>
                  )}
                </Popover>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Card explicativ care arată vizual ierarhia: „Eu (flota mamă) → Subflotele mele". */
function HierarchyExplainer({ fleetName, subCount }: { fleetName: string; subCount: number }) {
  return (
    <Card className="overflow-hidden bg-gradient-to-r from-violet-500/[0.06] via-indigo-500/[0.04] to-transparent p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-fg-muted">
        <Users size={12} /> Cum e structurată echipa ta
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {/* Nod 1 — Flota mamă */}
        <div className="flex items-center gap-2 rounded-xl border-2 border-violet-500/40 bg-violet-500/10 px-3 py-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
            <Crown size={14} />
          </span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Flota mamă</div>
            <div className="text-[12.5px] font-bold text-fg">{fleetName}</div>
            <div className="text-[10.5px] text-fg-muted">tu + oamenii tăi direcți</div>
          </div>
        </div>

        <ChevronRight size={16} className="text-fg-dim" />

        {/* Nod 2 — Subflote */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <Building2 size={14} />
          </span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Subflote</div>
            <div className="text-[12.5px] font-bold text-fg">{subCount} {subCount === 1 ? "subcontractor" : "subcontractori"}</div>
            <div className="text-[10.5px] text-fg-muted">fiecare cu owner-ul și echipa lui</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-relaxed text-fg-muted">
        <b className="text-fg">Ce vezi tu (Global Owner):</b> flota mamă (marcată violet) + toate subflotele (verzi). Fiecare subflotă are propriul <b>Subcontractor Owner</b> care își administrează echipa lui. Tu vezi tot, ei văd doar propria subflotă.
      </p>
    </Card>
  );
}

function Kpi({ icon: Icon, tint, color, label, value }: { icon: typeof Users; tint: string; color: string; label: string; value: number }) {
  return <Card className="p-4"><div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tint)}><Icon size={17} className={color} /></div><div className="mt-3 text-[12px] font-medium text-fg-muted">{label}</div><div className="mt-0.5 text-[19px] font-bold tabular-nums text-fg">{formatInt(value)}</div></Card>;
}
function Donut({ data, center, label }: { data: Array<{ key: string; label: string; color: string; value: number }>; center: number; label: string }) {
  return <div className="flex items-center gap-4"><div className="relative h-[150px] w-[150px]"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>{data.map((d) => <Cell key={d.key} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[18px] font-bold text-fg">{center}</span><span className="text-[10px] text-fg-dim">{label}</span></div></div><div className="flex flex-1 flex-col gap-2">{data.map((d) => <div key={d.key} className="flex items-center justify-between text-[12px]"><span className="flex items-center gap-2 text-fg"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />{d.label}</span><span className="tabular-nums text-fg-muted">{d.value}</span></div>)}</div></div>;
}

const U_TABS = [["perms", "Permisiuni"], ["activity", "Activitate"], ["settings", "Setări"], ["notes", "Note"]] as const;
function UserDrawer({ u, onClose, onEdit }: { u: AppUser; onClose: () => void; onEdit: () => void }) {
  const [tab, setTab] = useState<(typeof U_TABS)[number][0]>("perms");
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] flex-col border-l border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-[13px] font-semibold text-fg">Detalii utilizator</span><button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><X size={16} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col items-center gap-2 px-4 py-4 text-center"><CourierAvatar name={u.name} size={56} /><div><div className="text-[15px] font-bold text-fg">{u.name}</div><div className="text-[11.5px] text-fg-muted">{u.email}</div></div><div className="flex items-center gap-2"><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", u.status === "active" ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-300" : "border-line bg-white/[0.04] text-fg-muted")}>{USER_STATUS_LABEL[u.status]}</span><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", ROLE_BADGE_STYLE[u.role])}>{ROLE_LABELS[u.role]}</span></div><div className="text-[11px] text-fg-dim">{ROLE_SUBTITLE[u.role]}</div></div>
          <div className="flex flex-col gap-1.5 px-4 pb-3 text-[12px]"><span className="flex items-center gap-2 text-fg-muted"><Phone size={13} className="text-fg-dim" /> {u.phone}</span><span className="flex items-center gap-2 text-fg-muted"><MapPin size={13} className="text-fg-dim" /> {u.location}</span><span className="flex items-center gap-2 text-fg-muted"><Mail size={13} className="text-fg-dim" /> Membru din {u.memberSince}</span></div>
          <div className="flex items-center gap-1 border-b border-line px-3">{U_TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={cn("relative px-2.5 py-2 text-[12.5px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{l}{tab === k && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}</button>)}</div>
          <div className="p-3">
            {tab === "perms" && <div className="rounded-xl border border-line bg-card-2 p-2"><div className="mb-1 px-1 text-[11px] font-semibold text-fg-dim">Module accesibile (din ACCESS_MATRIX)</div><div className="flex flex-col">{NAV_ITEMS.map((item) => { const allowed = hasPermission(u.role, item.permission); return <div key={item.href} className="flex items-center gap-2 rounded-lg px-2 py-1.5"><span className={cn("flex h-4 w-4 items-center justify-center rounded border", allowed ? "border-accent bg-accent text-white" : "border-line")}>{allowed && <Check size={11} strokeWidth={3} />}</span><span className="flex-1 text-[12.5px] text-fg">{item.label}</span><span className={cn("text-[10.5px]", allowed ? "text-[color:var(--color-success)]" : "text-fg-dim")}>{allowed ? (u.role === "global_owner" ? "Administrare" : "Acces") : "Fără acces"}</span></div>; })}</div></div>}
            {tab === "activity" && <ol className="relative ml-1.5 flex flex-col gap-3 border-l border-line pl-4 text-[12px]"><li className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-emerald-400" /><div className="font-medium text-fg">Autentificare reușită</div><div className="text-fg-dim">{u.lastLoginLabel}</div></li><li className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-sky-400" /><div className="font-medium text-fg">Rol atribuit</div><div className="text-fg-dim">{ROLE_LABELS[u.role]}</div></li></ol>}
            {tab === "settings" && <div className="text-[12.5px] text-fg-muted">Preferințe cont și notificări. Departament: <b className="text-fg">{u.department}</b>.</div>}
            {tab === "notes" && <textarea rows={4} placeholder="Adaugă o notă..." className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />}
          </div>
        </div>
        <div className="border-t border-line p-3"><button type="button" onClick={onEdit} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-2 text-[12.5px] font-semibold text-white"><UserCog size={14} /> Editează utilizator</button></div>
      </aside>
    </>
  );
}

/** Creare cont direct — owner tastează email + parolă, contul e activ instant, fără email. */
function AddUserDirectDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (data: { name: string; email: string; role: Role }) => void;
}) {
  const { createUserDirect } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string; name: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const reset = () => { setName(""); setEmail(""); setPassword(""); setRole("viewer"); setError(null); setCreated(null); setShowPw(false); };
  const handleClose = () => { reset(); onClose(); };

  const generateStrongPassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setPassword(p);
    setShowPw(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await createUserDirect({ name, email, password, role });
    if (!res.ok) { setError(res.error); return; }
    setCreated({ email: res.user.email, password, name: res.user.name });
    onCreated({ name: res.user.name, email: res.user.email, role });
    toast.success("Cont creat", res.user.name);
  };

  const copyCreds = async () => {
    if (!created) return;
    const text = `Email: ${created.email}\nParolă: ${created.password}\nAutentificare: ${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Credentiale copiate", "Trimite-le utilizatorului pe orice canal.");
    } catch {
      toast.info("Copiază manual", text);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Adaugă cont direct"
      description="Fără email — tu setezi parola acum și o dai verbal / pe WhatsApp / etc."
      size="md"
    >
      {!created ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Nume complet *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-violet-500/60" placeholder="Ex: Ana Popescu" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Email *</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-violet-500/60" placeholder="user@firma.ro" />
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[11.5px] font-medium text-fg-muted">
              <span>Parolă (min. 6 caractere) *</span>
              <button type="button" onClick={generateStrongPassword} className="text-[11px] font-semibold text-violet-300 hover:underline">Generează una</button>
            </span>
            <div className="flex gap-1.5">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="min-w-0 flex-1 rounded-lg border border-line bg-card-hover px-3 py-2 font-mono text-[12.5px] text-fg outline-none focus:border-violet-500/60"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="rounded-lg border border-line bg-card-hover px-3 text-[11px] text-fg-muted hover:text-fg"
              >
                {showPw ? "Ascunde" : "Arată"}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Rol atribuit *</span>
            <Select value={role} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} onChange={(v) => setRole(v as Role)} ariaLabel="Rol" />
          </label>

          <div className="rounded-md border border-sky-500/30 bg-sky-500/[0.06] p-2.5 text-[11px] text-sky-100">
            Nu se trimite niciun email. Contul e activ imediat. După creare vei putea copia credențialele pentru a le trimite pe canalul tău.
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100">{error}</div>
          )}

          <DialogFooter>
            <button type="button" onClick={handleClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg">Anulează</button>
            <button type="submit" className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white">Creează cont</button>
          </DialogFooter>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] p-3">
            <div className="text-[12.5px] font-semibold text-fg">Contul {created.name} a fost creat</div>
            <div className="mt-2 space-y-1 rounded-md bg-card-2 p-2 font-mono text-[12px] text-fg">
              <div><span className="text-fg-dim">Email:</span> {created.email}</div>
              <div><span className="text-fg-dim">Parolă:</span> {created.password}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={copyCreds}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-[12.5px] font-semibold text-violet-100 hover:bg-violet-500/15"
          >
            Copiază credențialele
          </button>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] p-2.5 text-[11px] text-amber-100">
            <b>Important:</b> aceasta e singura ocazie când vezi parola. Trimite-o utilizatorului acum. După închiderea acestui dialog nu se mai poate recupera — doar resetată.
          </div>
          <DialogFooter>
            <button type="button" onClick={handleClose} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white">Gata</button>
          </DialogFooter>
        </div>
      )}
    </Dialog>
  );
}
