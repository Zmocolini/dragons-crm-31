"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Download, LifeBuoy, MoreHorizontal, Phone, Plus, Search, Send, Ticket as TicketIcon, X } from "lucide-react";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { EmptyState, Popover, ProgressBar, Select } from "@/components/reports/controls";
import { CourierAvatar } from "@/components/reports/bits";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { formatInt } from "@/lib/reports/analytics";
import {
  CATEGORY_COLOR, CATEGORY_LABEL, PRIORITY_LABEL, PRIORITY_STYLE, TICKET_STATUS_LABEL, TICKET_STATUS_STYLE,
  buildTickets, computeTicketKpi, type Ticket, type TicketCategory, type TicketMessage, type TicketPriority, type TicketStatus,
} from "@/lib/issues/data";
import { cn } from "@/lib/utils/cn";
import { QuickContactCard } from "./QuickContactCard";

const PAGE = 10;
const TABS: Array<[TicketStatus | "all", string]> = [["all", "Toate"], ["open", "Deschise"], ["in_progress", "În lucru"], ["resolved", "Rezolvate"], ["closed", "Închise"]];
function ago(iso: string): string { const d = new Date(iso); return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }) + ", " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); }

type NewTicketPayload = {
  subject: string; description: string;
  requesterName: string; category: TicketCategory; priority: TicketPriority; platform: string;
};

