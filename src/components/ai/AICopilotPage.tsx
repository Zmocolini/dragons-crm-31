"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Check, Download, FileText, ListChecks, Loader2, Mic, MicOff, Paperclip, Send, Volume2, VolumeX, Wrench, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useOwnerScope } from "@/lib/owner-scope/context";
import { useCopilotExecutor, ToolError } from "@/lib/ai/executor";
import { CONFIRM_TOOLS, TOOL_LABEL } from "@/lib/ai/tools";
import { cn } from "@/lib/utils/cn";

type Msg = { id: string; role: "ai" | "user"; text: string; actions?: boolean; steps?: string[] };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type ApiMsg = { role: "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
type Confirm = { text: string; resolve: (ok: boolean) => void };

// Web Speech API — nativ în Chrome/Edge/Safari; fără tipuri în lib.dom pentru recognition.
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};
const MAX_STEPS = 8;
const YES = /^(da|confirm|ok|sigur|fă|fa|execută|executa)\b/i;
const NO = /^(nu|anulează|anuleaza|stop|renunț|renunt)\b/i;

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const clean = text.replace(/\*\*|[#`_>•]/g, "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "ro-RO";
  const ro = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ro"));
  if (ro) u.voice = ro;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

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
  const { user } = useSession();
  const { scope } = useOwnerScope();
  const exec = useCopilotExecutor();
  const endRef = useRef<HTMLDivElement>(null);

  const greeting = `Salut, ${user.name.split(" ")[0]}! 👋\n\nSunt AI Copilot — agent, nu doar chat. Îmi poți scrie sau vorbi (🎤) și fac direct în CRM:\n• Înregistrez și modific curieri\n• Văd ce are de activat fiecare echipă și activez / confirm curierii (cu click-ul tău)\n• Citesc plăți, rapoarte, documente, vehicule\n• Emit facturi (și din raport, cu TVA după regim)\n• Schimb statusuri de plăți și facturi (cu confirmarea ta)\n• Deschid pagini, creez tichete, explic orice modul\n\nSpune-mi ce ai nevoie.`;
  const [messages, setMessages] = useState<Msg[]>([{ id: "g", role: "ai", text: "" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autos, setAutos] = useState<boolean[]>([true, true, false, false]);
  const [asked, setAsked] = useState(0);
  const [tasks, setTasks] = useState(0);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [listening, setListening] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);

  const apiRef = useRef<ApiMsg[]>([]);           // transcriptul complet trimis la LLM (cu tool calls)
  const execRef = useRef(exec);                  // executorul cu starea cea mai nouă (re-randat între pași)
  const confirmRef = useRef<Confirm | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  // După fiecare unealtă, bucla așteaptă o randare reală: următoarea unealtă trebuie să vadă ce a scris precedenta
  // (ex: create_courier → find_couriers). `exec` e recreat la fiecare randare, deci efectul rulează după fiecare commit.
  const renderWaiters = useRef<Array<() => void>>([]);
  const [, nudge] = useState(0);
  useEffect(() => {
    execRef.current = exec;
    const waiting = renderWaiters.current; renderWaiters.current = [];
    waiting.forEach((resolve) => resolve());
  }, [exec]);
  const afterRender = () => new Promise<void>((resolve) => { renderWaiters.current.push(resolve); nudge((x) => x + 1); });
  useEffect(() => { confirmRef.current = confirm; }, [confirm]);

  const scrollEnd = () => setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  const askConfirm = (text: string) => new Promise<boolean>((resolve) => { setConfirm({ text, resolve }); scrollEnd(); });
  const answerConfirm = (ok: boolean) => { confirmRef.current?.resolve(ok); setConfirm(null); };

  const describe = (name: string, a: Record<string, unknown>) => {
    const nameOf = (id: unknown) => execRef.current.fleetCouriers.find((c) => c.id === id)?.fullName ?? String(id);
    const courier = typeof a.id === "string" ? nameOf(a.id) : undefined;
    // Activări în bloc: omul confirmă pe NUME, nu pe id-uri.
    const many = Array.isArray(a.ids) ? `${a.ids.length} curieri: ${a.ids.map(nameOf).join(", ")}` : undefined;
    const rest = Object.entries(a).filter(([k]) => k !== "id" && k !== "ids").map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(", ");
    return `${TOOL_LABEL[name] ?? name}${courier ? ` — ${courier}` : many ? ` — ${many}` : ""}${rest ? ` (${rest})` : ""}`;
  };

  const send = async (text: string, spoken = false) => {
    const t = text.trim(); if (!t || loading) return;
    const aiId = `a${Date.now()}`;
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: "user", text: t }, { id: aiId, role: "ai", text: "", steps: [] }]);
    setInput(""); setLoading(true); setAsked((n) => n + 1); scrollEnd();
    const patchAi = (fn: (m: Msg) => Msg) => setMessages((ms) => ms.map((m) => (m.id === aiId ? fn(m) : m)));
    apiRef.current.push({ role: "user", content: t });

    let reply = "";
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ impersonatedEmail: scope?.email ?? null, messages: apiRef.current }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { reply = `⚠️ ${j.error ?? `Eroare ${res.status}`}`; break; }
        const msg = j.message as ApiMsg;
        apiRef.current.push(msg);
        const calls = msg.tool_calls ?? [];
        if (!calls.length) { reply = msg.content?.trim() || "Gata."; break; }

        for (const call of calls) {
          const name = call.function.name;
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(call.function.arguments || "{}"); } catch { /* argumente invalide → {} */ }
          let result: unknown;
          if (CONFIRM_TOOLS.has(name) && !(await askConfirm(describe(name, args)))) {
            result = { refused: true, note: "Utilizatorul a refuzat acțiunea." };
            patchAi((m) => ({ ...m, steps: [...(m.steps ?? []), `✕ ${TOOL_LABEL[name] ?? name} (refuzat)`] }));
          } else {
            try {
              result = await execRef.current.run(name, args);
              patchAi((m) => ({ ...m, steps: [...(m.steps ?? []), `✓ ${TOOL_LABEL[name] ?? name}`] }));
              if (!name.startsWith("list_") && !["overview", "find_couriers", "report_summary", "navigate"].includes(name)) setTasks((n) => n + 1);
            } catch (e) {
              result = { error: e instanceof ToolError ? e.message : String((e as Error).message ?? e) };
              patchAi((m) => ({ ...m, steps: [...(m.steps ?? []), `⚠ ${TOOL_LABEL[name] ?? name}`] }));
            }
          }
          apiRef.current.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) });
          await afterRender();
        }
        if (step === MAX_STEPS - 1) reply = "Am atins limita de pași pentru o cerere. Spune-mi dacă continui.";
      }
    } catch (e) {
      reply = `⚠️ Server AI indisponibil: ${String((e as Error).message ?? e)}`;
    } finally {
      patchAi((m) => ({ ...m, text: reply }));
      setLoading(false);
      scrollEnd();
      if ((spoken || speakOn) && reply) speak(reply);
    }
  };

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { toast.info("Microfon", "Browserul nu are dictare vocală. Folosește Chrome, Edge sau Safari."); return; }
    const rec = new SR();
    rec.lang = "ro-RO"; rec.interimResults = true; rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") toast.error("Microfon", e.error === "not-allowed" ? "Permite accesul la microfon în browser." : e.error); };
    rec.onend = () => {
      setListening(false);
      const said = finalText.trim();
      if (!said) return;
      if (confirmRef.current) {                     // „da" / „nu" cu vocea pe cardul de confirmare
        if (YES.test(said)) { setInput(""); answerConfirm(true); return; }
        if (NO.test(said)) { setInput(""); answerConfirm(false); return; }
      }
      send(said, true);
    };
    recRef.current = rec;
    window.speechSynthesis?.cancel();
    rec.start(); setListening(true);
  };

  return (
    <div className="flex min-h-full flex-col gap-4 overflow-x-hidden p-4 lg:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-[26px] font-bold tracking-tight text-fg">AI Copilot</h1><span className="rounded-md bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.6)]">NOU</span></div>
          <p className="mt-1 max-w-2xl text-[13px] text-fg-muted">Asistentul tău inteligent pentru o flotă mai eficientă. Îți oferă răspunsuri, analize și automatizări în timp real.</p>
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
                  {m.steps && m.steps.length > 0 && <div className="mb-1.5 flex flex-wrap gap-1">{m.steps.map((st, i) => <span key={i} className="inline-flex items-center gap-1 rounded-md border border-line bg-card-hover px-1.5 py-0.5 text-[10.5px] text-fg-muted"><Wrench size={10} />{st}</span>)}</div>}
                  {!m.text && loading && <span className="text-fg-muted"><Loader2 size={14} className="inline animate-spin" /> Lucrez...</span>}
                  {(m.id === "g" ? greeting : m.text).split("\n").map((line, i) => <div key={i} className={line.startsWith("•") ? "text-fg-muted" : ""} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<b class="text-fg">$1</b>') }} />)}
                  {m.actions && <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => { toast.info("Listă", "Deschid lista completă de curieri."); router.push("/curieri"); }} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><ListChecks size={12} /> Afișează lista</button>
                    <button type="button" onClick={() => toast.success("Export", "Fișier .xlsx generat.")} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><Download size={12} /> Exportă în Excel</button>
                    <button type="button" onClick={() => { setTasks((n) => n + 1); toast.success("Task creat", "Adăugat în lista de sarcini."); }} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><FileText size={12} /> Creează task</button>
                  </div>}
                </div>
              </div>
            ))}
            {confirm && <div className="ml-10 max-w-[78%] rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-[13px] text-fg">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Confirmă acțiunea</div>
              <div className="mt-1">{confirm.text}</div>
              <div className="mt-2 flex gap-1.5">
                <button type="button" onClick={() => answerConfirm(true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:brightness-110"><Check size={12} /> Confirm</button>
                <button type="button" onClick={() => answerConfirm(false)} className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-hover px-2.5 py-1 text-[11.5px] font-medium text-fg hover:bg-white/[0.06]"><X size={12} /> Refuz</button>
                <span className="self-center text-[10.5px] text-fg-dim">sau spune „da” / „nu”</span>
              </div>
            </div>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2 rounded-xl border border-line bg-card-hover p-2">
              <button type="button" onClick={() => toast.info("Atașament", "Selectează un fișier de analizat.")} aria-label="Atașament" className="text-fg-dim hover:text-fg"><Paperclip size={16} /></button>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1} placeholder={listening ? "Te ascult..." : "Scrie sau vorbește: „înregistrează curierul Ion Pop din Iași pe Bolt”"} className="max-h-24 flex-1 resize-none bg-transparent text-[13px] text-fg outline-none" />
              <button type="button" onClick={() => { setSpeakOn((v) => !v); if (speakOn) window.speechSynthesis?.cancel(); }} aria-label={speakOn ? "Oprește citirea cu voce" : "Citește răspunsurile cu voce"} aria-pressed={speakOn} className={cn("hover:text-fg", speakOn ? "text-violet-300" : "text-fg-dim")}>{speakOn ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
              <button type="button" onClick={toggleMic} aria-label={listening ? "Oprește dictarea" : "Vorbește"} aria-pressed={listening} className={cn("hover:text-fg", listening ? "animate-pulse text-rose-400" : "text-fg-dim")}>{listening ? <MicOff size={16} /> : <Mic size={16} />}</button>
              <button type="button" onClick={() => send(input)} disabled={!input.trim() || loading} aria-label="Trimite" className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-white", !input.trim() && "opacity-50")}><Send size={15} /></button>
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
