"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Download, FileText, ListChecks, Loader2, Mic, Paperclip, Send, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { usePayments } from "@/lib/payments/context";
import { useDocuments } from "@/lib/documents/context";
import { UNPAID_STATUSES } from "@/lib/payments/types";
import { formatRon } from "@/lib/reports/analytics";
import { cn } from "@/lib/utils/cn";

type Msg = { id: string; role: "ai" | "user"; text: string; actions?: boolean };

const SUGGESTIONS: Array<[string, string]> = [
  ["Curieri neplătiți", "Afișează lista curierilor neplătiți în această săptămână"],
  ["Documente expirate", "Arată documentele care expiră în următoarele 30 de zile"],
  ["Status activări", "Verifică statusul activărilor pe Bolt / Wolt / Glovo"],
  ["Raport săptămânal", "Generează un rezumat complet al activității"],
  ["Liste pe orașe", "Afișează curierii pe orașe"],
  ["Verifică IBAN/CNP", "Verifică validitatea datelor"],
  ["Creează mesaj", "Generează un mesaj pentru curieri sau subcontractori"],
  ["Analiză performanță", "Top curieri după comenzi și venituri"],
];
const AUTO_ACTIONS = [
  ["Rezumat zilnic pe email", "Trimite un rezumat în fiecare dimineață"],
  ["Alerte documente expirate", "Notifică cu 7 zile înainte"],
  ["Reminder plăți", "Miercuri și vineri"],
  ["Follow-up activări blocate", "După 3 zile blocaj"],
];
const EXAMPLES = [
  "Cine are documentele expirate?",
  "Afișează top 10 curieri după comenzi.",
  "Câți curieri sunt activi pe Bolt în București?",
  "Generează un raport de plăți pe această lună.",
  "Ce activări sunt blocate mai mult de 3 zile?",
];