export function IssuesPage() {
  const toast = useToast();
  const { user, activeFleetId, can } = useSession();
  const { allRows } = useCouriers();
  const canManage = can("issues.view");

  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);
  const seed = useMemo(() => buildTickets(fleetCouriers), [fleetCouriers]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadedFromApi, setLoadedFromApi] = useState(false);
  const list = useMemo(() => (loadedFromApi ? tickets : (tickets.length ? tickets : seed)), [loadedFromApi, tickets, seed]);

  // Sync cu serverul: fetch la mount + după create
  const refresh = async () => {
    try {
      const res = await fetch("/api/tickets");
      const j = await res.json();
      if (res.ok && Array.isArray(j.tickets)) {
        // Convert DB row → Ticket shape
        const mapped: Ticket[] = j.tickets.map((r: {
          id: string; requesterName: string; category: TicketCategory; priority: TicketPriority;
          platform: string; subject: string; body: string; status: TicketStatus;
          assignee: string | null; createdAtIso: string; updatedAtIso: string;
        }, idx: number) => ({
          id: r.id,
          number: 6000 + idx,
          subject: r.subject,
          description: r.body,
          requesterName: r.requesterName, requesterRole: "Curier", requesterPhone: "",
          category: r.category, platform: r.platform as Ticket["platform"], priority: r.priority, status: r.status,
          createdIso: r.createdAtIso, updatedIso: r.updatedAtIso,
          assignee: r.assignee ?? "", filesCount: 0,
          messages: [{ id: `m_${r.id}`, author: r.requesterName, isOperator: false, internal: false, text: r.body || r.subject, at: r.createdAtIso }],
          tenantId: activeFleetId,
        }));
        setTickets(mapped);
        setLoadedFromApi(true);
      }
    } catch {}
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const [q, setQ] = useState(""); const [tab, setTab] = useState<TicketStatus | "all">("all"); const [cat, setCat] = useState<TicketCategory | "all">("all"); const [prio, setPrio] = useState<TicketPriority | "all">("all"); const [platform, setPlatform] = useState("all");
  const [page, setPage] = useState(1); const [selId, setSelId] = useState<string | null>(null); const [newOpen, setNewOpen] = useState(false);

  const kpi = useMemo(() => computeTicketKpi(list), [list]);
  const counts = useMemo(() => ({ all: list.length, open: list.filter((t) => t.status === "open").length, in_progress: list.filter((t) => t.status === "in_progress").length, resolved: list.filter((t) => t.status === "resolved").length, closed: list.filter((t) => t.status === "closed").length }), [list]);

  const filtered = useMemo(() => list.filter((t) => {
    if (tab !== "all" && t.status !== tab) return false;
    const term = q.trim().toLowerCase();
    if (term && !`${t.subject} ${t.requesterName} #${t.number}`.toLowerCase().includes(term)) return false;
    if (cat !== "all" && t.category !== cat) return false;
    if (prio !== "all" && t.priority !== prio) return false;
    if (platform !== "all" && t.platform !== platform) return false;
    return true;
  }), [list, tab, q, cat, prio, platform]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);
  const selected = list.find((t) => t.id === selId) ?? null;

  const stats = useMemo(() => {
    const cats = new Map<TicketCategory, number>();
    for (const t of list) cats.set(t.category, (cats.get(t.category) ?? 0) + 1);
    const catDonut = Array.from(cats.entries()).map(([k, v]) => ({ key: k, label: CATEGORY_LABEL[k], color: CATEGORY_COLOR[k], value: v }));
    const statusBars = (["resolved", "in_progress", "open", "closed"] as TicketStatus[]).map((s) => ({ label: TICKET_STATUS_LABEL[s], value: list.filter((t) => t.status === s).length, color: s === "resolved" ? "#22c55e" : s === "in_progress" ? "#f59e0b" : s === "open" ? "#38bdf8" : "#64748b" }));
    const plat = new Map<string, number>(); for (const t of list) plat.set(t.platform, (plat.get(t.platform) ?? 0) + 1);
    const platDonut = Array.from(plat.entries()).map(([k, v]) => ({ key: k, label: k === "bolt" ? "Bolt" : k === "wolt" ? "Wolt" : "Glovo", color: k === "bolt" ? "#34d399" : k === "wolt" ? "#38bdf8" : "#facc15", value: v }));
    const trend = Array.from({ length: 14 }, (_, i) => ({ d: `${i + 1}`, tickets: 2 + ((i * 3) % 6) }));
    return { catDonut, statusBars, platDonut, trend };
  }, [list]);
  const maxStatus = Math.max(1, ...stats.statusBars.map((b) => b.value));

  const mutate = (id: string, fn: (t: Ticket) => Ticket) => setTickets(() => list.map((t) => (t.id === id ? fn(t) : t)));

  const createTicket = async (p: NewTicketPayload) => {
    const requester = p.requesterName.trim() || user.name;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requesterName: requester,
          category: p.category,
          priority: p.priority,
          platform: p.platform,
          subject: p.subject.trim(),
          body: p.description.trim() || `${requester} a raportat: „${p.subject.trim()}".`,
        }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error("Eroare tichet", j.error ?? "Nu s-a putut crea."); return; }
      await refresh();
      setTab("all"); setPage(1); setNewOpen(false);
      toast.success("Tichet creat", `${p.subject.trim()}`);
    } catch {
      toast.error("Server indisponibil", "Încearcă din nou.");
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[26px] font-bold tracking-tight text-fg">Probleme / Support</h1><p className="mt-1 max-w-2xl text-[13px] text-fg-muted">Gestionează toate cererile de suport și problemele raportate de curieri, subcontractori și echipă. Urmărește statusul și timpul de rezolvare.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => toast.success("Export", `${filtered.length} tichete.`)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"><Download size={14} className="text-fg-dim" /> Exportă</button><button type="button" onClick={() => setNewOpen(true)} disabled={!canManage} className={cn("inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2 text-[13px] font-semibold text-white", !canManage && "opacity-50")}><Plus size={15} /> Tichet nou</button></div>
      </header>

      <QuickContactCard onSubmit={(p) => createTicket(p)} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={TicketIcon} tint="bg-info/12" color="text-[color:var(--color-info)]" label="Total tichete" value={kpi.total} sub="în ultimele 30 zile" />
        <Kpi icon={CheckCircle2} tint="bg-success/12" color="text-[color:var(--color-success)]" label="Rezolvate" value={kpi.resolved} sub={`timp mediu ${kpi.avgHours}h`} pct={kpi.resolvedPct} />
        <Kpi icon={Clock} tint="bg-warn/12" color="text-[color:var(--color-warn)]" label="În lucru" value={kpi.inProgress} sub="în așteptare" pct={kpi.inProgressPct} />
        <Kpi icon={AlertTriangle} tint="bg-danger/12" color="text-[color:var(--color-danger)]" label="Urgente" value={kpi.urgent} sub="necesită atenție" pct={kpi.urgentPct} />
        <Kpi icon={LifeBuoy} tint="bg-accent/15" color="text-[color:var(--color-accent-3)]" label="Timp mediu rezolvare" value={kpi.avgHours} sub="ore" />
      </div>

      <div className="overflow-x-auto border-b border-line"><div className="flex min-w-max gap-1">{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => { setTab(k); setPage(1); }} className={cn("relative px-3 py-2.5 text-[13px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{l}<span className="ml-1.5 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10.5px] tabular-nums text-fg-muted">{counts[k]}</span>{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}</button>)}</div></div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Caută în tichete..." className="w-full rounded-lg border border-line bg-card-hover py-2 pl-9 pr-3 text-[12.5px] text-fg outline-none focus:border-accent/60" /></div>
        <Select value={cat} options={[{ value: "all", label: "Toate categoriile" }, ...(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))]} onChange={(v) => { setCat(v); setPage(1); }} className="w-[160px]" ariaLabel="Categorie" />
        <Select value={prio} options={[{ value: "all", label: "Toate prioritățile" }, ...(["normal", "high", "urgent"] as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))]} onChange={(v) => { setPrio(v); setPage(1); }} className="w-[160px]" ariaLabel="Prioritate" />
        <Select value={platform} options={[{ value: "all", label: "Toate platformele" }, { value: "bolt", label: "Bolt" }, { value: "wolt", label: "Wolt" }, { value: "glovo", label: "Glovo" }]} onChange={(v) => { setPlatform(v); setPage(1); }} className="w-[150px]" ariaLabel="Platformă" />
      </div>

      <div className={cn(selected && "lg:pr-[380px]")}>
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-[12px]">
          <thead><tr className="border-b border-line text-left text-[10.5px] uppercase tracking-wide text-fg-dim"><th className="px-4 py-2.5">#</th><th className="py-2.5 pr-2 font-medium">Subiect</th><th className="py-2.5 pr-2 font-medium">Solicitant</th><th className="py-2.5 pr-2 font-medium">Categorie</th><th className="py-2.5 pr-2 font-medium">Platf.</th><th className="py-2.5 pr-2 font-medium">Prioritate</th><th className="py-2.5 pr-2 font-medium">Status</th><th className="py-2.5 pr-2 font-medium">Creat</th><th className="px-4 py-2.5 text-right font-medium">Acțiuni</th></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id} className={cn("border-b border-line/50 hover:bg-white/[0.02]", selId === t.id && "bg-accent/[0.06]")}>
              <td className="px-4 py-2.5 text-fg-dim tabular-nums">#{t.number}</td>
              <td className="py-2.5 pr-2"><button type="button" onClick={() => setSelId(t.id)} className="max-w-[200px] truncate text-left font-medium text-fg hover:underline">{t.subject}</button></td>
              <td className="py-2.5 pr-2"><span className="flex items-center gap-2"><CourierAvatar name={t.requesterName} size={22} /><span><span className="block text-fg">{t.requesterName}</span><span className="block text-[10.5px] text-fg-dim">{t.requesterRole}</span></span></span></td>
              <td className="py-2.5 pr-2"><span className="inline-flex items-center gap-1.5 text-fg-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[t.category] }} />{CATEGORY_LABEL[t.category]}</span></td>
              <td className="py-2.5 pr-2 uppercase text-fg-muted">{t.platform}</td>
              <td className="py-2.5 pr-2"><span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLE[t.priority])}>{PRIORITY_LABEL[t.priority]}</span></td>
              <td className="py-2.5 pr-2"><span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium", TICKET_STATUS_STYLE[t.status])}>{TICKET_STATUS_LABEL[t.status]}</span></td>
              <td className="py-2.5 pr-2 text-fg-muted">{ago(t.createdIso)}</td>
              <td className="px-4 py-2.5 text-right"><Popover align="right" className="w-[170px] p-1" trigger={({ toggle }) => <button type="button" onClick={toggle} aria-label="Acțiuni" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><MoreHorizontal size={16} /></button>}>{(close) => (<div className="flex flex-col"><button type="button" onClick={() => { setSelId(t.id); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Deschide tichet</button><button type="button" onClick={() => { mutate(t.id, (x) => ({ ...x, status: "resolved" })); toast.success("Rezolvat", `#${t.number}`); close(); }} className="rounded-lg px-2.5 py-1.5 text-left text-[12.5px] text-fg hover:bg-white/[0.05]">Marchează rezolvat</button></div>)}</Popover></td>
            </tr>
          ))}</tbody>
        </table>{rows.length === 0 && <EmptyState title="Niciun tichet pentru filtrele selectate." />}</div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[12px] text-fg-muted"><span>Afișează {rows.length} din {filtered.length} tichete</span><div className="flex gap-1">{Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 5).map((n) => <button key={n} type="button" onClick={() => setPage(n)} className={cn("min-w-[30px] rounded-lg border px-2 py-1 tabular-nums", n === safePage ? "border-accent bg-accent/15 text-fg" : "border-line hover:text-fg")}>{n}</button>)}</div></div></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardTitle>Tichete pe categorii</CardTitle></CardHeader><CardBody><Donut data={stats.catDonut} center={list.length} label="tichete" /></CardBody></Card>
        <Card><CardHeader><CardTitle>Tichete pe status</CardTitle></CardHeader><CardBody><div className="flex flex-col gap-3">{stats.statusBars.map((b) => <div key={b.label}><div className="mb-1 flex justify-between text-[12px]"><span className="text-fg-muted">{b.label}</span><span className="tabular-nums text-fg">{b.value}</span></div><ProgressBar pct={(b.value / maxStatus) * 100} color={b.color} /></div>)}</div></CardBody></Card>
        <Card><CardHeader><CardTitle>Tichete pe platformă</CardTitle></CardHeader><CardBody><Donut data={stats.platDonut} center={list.length} label="tichete" /></CardBody></Card>
        <Card><CardHeader><CardTitle>Tendință (14 zile)</CardTitle></CardHeader><CardBody><div className="h-[150px]"><ResponsiveContainer><LineChart data={stats.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}><XAxis dataKey="d" tickLine={false} axisLine={false} minTickGap={20} /><Line type="monotone" dataKey="tickets" stroke="#8b5cf6" strokeWidth={2.2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></CardBody></Card>
      </div>

      {selected && <TicketDrawer ticket={selected} onClose={() => setSelId(null)} onReply={(text, internal) => mutate(selected.id, (t) => ({ ...t, messages: [...t.messages, { id: `m${Date.now()}`, author: "Operator", isOperator: true, internal, text, at: new Date().toISOString() }] }))} onResolve={() => { mutate(selected.id, (t) => ({ ...t, status: "resolved" })); toast.success("Rezolvat", `#${selected.number}`); }} onCall={() => toast.info("Apel", selected.requesterPhone)} />}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} title="Tichet nou" size="md"><NewTicket onClose={() => setNewOpen(false)} onCreate={createTicket} /></Dialog>
    </div>
  );
}

