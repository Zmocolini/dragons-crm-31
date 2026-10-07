"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Building2, CheckCircle2, Download, FileText, Mail, MapPin, MoreHorizontal, Paperclip, Phone, Plus, Search, Trash2, Upload, Users, Wallet, X } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Popover, ProgressBar, Select } from "@/components/reports/controls";
import { CourierAvatar } from "@/components/reports/bits";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { isWaiting } from "@/lib/couriers/filters";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { usePayments } from "@/lib/payments/context";
import { subNetTotals } from "@/lib/subcontractors/net";
import { formatInt, formatRon } from "@/lib/reports/analytics";
import { buildXlsx, downloadBlob } from "@/lib/reports/xlsx";
import {
  SUB_STATUS_LABEL, SUB_STATUS_STYLE, SUB_TYPE_LABEL, buildSubcontractors, computeSubKpi, daysUntil,
  type SubStatus, type SubType, type Subcontractor, type SubcontractorContractFile,
} from "@/lib/subcontractors/data";
import { cn } from "@/lib/utils/cn";
import { AccountsPanel } from "./AccountsPanel";
import { EcontracteePage } from "@/components/econtracts/EcontracteePage";
import { usePersistentList } from "@/lib/utils/use-persistent-list";
import { useFleetTasks } from "@/lib/tasks/context";
import { computeRequestsForSub } from "@/lib/subcontractors/use-subcontractor-requests";

const PAGE = 10;
function fmt(iso: string): string { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; }
const TABS: Array<[SubStatus | "all", string]> = [["all", "Toți"], ["active", "Activi"], ["evaluation", "În evaluare"], ["inactive", "Inactivi"]];