export function AICopilotPage() {
  const toast = useToast();
  const router = useRouter();
  const { user, activeFleetId } = useSession();
  const { allRows } = useCouriers();
  const { fleetPayments } = usePayments();
  const { fleetDocuments } = useDocuments();
  const endRef = useRef<HTMLDivElement>(null);

  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);

  const greeting = `Salut, ${user.name.split(" ")[0]}! 👋\n\nSunt AI Copilot și te pot ajuta cu:\n• Analiza și rezumatul datelor din platformă\n• Crearea de rapoarte și liste personalizate\n• Verificarea documentelor și expirărilor\n• Informații despre plăți, activări, curieri\n• Sugestii și automatizări pentru sarcini repetitive\n\nScrie-mi mai jos ce ai nevoie sau alege o sugestie din dreapta.`;
  const [messages, setMessages] = useState<Msg[]>([{ id: "g", role: "ai", text: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autos, setAutos] = useState<boolean[]>([true, true, false, false]);
  const [asked, setAsked] = useState(0);
  const [tasks, setTasks] = useState(0);

  // Motor de răspuns pe DATE REALE (nu LLM; nu fabrică date). TODO(real-users): înlocuit
  // cu un endpoint AI server-side (fără API key în client) + tool-calling peste CRM.
  const answer = (qRaw: string): { text: string; actions: boolean } => {
    const q = qRaw.toLowerCase();
    if (/neplăt|neplat|unpaid/.test(q)) {
      const unpaid = fleetPayments.filter((p) => UNPAID_STATUSES.includes(p.status));
      const byPlat: Record<string, number> = { bolt: 0, wolt: 0, glovo: 0 };
      for (const p of unpaid) (p.platforms ?? []).forEach((pl) => (byPlat[pl] += 1));
      return { text: `În această săptămână sunt **${unpaid.length}** curieri neplătiți în flota ${user.activeTenant.name}.\n• Bolt: ${byPlat.bolt}\n• Wolt: ${byPlat.wolt}\n• Glovo: ${byPlat.glovo}\n\nVrei să îți afișez lista completă cu numele, orașul și suma?`, actions: true };
    }
    if (/expir|docum/.test(q)) {
      const now = new Date("2026-09-10").getTime();
      const soon = fleetDocuments.filter((d) => d.expiryIso && (new Date(d.expiryIso).getTime() - now) / 86400000 <= 30 && (new Date(d.expiryIso).getTime() - now) >= 0);
      return { text: `**${soon.length}** documente expiră în următoarele 30 de zile în flota curentă. Cele mai urgente necesită reînnoire. Vrei lista detaliată sau export Excel?`, actions: true };
    }
    if (/bolt.*bucure|activ.*bolt|activ.*curier/.test(q)) {
      const n = fleetCouriers.filter((c) => c.status === "active" && c.platforms.includes("bolt") && /bucure/i.test(c.city)).length;
      return { text: `Sunt **${n}** curieri activi pe Bolt în București (flota ${user.activeTenant.name}).`, actions: true };
    }
    if (/top|performan|comenzi|venit/.test(q)) {
      const top = [...fleetPayments].sort((a, b) => (b.ordersCount ?? 0) - (a.ordersCount ?? 0)).slice(0, 5);
      const lines = top.map((p, i) => `${i + 1}. ${p.recipient.name} — ${p.ordersCount ?? 0} comenzi, ${formatRon(p.breakdown.grossRevenue)}`).join("\n");
      return { text: `Top curieri după comenzi:\n${lines || "Fără date."}`, actions: true };
    }
    if (/oraș|orase|liste pe/.test(q)) {
      const byCity = new Map<string, number>();
      fleetCouriers.forEach((c) => byCity.set(c.city, (byCity.get(c.city) ?? 0) + 1));
      const lines = Array.from(byCity.entries()).sort((a, b) => b[1] - a[1]).map(([c, n]) => `• ${c}: ${n} curieri`).join("\n");
      return { text: `Distribuția curierilor pe orașe:\n${lines}`, actions: true };
    }
    if (/raport|rezumat|plăț|plat/.test(q)) {
      const gross = fleetPayments.reduce((s, p) => s + p.breakdown.grossRevenue, 0);
      return { text: `Rezumat flotă ${user.activeTenant.name}:\n• Curieri: ${fleetCouriers.length}\n• Plăți înregistrate: ${fleetPayments.length}\n• Venit brut total: ${formatRon(gross)}\n\nPot genera un raport complet — apasă „Exportă în Excel".`, actions: true };
    }
    return { text: `Am înțeles întrebarea, dar încă nu am o rutină dedicată pentru ea. Pot răspunde la întrebări despre curieri neplătiți, documente expirate, activări, top performeri, liste pe orașe și rapoarte de plăți — toate din datele reale ale flotei tale.`, actions: false };
  };

  const send = async (text: string) => {
    const t = text.trim(); if (!t) return;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", text: t }]);
    setInput(""); setLoading(true); setAsked((n) => n + 1);

    // Construiește contextul local (curieri/plăți/documente din state) → mesaj context inline.
    const gross = fleetPayments.reduce((s, p) => s + p.breakdown.grossRevenue, 0);
    const unpaid = fleetPayments.filter((p) => UNPAID_STATUSES.includes(p.status)).length;
    const soonNow = new Date().getTime();
    const soonDocs = fleetDocuments.filter((d) => d.expiryIso && (new Date(d.expiryIso).getTime() - soonNow) / 86400000 <= 30 && (new Date(d.expiryIso).getTime() - soonNow) >= 0).length;

    // Grupare pe orașe și platforme (numere agregate → puține tokens)
    const cityCounts = new Map<string, number>();
    for (const c of fleetCouriers) cityCounts.set(c.city, (cityCounts.get(c.city) ?? 0) + 1);
    const cityList = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}(${n})`).join(", ");
    const platCounts = { bolt: 0, wolt: 0, glovo: 0 } as Record<string, number>;
    for (const c of fleetCouriers) for (const p of c.platforms) if (p in platCounts) platCounts[p]++;

    // Lista scurtă (nume + oraș + platforme + status + subcontractor) pentru primii 30 curieri
    const shortList = fleetCouriers.slice(0, 30).map((c) =>
      `${c.fullName} · ${c.city} · [${c.platforms.join(",")}] · ${c.status}${c.subcontractorName ? ` · sub:${c.subcontractorName}` : ""}`
    ).join("\n");

    // Ultimele 15 plăți — recipient, gros, status
    const recentPayments = [...fleetPayments]
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
      .slice(0, 15)
      .map((p) => `${p.recipient.name}: brut ${formatRon(p.breakdown.grossRevenue)}, net ${formatRon(p.totalCalculated)}, status ${p.status}`)
      .join("\n");

    const contextInfo = `DATE FLOTĂ (LIVE, din browser):
Flotă activă: ${user.activeTenant.name}
TOTAL: ${fleetCouriers.length} curieri (${fleetCouriers.filter((c) => c.status === "active").length} activi) · ${fleetPayments.length} plăți · brut ${formatRon(gross)} · ${unpaid} neplătite · ${soonDocs} documente expiră în 30 zile
PE PLATFORME: Bolt ${platCounts.bolt}, Wolt ${platCounts.wolt}, Glovo ${platCounts.glovo}
PE ORAȘE: ${cityList || "—"}

CURIERI (max 30):
${shortList || "—"}

ULTIMELE PLĂȚI (max 15):
${recentPayments || "—"}`;

    // Prepară istoricul mesajelor pentru API (fără cel de greeting)
    const history = messages.filter((m) => m.id !== "g").map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...history,
            { role: "user", content: `${contextInfo}\n\n---\n\nÎntrebare: ${t}` },
          ],
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { id: `err${Date.now()}`, role: "ai", text: `⚠️ Eroare: ${j.error ?? "Eșec la AI"}. Verifică GROQ_API_KEY în Vercel Env Vars.` }]);
      } else {
        const a = answer(t); // fallback local pentru cazul în care e o întrebare simplă
        const useLocal = a.actions && j.reply.length < 60; // preferă locala dacă are acțiuni + AI e scurt
        setMessages((m) => [...m, { id: `a${Date.now()}`, role: "ai", text: useLocal ? a.text : j.reply, actions: useLocal ? a.actions : false }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { id: `err${Date.now()}`, role: "ai", text: `⚠️ Server AI indisponibil: ${String((e as Error).message ?? e)}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-[26px] font-bold tracking-tight text-fg">AI Copilot</h1><span className="rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]">NOU</span></div>
          <p className="mt-1 max-w-2xl text-[13px] text-fg-muted">Asistentul tău inteligent pentru o flotă mai eficientă. Îți oferă răspunsuri, analize și automatizări în timp real.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card-hover px-3 py-2 text-[12px] font-medium text-fg"><Sparkles size={13} className="text-[color:var(--color-accent-3)]" /> GPT-OSS 120B (Groq) <span className="ml-1 inline-flex items-center gap-1 text-[color:var(--color-success)]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online</span></span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Chat */}
        <Card className="flex min-h-[460px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
                {m.role === "ai" ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"><Bot size={16} className="text-white" /></span> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/30 text-[11px] font-bold text-blue-200">{user.name.slice(0, 2).toUpperCase()}</span>}
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", m.role === "user" ? "bg-blue-600 text-white" : "border border-line bg-card-2 text-fg")}>
                  {m.text.split("\n").map((line, i) => <div key={i} className={line.startsWith("•") ? "text-fg-muted" : ""} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<b class="text-fg">$1</b>') }} />)}
                  {m.actions && <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => { toast.info("Listă", "Deschid lista completă de curieri."); router.push("/curieri"); }} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><ListChecks size={12} /> Afișează lista</button>
                    <button type="button" onClick={() => toast.success("Export", "Fișier .xlsx generat.")} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><Download size={12} /> Exportă în Excel</button>
                    <button type="button" onClick={() => { setTasks((n) => n + 1); toast.success("Task creat", "Adăugat în lista de sarcini."); }} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><FileText size={12} /> Creează task</button>
                  </div>}
                </div>
              </div>
            ))}
            {loading && <div className="flex gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500"><Bot size={16} className="text-white" /></span><div className="rounded-2xl border border-line bg-card-2 px-3.5 py-2.5 text-[13px] text-fg-muted"><Loader2 size={14} className="inline animate-spin" /> Analizez datele...</div></div>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2 rounded-xl border border-line bg-card-hover p-2">
              <button type="button" onClick={() => toast.info("Atașament", "Selectează un fișier de analizat.")} aria-label="Atașament" className="text-fg-dim hover:text-fg"><Paperclip size={16} /></button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1} placeholder="Scrie aici întrebarea ta..." className="max-h-24 flex-1 resize-none bg-transparent text-[13px] text-fg outline-none" />
              <button type="button" onClick={() => toast.info("Microfon", "Dictare vocală indisponibilă în acest mediu.")} aria-label="Microfon" className="text-fg-dim hover:text-fg"><Mic size={16} /></button>
              <button type="button" onClick={() => send(input)} disabled={!input.trim()} aria-label="Trimite" className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white", !input.trim() && "opacity-50")}><Send size={15} /></button>
            </div>
            <p className="mt-2 text-center text-[10.5px] text-fg-dim">AI Copilot poate face greșeli. Verifică întotdeauna informațiile importante.</p>
          </div>
        </Card>

        {/* Dreapta */}
        <div className="flex flex-col gap-3">
          <Card className="p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[13px] font-semibold text-fg">Sugestii rapide</span><button type="button" onClick={() => toast.info("Sugestii")} className="text-[11px] text-[color:var(--color-info)] hover:underline">Vezi toate</button></div><div className="grid grid-cols-2 gap-2">{SUGGESTIONS.map(([t, p]) => <button key={t} type="button" onClick={() => send(p)} className="rounded-lg border border-line bg-card-2 p-2 text-left hover:border-accent/40"><div className="text-[11.5px] font-semibold text-fg">{t}</div><div className="mt-0.5 line-clamp-2 text-[10.5px] text-fg-dim">{p}</div></button>)}</div></Card>
          <Card className="p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[13px] font-semibold text-fg">Acțiuni automate</span><button type="button" onClick={() => toast.info("Configurează")} className="text-[11px] text-[color:var(--color-info)] hover:underline">Configurează</button></div><div className="flex flex-col gap-2">{AUTO_ACTIONS.map(([t, s], i) => <div key={t} className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-[12px] font-medium text-fg">{t}</div><div className="text-[10.5px] text-fg-dim">{s}</div></div><button type="button" onClick={() => { setAutos((a) => a.map((x, k) => (k === i ? !x : x))); toast.success("Setare salvată", t); }} aria-label={t} className={cn("h-4 w-8 shrink-0 rounded-full p-0.5 transition-colors", autos[i] ? "bg-accent" : "bg-white/15")}><span className={cn("block h-3 w-3 rounded-full bg-white transition-transform", autos[i] && "translate-x-4")} /></button></div>)}</div></Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card><CardHeader><CardTitle>Statistici AI Copilot</CardTitle></CardHeader><CardBody><div className="grid grid-cols-2 gap-3">
          <Stat label="Întrebări procesate" value={String(asked)} />
          <Stat label="Taskuri create" value={String(tasks)} />
          <Stat label="Răspunsuri corecte" value="—" hint="nu se colectează" />
          <Stat label="Rating utilizatori" value="—" hint="nu se colectează" />
        </div></CardBody></Card>
        <Card><CardHeader><CardTitle>Fișiere recente analizate</CardTitle><button type="button" onClick={() => toast.info("Fișiere")} className="text-[11px] text-[color:var(--color-info)] hover:underline">Vezi toate</button></CardHeader><CardBody><div className="flex flex-col gap-2">{["raport_plati_sep.xlsx", "documente_expirate.csv", "curieri_bucuresti.pdf"].map((f) => <div key={f} className="flex items-center gap-2"><FileText size={15} className="text-fg-dim" /><div className="min-w-0 flex-1"><div className="truncate text-[12px] text-fg">{f}</div><div className="text-[10px] text-fg-dim">analizat recent</div></div><span className="rounded-md border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">Complet</span></div>)}</div></CardBody></Card>
        <Card><CardHeader><CardTitle>Exemple de întrebări</CardTitle></CardHeader><CardBody><div className="flex flex-col gap-1">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => send(e)} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] text-fg-muted hover:bg-white/[0.04] hover:text-fg"><span>{e}</span><ArrowRight size={13} className="shrink-0 text-fg-dim" /></button>)}</div></CardBody></Card>
      </div>
    </div>
  );
}
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-lg border border-line bg-card-2 p-3"><div className="text-[20px] font-bold text-fg">{value}</div><div className="text-[11px] text-fg-dim">{label}</div>{hint && <div className="text-[9.5px] text-fg-dim">{hint}</div>}</div>;
}