function Kpi({ icon: Icon, tint, color, label, value, sub, pct }: { icon: typeof Clock; tint: string; color: string; label: string; value: number; sub: string; pct?: number }) {
  return <Card className="p-4"><div className="flex items-start justify-between"><div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tint)}><Icon size={17} className={color} /></div>{pct !== undefined && <span className="text-[11px] font-semibold tabular-nums text-fg-muted">{pct}%</span>}</div><div className="mt-3 text-[12px] font-medium text-fg-muted">{label}</div><div className="mt-0.5 text-[21px] font-bold tabular-nums text-fg">{formatInt(value)}</div><div className="mt-0.5 text-[11.5px] text-fg-dim">{sub}</div></Card>;
}
function Donut({ data, center, label }: { data: Array<{ key: string; label: string; color: string; value: number }>; center: number; label: string }) {
  return <div className="flex items-center gap-3"><div className="relative h-[130px] w-[130px]"><ResponsiveContainer><PieChart><Pie data={data} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={false}>{data.map((d) => <Cell key={d.key} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[16px] font-bold text-fg">{center}</span><span className="text-[9px] text-fg-dim">{label}</span></div></div><div className="flex flex-1 flex-col gap-1">{data.slice(0, 5).map((d) => <div key={d.key} className="flex items-center justify-between text-[11.5px]"><span className="flex items-center gap-1.5 text-fg-muted"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />{d.label}</span><span className="tabular-nums text-fg">{d.value}</span></div>)}</div></div>;
}

const T_TABS = [["conv", "Conversație"], ["activity", "Activități"], ["files", "Fișiere"], ["notes", "Note"]] as const;
function TicketDrawer({ ticket, onClose, onReply, onResolve, onCall }: { ticket: Ticket; onClose: () => void; onReply: (text: string, internal: boolean) => void; onResolve: () => void; onCall: () => void }) {
  const [tab, setTab] = useState<(typeof T_TABS)[number][0]>("conv");
  const [msg, setMsg] = useState(""); const [internal, setInternal] = useState(false);
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col border-l border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-[13px] font-semibold text-fg">Detalii tichet</span><button type="button" onClick={onClose} aria-label="Închide" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"><X size={16} /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 px-4 pt-3"><span className="flex items-center gap-2"><span className="rounded-md border border-line bg-card-hover px-2 py-0.5 text-[11px] font-bold text-fg">#{ticket.number}</span><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", TICKET_STATUS_STYLE[ticket.status])}>{TICKET_STATUS_LABEL[ticket.status]}</span></span><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-medium", PRIORITY_STYLE[ticket.priority])}>{PRIORITY_LABEL[ticket.priority]}</span></div>
          <div className="px-4 pt-2"><div className="text-[15px] font-bold text-fg">{ticket.subject}</div><p className="mt-1 text-[12px] text-fg-muted">{ticket.description}</p></div>
          <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-line bg-card-2 px-3 py-2"><span className="flex items-center gap-2"><CourierAvatar name={ticket.requesterName} size={26} /><span><span className="block text-[12.5px] font-medium text-fg">{ticket.requesterName}</span><span className="block text-[10.5px] text-fg-dim">{ticket.requesterPhone}</span></span></span><button type="button" onClick={onCall} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><Phone size={12} /> Sună</button></div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-4 py-3 text-[11.5px]"><M l="Platformă" v={ticket.platform.toUpperCase()} /><M l="Categorie" v={CATEGORY_LABEL[ticket.category]} /><M l="Creat" v={ago(ticket.createdIso)} /><M l="Actualizat" v={ago(ticket.updatedIso)} /><M l="Asignat" v={ticket.assignee} /><M l="Prioritate" v={PRIORITY_LABEL[ticket.priority]} /></div>
          <div className="grid grid-cols-2 gap-2 px-4"><button type="button" onClick={() => setTab("conv")} className="rounded-lg border border-line bg-card-hover py-2 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]">Răspunde</button><button type="button" onClick={onResolve} className="rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 py-2 text-[12.5px] font-semibold text-white">Marchează rezolvat</button></div>
          <div className="mt-3 flex items-center gap-1 border-b border-line px-3">{T_TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={cn("relative px-2.5 py-2 text-[12px] font-medium", tab === k ? "text-fg" : "text-fg-muted hover:text-fg")}>{l}{k === "files" ? ` (${ticket.filesCount})` : ""}{tab === k && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />}</button>)}</div>
          <div className="p-3">
            {tab === "conv" && <div className="flex flex-col gap-3">{ticket.messages.map((m) => <MessageBubble key={m.id} m={m} />)}
              <div className="rounded-lg border border-line bg-card-2 p-2">
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} placeholder="Scrie un răspuns..." className="w-full resize-none bg-transparent text-[12.5px] text-fg outline-none" />
                <div className="mt-1 flex items-center justify-between"><label className="flex items-center gap-1.5 text-[11px] text-fg-muted"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-3 w-3 accent-violet-500" /> Notă internă</label><button type="button" disabled={!msg.trim()} onClick={() => { onReply(msg, internal); setMsg(""); }} className={cn("inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1 text-[12px] font-semibold text-white", !msg.trim() && "opacity-50")}><Send size={12} /> Trimite</button></div>
              </div></div>}
            {tab === "activity" && <ol className="relative ml-1.5 flex flex-col gap-3 border-l border-line pl-4 text-[12px]"><li className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-sky-400" /><div className="font-medium text-fg">Tichet creat</div><div className="text-fg-dim">{ago(ticket.createdIso)}</div></li><li className="relative"><span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-400" /><div className="font-medium text-fg">Asignat către {ticket.assignee}</div></li></ol>}
            {tab === "files" && <div className="text-[12.5px] text-fg-muted">{ticket.filesCount} fișiere atașate acestui tichet.</div>}
            {tab === "notes" && <textarea rows={4} placeholder="Notă internă..." className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" />}
          </div>
        </div>
      </aside>
    </>
  );
}
function MessageBubble({ m }: { m: TicketMessage }) {
  return <div className={cn("flex gap-2", m.isOperator && "flex-row-reverse")}>
    <CourierAvatar name={m.author} size={26} />
    <div className={cn("max-w-[76%] rounded-xl border px-3 py-2", m.isOperator ? "border-blue-500/25 bg-blue-500/10" : "border-line bg-card-2")}>
      <div className="mb-0.5 flex items-center gap-2"><span className="text-[11px] font-semibold text-fg">{m.author}</span>{m.internal && <span className="rounded bg-amber-500/20 px-1 text-[9px] font-medium text-amber-300">Intern</span>}<span className="text-[9.5px] text-fg-dim">{ago(m.at)}</span></div>
      <div className="text-[12px] text-fg">{m.text}</div>
    </div>
  </div>;
}
function M({ l, v }: { l: string; v: string }) { return <div><span className="text-fg-dim">{l}: </span><span className="font-medium text-fg">{v}</span></div>; }