export function SubcontractorsPage({ initialView = "list" }: { initialView?: "list" | "accounts" | "contracts" }) {
  const toast = useToast();
  const { user, activeFleetId, can } = useSession();
  const { allRows } = useCouriers();
  const { payments: allPayments } = usePayments();
  const { allTasks } = useFleetTasks();
  const canManage = can("subcontractors.view") && user.role === "global_owner";
  const canContracts = can("payments.view");

  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);
  const seed = useMemo(() => buildSubcontractors(fleetCouriers, activeFleetId), [fleetCouriers, activeFleetId]);
  const [added, setAdded] = usePersistentList<Subcontractor>("crm31-subcontractors-added");
  const [overrides, setOverrides] = usePersistentList<{ id: string } & Partial<Subcontractor>>("crm31-subcontractor-overrides");

  // Auto: conturile CRM cu rol subcontractor_owner apar aici (fără să fie adăugate manual).
  const [userSubs, setUserSubs] = useState<Subcontractor[]>([]);
  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((j) => {
      const subs = (j.users ?? []).filter((u: { role: string; active: boolean }) => u.role === "subcontractor_owner" && u.active);
      const mapped: Subcontractor[] = subs.map((u: { id: string; name: string; email: string; createdAtIso: string }) => {
        const couriersOfSub = fleetCouriers.filter((c) => (c.createdBy ?? "").toLowerCase() === u.email.toLowerCase());
        const isAnton = u.name.toLowerCase().includes("anton") || u.email.toLowerCase().includes("anton");
        return {
          id: `usr_sub_${u.id}`,
          company: u.name,
          tagline: "Cont subcontractor CRM",
          cui: "—",
          contactName: u.name,
          contactPhone: "",
          contactEmail: u.email,
          website: "",
          location: "",
          cities: Array.from(new Set(couriersOfSub.map((c) => c.city).filter(Boolean))),
          platforms: Array.from(new Set(couriersOfSub.flatMap((c) => c.platforms))),
          couriersCount: couriersOfSub.length,
          waitingCount: couriersOfSub.filter(isWaiting).length,
          commissionPct: isAnton ? 3 : 10,
          status: "active",
          type: "srl",
          startIso: (u.createdAtIso ?? "").slice(0, 10),
          contractEndIso: "",
          tenantId: activeFleetId,
          revenue3m: 0,
          commissionGenerated: 0,
          payRate: 100,
        };
      });
      setUserSubs(mapped);
    }).catch(() => {});
  }, [fleetCouriers, activeFleetId]);

  // Scope pe un subcontractor (FleetCard): vezi doar înregistrarea lui, nu pe a celorlalți.
  const { scope } = useOwnerScope();
  const list = useMemo(() => {
    const all = [...userSubs, ...added, ...seed];
    const withOverrides = all.map((s) => {
      const ov = overrides.find((o) => o.id === s.id || (s.company && o.company && o.company.toLowerCase() === s.company.toLowerCase()));
      if (!ov) return s;
      const merged = { ...s, ...ov };
      if (ov.commissionPct !== undefined && s.revenue3m) {
        merged.commissionGenerated = Math.round((s.revenue3m * ov.commissionPct) / 100);
      }
      return merged;
    });
    if (!scope) return withOverrides;
    return withOverrides.filter((s) => s.contactEmail.toLowerCase() === scope.email.toLowerCase());
  }, [userSubs, added, seed, overrides, scope]);

  // Net trimis (după comision) per subcontractor: plățile contului lui sau către curierii lui.
  const netBySub = useMemo(() => {
    const fleetPays = allPayments.filter((p) => p.fleetId === activeFleetId);
    const m = new Map<string, ReturnType<typeof subNetTotals>>();
    for (const s of list) {
      const ids = new Set(fleetCouriers.filter((c) => (c.createdBy ?? "").toLowerCase() === s.contactEmail.toLowerCase()).map((c) => c.id));
      m.set(s.id, subNetTotals(fleetPays, s.contactEmail, ids));
    }
    return m;
  }, [allPayments, activeFleetId, list, fleetCouriers]);
  const netTotal = useMemo(() => Array.from(netBySub.values()).reduce((a, n) => a + n.net, 0), [netBySub]);

  const [q, setQ] = useState(""); const [tab, setTab] = useState<SubStatus | "all">("all"); const [city, setCity] = useState("all"); const [platform, setPlatform] = useState("all"); const [type, setType] = useState("all");
  const [view, setView] = useState<"list" | "accounts" | "contracts">(initialView);
  const [page, setPage] = useState(1); const [selected, setSelected] = useState<Subcontractor | null>(null); const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Subcontractor | null>(null);

  const handleUpdateSub = (id: string, patch: Partial<Subcontractor>) => {
    setOverrides((prev) => {
      const idx = prev.findIndex((o) => o.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch, id };
        return next;
      }
      return [...prev, { ...patch, id }];
    });
    setAdded((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
    setSelected((prev) => prev && prev.id === id ? { ...prev, ...patch } : prev);
    toast.success("Subcontractor actualizat", `${patch.company ?? "Modificările au fost salvate"} · Comision: ${patch.commissionPct ?? ""}%`);
  };

  const cities = useMemo(() => Array.from(new Set(list.flatMap((s) => s.cities))).sort(), [list]);
  const kpi = useMemo(() => computeSubKpi(list), [list]);
  const counts = useMemo(() => ({ all: list.length, active: kpi.active, evaluation: kpi.evaluation, inactive: kpi.inactive }), [list, kpi]);

  const filtered = useMemo(() => list.filter((s) => {
    if (tab !== "all" && s.status !== tab) return false;
    const term = q.trim().toLowerCase();
    if (term && !`${s.company} ${s.contactName} ${s.cui}`.toLowerCase().includes(term)) return false;
    if (city !== "all" && !s.cities.includes(city)) return false;
    if (platform !== "all" && !s.platforms.includes(platform as "bolt")) return false;
    if (type !== "all" && s.type !== type) return false;
    return true;
  }), [list, tab, q, city, platform, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const stats = useMemo(() => {
    const months = ["Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep"];
    const base = kpi.totalCouriers;
    const line = months.map((m, i) => ({ month: m, couriers: Math.round(base * (0.7 + i * 0.05)) }));
    const byPlat: Record<string, number> = { bolt: 0, wolt: 0, glovo: 0 };
    for (const s of list) s.platforms.forEach((p) => (byPlat[p] += Math.round(s.couriersCount / s.platforms.length)));
    const donut = (["bolt", "wolt", "glovo"] as const).map((p) => ({ key: p, label: p === "bolt" ? "Bolt" : p === "wolt" ? "Wolt" : "Glovo", color: p === "bolt" ? "#34d399" : p === "wolt" ? "#38bdf8" : "#facc15", value: byPlat[p] }));
    const byCity = new Map<string, number>();
    for (const s of list) s.cities.forEach((c) => byCity.set(c, (byCity.get(c) ?? 0) + s.couriersCount));
    const cityBars = Array.from(byCity.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    return { line, donut, cityBars, totalPlatCouriers: byPlat.bolt + byPlat.wolt + byPlat.glovo };
  }, [list, kpi.totalCouriers]);
  const maxCity = Math.max(1, ...stats.cityBars.map((b) => b.count));

  const exportXlsx = () => { downloadBlob(buildXlsx([{ name: "Subcontractori", rows: [["Firmă", "CUI", "Contact", "Orașe", "Curieri", "Comision%", "Contract", "Status"], ...filtered.map((s) => [s.company, s.cui, s.contactName, s.cities.join(", "), s.couriersCount, s.commissionPct, fmt(s.contractEndIso), SUB_STATUS_LABEL[s.status]])] }]), `${user.activeTenant.name.replace(/\s+/g, "-")}-Subcontractori.xlsx`); toast.success("Export", `${filtered.length} subcontractori.`); };

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      {view !== "contracts" && <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[26px] font-bold tracking-tight text-fg">Subcontractori</h1><p className="mt-1 max-w-2xl text-[13px] text-fg-muted">Gestionează partenerii și subcontractorii. Monitorizează performanța, contractele și curierii alocați.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={exportXlsx} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"><Download size={14} className="text-fg-dim" /> Exportă</button><button type="button" onClick={() => setAddOpen(true)} disabled={!canManage} className={cn("inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white", !canManage && "opacity-50")}><Plus size={15} /> Adaugă subcontractor</button></div>
      </header>}

      {(canManage || canContracts) && (
        <div role="tablist" className="inline-flex w-fit rounded-lg border border-line bg-card-2 p-0.5 text-[12.5px] font-medium">
          {([["list", "Subcontractori"], ["contracts", "Contracte"], ["accounts", "Conturi și invitații"]] as const).filter(([k]) => k === "list" || (k === "contracts" ? canContracts : canManage)).map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cn("rounded-md px-3 py-1.5", view === k ? "bg-white/[0.08] text-fg" : "text-fg-muted hover:text-fg")}>{l}</button>
          ))}
        </div>
      )}

      {view === "contracts" && canContracts ? <EcontracteePage /> : view === "accounts" && canManage ? <AccountsPanel /> : (<>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        <Kpi icon={Briefcase} tint="bg-info/12" color="text-[color:var(--color-info)]" label="Total subcontractori" value={kpi.total} />
        <Kpi icon={CheckCircle2} tint="bg-success/12" color="text-[color:var(--color-success)]" label="Activi" value={kpi.active} />
        <Kpi icon={Briefcase} tint="bg-warn/12" color="text-[color:var(--color-warn)]" label="În evaluare" value={kpi.evaluation} />
        <Kpi icon={Briefcase} tint="bg-danger/12" color="text-[color:var(--color-danger)]" label="Inactivi" value={kpi.inactive} />
        <Kpi icon={Users} tint="bg-info/12" color="text-[color:var(--color-info)]" label="Total curieri" value={kpi.totalCouriers} />
        <Kpi icon={Wallet} tint="bg-accent/15" color="text-[color:var(--color-accent-3)]" label="Comision total" value={kpi.commissionTotal} money sub="luna curentă" />
        <Kpi icon={Wallet} tint="bg-success/12" color="text-[color:var(--color-success)]" label="Net trimis (după comision)" value={netTotal} money sub="toți subcontractorii" />
      </div>

      <div className="overflow-x-auto border-b border-line"><div className="flex min-w-max gap-1">{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => { setTab(k); setPage(1); }} className={cn("relative px-3 py-2.5 text-[13px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{l}<span className="ml-1.5 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] tabular-nums text-fg-muted">{counts[k]}</span>{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}</button>)}</div></div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Caută subcontractor..." className="w-full rounded-lg border border-line bg-card-hover py-2 pl-9 pr-3 text-[12.5px] text-fg outline-none focus:border-accent/60" /></div>
        <Select value={city} options={[{ value: "all", label: "Toate orașele" }, ...cities.map((c) => ({ value: c, label: c }))]} onChange={(v) => { setCity(v); setPage(1); }} className="w-[150px]" ariaLabel="Oraș" />
        <Select value={platform} options={[{ value: "all", label: "Toate platformele" }, { value: "bolt", label: "Bolt" }, { value: "wolt", label: "Wolt" }, { value: "glovo", label: "Glovo" }]} onChange={(v) => { setPlatform(v); setPage(1); }} className="w-[160px]" ariaLabel="Platformă" />
        <Select value={type} options={[{ value: "all", label: "Toate tipurile" }, { value: "srl", label: "SRL" }, { value: "pfa", label: "PFA" }]} onChange={(v) => { setType(v); setPage(1); }} className="w-[130px]" ariaLabel="Tip" />
      </div>

      <div className={cn(selected && "lg:pr-[340px]")}>
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1160px] text-[12px]">
          <thead><tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-fg-dim"><th className="px-4 py-2.5">#</th><th className="py-2.5 pr-2 font-medium">Nume / Firmă</th><th className="py-2.5 pr-2 font-medium">CUI</th><th className="py-2.5 pr-2 font-medium">Contact</th><th className="py-2.5 pr-2 font-medium">Orașe</th><th className="py-2.5 pr-2 font-medium">Platforme</th><th className="py-2.5 pr-2 text-center font-medium">Curieri</th><th className="py-2.5 pr-2 text-center font-medium">Așteaptă loc</th><th className="py-2.5 pr-2 font-medium">Cereri flotă</th><th className="py-2.5 pr-2 font-medium">Comision</th><th className="py-2.5 pr-2 text-right font-medium">Net trimis</th><th className="py-2.5 pr-2 font-medium">Contract</th><th className="py-2.5 pr-2 font-medium">Status</th><th className="px-4 py-2.5 text-right font-medium">Acțiuni</th></tr></thead>
          <tbody>{rows.map((s, i) => {
            const reqs = computeRequestsForSub(fleetCouriers, allTasks, { email: s.contactEmail, name: s.company });
            return (
              <tr key={s.id} className={cn("border-b border-line/50 hover:bg-white/[0.02]", selected?.id === s.id && "bg-accent/[0.06]")}>
                <td className="px-4 py-2.5 text-fg-dim tabular-nums">{(safePage - 1) * PAGE + i + 1}</td>
                <td className="py-2.5 pr-2"><button type="button" onClick={() => setSelected(s)} className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-blue-500/40 text-[10px] font-bold text-white">{s.company.slice(0, 2).toUpperCase()}</span><span className="max-w-[150px] truncate font-medium text-fg hover:underline">{s.company}</span></button></td>
                <td className="py-2.5 pr-2 tabular-nums text-fg-muted">{s.cui}</td>
                <td className="py-2.5 pr-2"><div className="flex items-center gap-2"><CourierAvatar name={s.contactName} size={22} /><div><div className="text-fg">{s.contactName}</div><div className="text-[10.5px] text-fg-dim">{s.contactPhone}</div></div></div></td>
                <td className="py-2.5 pr-2 max-w-[120px] truncate text-fg-muted">{s.cities.join(", ")}</td>
                <td className="py-2.5 pr-2"><span className="flex gap-1">{s.platforms.map((p) => <Badge key={p} tone={p as "bolt"}>{p}</Badge>)}</span></td>
                <td className="py-2.5 pr-2 text-center tabular-nums text-fg">{s.couriersCount}</td>
                <td className="py-2.5 pr-2 text-center tabular-nums">{s.waitingCount ? <Link href={`/curieri?segment=asteptare&sub=${encodeURIComponent(s.contactEmail)}`} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20">{s.waitingCount}</Link> : <span className="text-fg-dim">—</span>}</td>
                <td className="py-2.5 pr-2">
                  {reqs.totalCount > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-300 w-fit">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {reqs.totalCount} {reqs.totalCount === 1 ? "cerere" : "cereri"}
                      </span>
                      <div className="flex flex-wrap gap-1 text-[10px] text-fg-dim">
                        {reqs.activationsCount > 0 && <span className="text-emerald-300 font-medium">{reqs.activationsCount} activare</span>}
                        {reqs.phoneChangesCount > 0 && <span className="text-sky-300 font-medium">{reqs.phoneChangesCount} tel</span>}
                        {reqs.vehicleChangesCount > 0 && <span className="text-purple-300 font-medium">{reqs.vehicleChangesCount} auto</span>}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-emerald-400/80 font-medium">✓ La zi</span>
                  )}
                </td>
                <td className="py-2.5 pr-2"><span className="rounded-md border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 tabular-nums">{s.commissionPct}%</span></td>
                <td className="py-2.5 pr-2 text-right tabular-nums" title={`Brut ${formatRon(netBySub.get(s.id)?.gross ?? 0)} − comision ${formatRon(netBySub.get(s.id)?.commission ?? 0)} · ${netBySub.get(s.id)?.count ?? 0} plăți`}><span className="font-semibold text-emerald-300">{formatRon(netBySub.get(s.id)?.net ?? 0)}</span></td>
                <td className="py-2.5 pr-2 tabular-nums text-fg-muted">{fmt(s.contractEndIso)}</td>
                <td className="py-2.5 pr-2"><span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", SUB_STATUS_STYLE[s.status])}>{SUB_STATUS_LABEL[s.status]}</span></td>
                <td className="px-4 py-2.5 text-right"><Popover align="right" className="w-[170px] p-1" trigger={({ toggle }) => <button type="button" onClick={toggle} aria-label="Acțiuni" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><MoreHorizontal size={16} /></button>}>{(close) => (<div className="flex flex-col"><button type="button" onClick={() => { setSelected(s); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Vezi detalii</button><button type="button" onClick={() => { setEditing(s); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Editează</button><button type="button" onClick={() => { toast.success("Mesaj trimis", s.contactName); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Trimite mesaj</button></div>)}</Popover></td>
              </tr>
            );
          })}</tbody>
        </table>{rows.length === 0 && <EmptyState title="Niciun subcontractor pentru filtrele selectate." />}</div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[12px] text-fg-muted"><span>Afișează {rows.length} din {filtered.length} subcontractori</span><div className="flex gap-1">{Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 5).map((n) => <button key={n} type="button" onClick={() => setPage(n)} className={cn("min-w-[30px] rounded-lg border px-2 py-1 tabular-nums", n === safePage ? "border-accent bg-accent/15 text-fg" : "border-line hover:text-fg")}>{n}</button>)}</div></div></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Evoluția curierilor</CardTitle></CardHeader><CardBody><div className="h-[180px]"><ResponsiveContainer><LineChart data={stats.line} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="month" tickLine={false} axisLine={false} /><Line type="monotone" dataKey="couriers" stroke="#8b5cf6" strokeWidth={2.2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></CardBody></Card>
        <Card><CardHeader><CardTitle>Distribuție pe platforme</CardTitle></CardHeader><CardBody><div className="flex items-center gap-4"><div className="relative h-[150px] w-[150px]"><ResponsiveContainer><PieChart><Pie data={stats.donut} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none" isAnimationActive={false}>{stats.donut.map((d) => <Cell key={d.key} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[16px] font-bold text-fg">{stats.totalPlatCouriers}</span><span className="text-[10px] text-fg-dim">curieri</span></div></div><div className="flex flex-1 flex-col gap-2">{stats.donut.map((d) => <div key={d.key} className="flex items-center justify-between text-[12px]"><span className="flex items-center gap-2 text-fg"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />{d.label}</span><span className="tabular-nums text-fg-muted">{d.value}</span></div>)}</div></div></CardBody></Card>
        <Card><CardHeader><CardTitle>Top orașe</CardTitle></CardHeader><CardBody><div className="flex flex-col gap-3">{stats.cityBars.map((b) => <div key={b.name}><div className="mb-1 flex justify-between text-[12px]"><span className="text-fg-muted">{b.name}</span><span className="tabular-nums text-fg">{b.count}</span></div><ProgressBar pct={(b.count / maxCity) * 100} color="#3b82f6" /></div>)}</div></CardBody></Card>
      </div>

      {selected && (
        <SubDrawer
          sub={selected}
          onClose={() => setSelected(null)}
          onEdit={() => setEditing(selected)}
          onUpdate={(patch) => {
            handleUpdateSub(selected.id, patch);
          }}
        />
      )}

      {editing && (
        <EditSubDialog
          sub={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSave={handleUpdateSub}
        />
      )}
      </>)}
      <AddSubDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={(s) => { setAdded((p) => [s, ...p]); toast.success("Subcontractor adăugat", s.company); }} tenantId={activeFleetId} />
    </div>
  );
}

function Kpi({ icon: Icon, tint, color, label, value, sub, money }: { icon: typeof Users; tint: string; color: string; label: string; value: number; sub?: string; money?: boolean }) {
  return <Card className="p-4"><div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tint)}><Icon size={17} className={color} /></div><div className="mt-3 text-[12px] font-medium text-fg-muted">{label}</div><div className="mt-0.5 text-[19px] font-bold tabular-nums text-fg">{money ? formatRon(value) : formatInt(value)}</div>{sub && <div className="mt-0.5 text-[11.5px] text-fg-dim">{sub}</div>}</Card>;
}

const SUB_TABS = [["general", "General"], ["couriers", "Curieri"], ["payments", "Plăți"], ["docs", "Documente"], ["notes", "Note"]] as const;
function SubDrawer({ sub, onClose, onEdit, onUpdate }: { sub: Subcontractor; onClose: () => void; onEdit?: () => void; onUpdate: (patch: Partial<Subcontractor>) => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<(typeof SUB_TABS)[number][0]>("general");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleContractUpload(file?: File) {
    if (!file) return;
    const ok = /\.(pdf|docx?|odt|rtf)$/i.test(file.name) || /pdf|word|openxmlformats|rtf/i.test(file.type);
    if (!ok) { toast.error("Format neacceptat", "Alege PDF sau Word (.doc / .docx)."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Fișier prea mare", "Limita e 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const contractFile: SubcontractorContractFile = {
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result as string,
        uploadedAtIso: new Date().toISOString(),
      };
      onUpdate({ contractFile });
      toast.success("Contract încărcat", file.name);
    };
    reader.onerror = () => toast.error("Nu s-a putut citi fișierul.");
    reader.readAsDataURL(file);
  }

  function removeContract() {
    onUpdate({ contractFile: null });
    toast.info("Contract șters");
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] flex-col border-l border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-[13px] font-semibold text-fg">Detalii subcontractor</span><button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><X size={16} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center gap-3 px-4 py-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/40 to-blue-500/40 text-[15px] font-bold text-white">{sub.company.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><div className="truncate text-[15px] font-bold text-fg">{sub.company}</div><div className="text-[11.5px] text-fg-muted">{sub.tagline}</div></div></div>
          <div className="flex items-center gap-2 px-4"><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", SUB_STATUS_STYLE[sub.status])}>{SUB_STATUS_LABEL[sub.status]}</span>{sub.platforms.map((p) => <Badge key={p} tone={p as "bolt"}>{p}</Badge>)}</div>
          <div className="flex flex-col gap-1.5 px-4 py-3 text-[12px]"><span className="flex items-center gap-2 text-fg-muted"><Users size={13} className="text-fg-dim" /> {sub.contactName}</span><span className="flex items-center gap-2 text-fg-muted"><Phone size={13} className="text-fg-dim" /> {sub.contactPhone}</span><span className="flex items-center gap-2 text-fg-muted"><Mail size={13} className="text-fg-dim" /> {sub.contactEmail}</span><span className="flex items-center gap-2 text-fg-muted"><MapPin size={13} className="text-fg-dim" /> {sub.location}</span><span className="flex items-center gap-2 text-fg-muted"><Building2 size={13} className="text-fg-dim" /> {sub.website}</span></div>
          <div className="flex items-center gap-1 border-b border-line px-3">{SUB_TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={cn("relative px-2 py-2 text-[12px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{l}{k === "couriers" ? ` (${sub.couriersCount})` : ""}{tab === k && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}</button>)}</div>
          <div className="p-3">
            {tab === "general" && <><div className="grid grid-cols-2 gap-2 text-[12px]"><Mini l="CUI" v={sub.cui} /><Mini l="Tip colaborare" v={SUB_TYPE_LABEL[sub.type]} /><Mini l="Comision" v={`${sub.commissionPct}% din net`} /><Mini l="Dată începere" v={fmt(sub.startIso)} /><Mini l="Dată expirare" v={fmt(sub.contractEndIso)} /><Mini l="Orașe active" v={sub.cities.join(", ")} /></div>
              <div className="mt-3"><div className="mb-2 flex items-center justify-between"><span className="text-[12px] font-semibold text-fg">Performanță (ultimele 3 luni)</span><button type="button" onClick={() => toast.info("Detalii performanță")} className="text-[11px] text-[color:var(--color-info)] hover:underline">Vezi detalii</button></div><div className="grid grid-cols-2 gap-2"><Perf icon={Users} label="Curieri activi" value={String(sub.couriersCount)} /><Perf icon={Wallet} label="Venituri totale" value={formatRon(sub.revenue3m)} /><Perf icon={Wallet} label="Comision generat" value={formatRon(sub.commissionGenerated)} /><Perf icon={CheckCircle2} label="Rată de plată" value={`${sub.payRate}%`} /></div></div></>}
            {tab === "couriers" && <div className="text-[12.5px] text-fg-muted">{sub.couriersCount} curieri alocați acestui subcontractor în flota curentă.</div>}
            {tab === "payments" && <div className="text-[12.5px] text-fg-muted">Comision generat luna curentă: <b className="text-fg">{formatRon(sub.commissionGenerated)}</b>. Rată de plată {sub.payRate}%.</div>}
            {tab === "docs" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-card-2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-fg">Contract semnat</span>
                    {sub.contractFile && (
                      <a
                        href={sub.contractFile.dataUrl}
                        download={sub.contractFile.name}
                        className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[color:var(--color-info)] hover:underline"
                      >
                        <Download size={11} /> Descarcă
                      </a>
                    )}
                  </div>
                  {sub.contractFile ? (
                    <div className="flex items-start gap-2">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted">
                        <FileText size={15} />
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-[12.5px] font-medium text-fg">{sub.contractFile.name}</div>
                        <div className="mt-0.5 text-[10.5px] text-fg-dim">
                          {(sub.contractFile.size / 1024).toFixed(0)} KB · încărcat {new Date(sub.contractFile.uploadedAtIso).toLocaleDateString("ro-RO")}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-[11px] font-medium text-fg-muted hover:text-fg">
                            <Upload size={11} /> Înlocuiește
                          </button>
                          <button type="button" onClick={removeContract} className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20">
                            <Trash2 size={11} /> Șterge
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed border-line bg-card/40 py-4 text-[12px] text-fg-muted transition-colors hover:border-violet-500/40 hover:bg-card-hover"
                    >
                      <Paperclip size={16} />
                      <span>Nu există contract. Apasă pentru a încărca (PDF sau Word, max 5 MB).</span>
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.odt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => { handleContractUpload(e.target.files?.[0]); e.target.value = ""; }}
                  />
                </div>
              </div>
            )}
            {tab === "notes" && <textarea rows={4} placeholder="Adaugă o notă..." className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-3"><button type="button" onClick={() => onEdit?.()} className="rounded-lg border border-line bg-card-hover py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Editează</button><button type="button" onClick={() => toast.success("Mesaj trimis", sub.contactName)} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 py-2 text-[12.5px] font-semibold text-white">Trimite mesaj</button></div>
      </aside>
    </>
  );
}
function Mini({ l, v }: { l: string; v: string }) { return <div className="rounded-lg border border-line bg-card-2 p-2"><div className="text-[10.5px] text-fg-dim">{l}</div><div className="mt-0.5 truncate text-[12px] font-medium text-fg">{v}</div></div>; }
function Perf({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) { return <div className="rounded-lg border border-line bg-card-2 p-2"><Icon size={14} className="text-[color:var(--color-accent-3)]" /><div className="mt-1 text-[13px] font-bold text-fg">{value}</div><div className="text-[10.5px] text-fg-dim">{label}</div></div>; }

function AddSubDialog({ open, onClose, onAdd, tenantId }: { open: boolean; onClose: () => void; onAdd: (s: Subcontractor) => void; tenantId: string }) {
  const [company, setCompany] = useState(""); const [cui, setCui] = useState(""); const [contact, setContact] = useState(""); const [comm, setComm] = useState("5");
  return <Dialog open={open} onClose={onClose} title="Adaugă subcontractor" size="lg"><div className="grid grid-cols-2 gap-3"><L l="Firmă"><input value={company} onChange={(e) => setCompany(e.target.value)} className={inp} /></L><L l="CUI"><input value={cui} onChange={(e) => setCui(e.target.value)} className={inp} /></L><L l="Persoană contact"><input value={contact} onChange={(e) => setContact(e.target.value)} className={inp} /></L><L l="Comision %"><input type="number" value={comm} onChange={(e) => setComm(e.target.value)} className={inp} /></L></div><DialogFooter><button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg">Anulează</button><button type="button" onClick={() => { onAdd({ id: `sub_new_${Date.now()}`, company: company || "Firmă nouă", tagline: "Partener nou", cui: cui || "RO0000000", contactName: contact || "—", contactPhone: "—", contactEmail: "—", website: "—", location: "București", cities: ["București"], platforms: ["bolt"], couriersCount: 0, commissionPct: Number(comm) || 5, status: "evaluation", type: "srl", startIso: "2026-01-01", contractEndIso: "2026-12-31", tenantId, revenue3m: 0, commissionGenerated: 0, payRate: 0 }); onClose(); }} className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white">Adaugă</button></DialogFooter></Dialog>;
}

function EditSubDialog({
  sub,
  open,
  onClose,
  onSave,
}: {
  sub: Subcontractor | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Subcontractor>) => void;
}) {
  const [company, setCompany] = useState("");
  const [cui, setCui] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [comm, setComm] = useState("10");
  const [status, setStatus] = useState<SubStatus>("active");
  const [type, setType] = useState<SubType>("srl");

  useEffect(() => {
    if (sub) {
      setCompany(sub.company);
      setCui(sub.cui === "—" ? "" : sub.cui);
      setContactName(sub.contactName);
      setContactPhone(sub.contactPhone);
      setContactEmail(sub.contactEmail);
      setComm(String(sub.commissionPct ?? 10));
      setStatus(sub.status);
      setType(sub.type);
    }
  }, [sub]);

  if (!sub) return null;

  return (
    <Dialog open={open} onClose={onClose} title={`Editează subcontractor: ${sub.company}`} size="lg">
      <div className="grid grid-cols-2 gap-3">
        <L l="Nume / Firmă">
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={inp} />
        </L>
        <L l="Comision %">
          <input
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={comm}
            onChange={(e) => setComm(e.target.value)}
            className={inp}
            placeholder="ex: 3"
          />
        </L>
        <L l="CUI">
          <input value={cui} onChange={(e) => setCui(e.target.value)} className={inp} placeholder="RO..." />
        </L>
        <L l="Persoană contact">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inp} />
        </L>
        <L l="Telefon">
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inp} />
        </L>
        <L l="Email">
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inp} />
        </L>
        <L l="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as SubStatus)} className={inp}>
            <option value="active">Activ</option>
            <option value="evaluation">În evaluare</option>
            <option value="inactive">Inactiv</option>
          </select>
        </L>
        <L l="Tip colaborare">
          <select value={type} onChange={(e) => setType(e.target.value as SubType)} className={inp}>
            <option value="srl">SRL (factură)</option>
            <option value="pfa">PFA</option>
          </select>
        </L>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg">
          Anulează
        </button>
        <button
          type="button"
          onClick={() => {
            const numComm = parseFloat(comm) || 0;
            onSave(sub.id, {
              company: company || sub.company,
              cui: cui || "—",
              contactName: contactName || sub.contactName,
              contactPhone,
              contactEmail,
              commissionPct: numComm,
              status,
              type,
            });
            onClose();
          }}
          className="rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white"
        >
          Salvează modificările
        </button>
      </DialogFooter>
    </Dialog>
  );
}

const inp = "w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60";
function L({ l, children }: { l: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">{l}</span>{children}</label>; }