function NewTicket({ onClose, onCreate }: { onClose: () => void; onCreate: (p: NewTicketPayload) => void }) {
  const [subj, setSubj] = useState(""); const [desc, setDesc] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [category, setCategory] = useState<TicketCategory>("platform");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [platform, setPlatform] = useState("bolt");
  const submit = () => { if (!subj.trim()) return; onCreate({ subject: subj, description: desc, requesterName, category, priority, platform }); };
  return <><div className="flex flex-col gap-3">
    <label className="block"><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Subiect</span><input value={subj} onChange={(e) => setSubj(e.target.value)} className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" /></label>
    <label className="block"><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Solicitant</span><input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Nume curier / echipă (implicit: tu)" className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" /></label>
    <div className="grid grid-cols-3 gap-2">
      <div><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Categorie</span><Select value={category} options={(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} onChange={(v) => setCategory(v as TicketCategory)} ariaLabel="Categorie" /></div>
      <div><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Prioritate</span><Select value={priority} options={(["normal", "high", "urgent"] as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} onChange={(v) => setPriority(v as TicketPriority)} ariaLabel="Prioritate" /></div>
      <div><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Platformă</span><Select value={platform} options={[{ value: "bolt", label: "Bolt" }, { value: "wolt", label: "Wolt" }, { value: "glovo", label: "Glovo" }]} onChange={(v) => setPlatform(v)} ariaLabel="Platformă" /></div>
    </div>
    <label className="block"><span className="mb-1.5 block text-[11.5px] font-medium text-fg-muted">Descriere</span><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[12.5px] text-fg outline-none focus:border-accent/60" /></label>
  </div><DialogFooter><button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-hover px-4 py-2 text-[12.5px] font-medium text-fg">Anulează</button><button type="button" disabled={!subj.trim()} onClick={submit} className={cn("rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white", !subj.trim() && "opacity-50")}>Creează tichet</button></DialogFooter></>;
}
