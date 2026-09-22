"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check, ChevronRight, ExternalLink, FileSignature, FileText, Home,
  Link2, MoreHorizontal, Plus, Send, ShieldCheck, Sparkles, Trash2, Unplug, Upload, X,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import { useContracts, computeContractsKpi } from "@/lib/econtracts/context";
import {
  CONTRACT_KIND_LABEL, CONTRACT_PARTY_LABEL, CONTRACT_TEMPLATES,
  DOCUMENT_TYPE_LABEL,
  SIGNATURE_STATUS_LABEL, SIGNATURE_STATUS_STYLE,
  daysUntil, todayIsoLocal,
  type Contract, type ContractKind, type ContractPartyType, type ContractTemplate,
  type DocumentType, type SignatureStatus,
} from "@/lib/econtracts/types";
import { SIGNING_PROVIDER_LABEL, SIGNING_PROVIDER_URL, type SigningProvider } from "@/lib/econtracts/service";
import { cn } from "@/lib/utils/cn";

type TabKey = "all" | "draft" | "in_progress" | "signed" | "closed";

function formatRon(n: number): string {
  return `${n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`;
}

export function EcontracteePage() {
  const { user, activeFleetId } = useSession();
  const toast = useToast();
  const {
    hydrated, fleetContracts,
    providerConfig, connect, disconnect,
    addContract, deleteContract,
    sendForSigning, markOurSigned, markCounterSigned, markRejected, cancelContract,
  } = useContracts();

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [signFor, setSignFor] = useState<Contract | null>(null);

  const kpi = useMemo(() => computeContractsKpi(fleetContracts), [fleetContracts]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fleetContracts
      .filter((c) => {
        if (tab === "all") return true;
        if (tab === "draft") return c.status === "draft";
        if (tab === "in_progress") return c.status === "sent_for_signing" || c.status === "pending_counterparty";
        if (tab === "signed") return c.status === "signed";
        if (tab === "closed") return c.status === "rejected" || c.status === "expired" || c.status === "cancelled";
        return true;
      })
      .filter((c) => !q ? true : (
        c.number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.partyName.toLowerCase().includes(q) ||
        (c.partyCui ?? "").toLowerCase().includes(q)
      ))
      .sort((a, b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
  }, [fleetContracts, tab, search]);

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 pb-6 md:px-6 md:pt-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-fg">
          <Home size={12} /> Dashboard
        </Link>
        <ChevronRight size={12} className="text-fg-dim" />
        <span className="text-fg">eContracte</span>
      </nav>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-fg md:text-[28px]">eContracte</h1>
          <p className="mt-1 text-[13px] text-fg-muted">
            Gestionează contractele cu curieri, subcontractori, proprietari și furnizori. Trimite-le direct la
            semnare electronică (eContract.ro / DocuSign / Adobe Sign).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:brightness-110"
        >
          <Plus size={15} /> Contract nou
        </button>
      </div>

      {/* Banner integrare eContracte.ro */}
      <ApiStatusNotice />
      <EcontracteRoConnectBanner
        connected={providerConfig.connected}
        accountEmail={providerConfig.accountEmail}
        plan={providerConfig.plan}
        onConnect={() => setShowConnect(true)}
        onDisconnect={() => { disconnect(); toast.info("Deconectat de la eContracte.ro"); }}
      />

      {/* KPI */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <KpiCard label="Total contracte" value={String(kpi.total)} sub={`${kpi.drafts} ciorne`} tone="sky" />
        <KpiCard label="La semnat" value={String(kpi.awaitingSignature)} sub="în lucru cu semnatarii" tone="amber" />
        <KpiCard label="Semnate complet" value={String(kpi.signed)} sub={`Val. lunară: ${formatRon(kpi.monthlyValueSigned)}`} tone="emerald" />
        <KpiCard label="Expiră ≤ 30 zile" value={String(kpi.expiringIn30)} sub="reînnoiește la timp" tone="rose" />
      </div>

      {/* Tabs + search */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-card-hover p-0.5">
            {([
              ["all", "Toate"], ["draft", "Ciorne"], ["in_progress", "La semnat"],
              ["signed", "Semnate"], ["closed", "Închise"],
            ] as [TabKey, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  tab === k ? "bg-violet-600 text-white" : "text-fg-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută nr, titlu, parte, CUI…"
            className="ml-auto min-w-[180px] flex-1 rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none sm:max-w-[260px] sm:flex-none"
          />
        </div>

        <CardBody className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[960px] text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-dim">
                  <th className="px-3 py-2.5">Nr / titlu</th>
                  <th className="px-3 py-2.5">Tip</th>
                  <th className="px-3 py-2.5">Parte</th>
                  <th className="px-2 py-2.5">Perioadă</th>
                  <th className="px-2 py-2.5 text-right">Val. lunară</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-2 py-2.5">Semnare</th>
                  <th className="w-[80px] px-2 py-2.5 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {!hydrated && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-fg-muted">Se încarcă…</td></tr>
                )}
                {hydrated && visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center">
                      <FileSignature size={28} className="mx-auto mb-2 text-fg-dim" />
                      <div className="text-[13px] font-semibold text-fg">Niciun contract încă</div>
                      <div className="text-[11.5px] text-fg-muted">Creează primul cu „Contract nou".</div>
                    </td>
                  </tr>
                )}
                {visible.map((c) => {
                  const endDays = c.endDateIso ? daysUntil(c.endDateIso) : null;
                  return (
                    <tr key={c.id} className="border-b border-line/60 hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono text-[12px] font-semibold text-fg">{c.number}</div>
                        <div className="text-[11.5px] text-fg-muted">{c.title}</div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="text-[11.5px] font-medium text-fg">{DOCUMENT_TYPE_LABEL[c.documentType ?? "contract"]}</div>
                        <div className="text-[10.5px] text-fg-dim">{CONTRACT_KIND_LABEL[c.kind]}</div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="text-[12.5px] font-medium text-fg">{c.partyName}</div>
                        <div className="text-[10.5px] text-fg-dim">{CONTRACT_PARTY_LABEL[c.partyType]}{c.partyCui ? ` · ${c.partyCui}` : ""}</div>
                      </td>
                      <td className="px-2 py-2.5 align-top text-[11.5px] text-fg-muted">
                        <div>{c.startDateIso}</div>
                        {c.endDateIso ? (
                          <div className={cn(
                            "text-[10.5px]",
                            endDays !== null && endDays < 0 ? "text-rose-300"
                              : endDays !== null && endDays <= 30 ? "text-amber-300"
                              : "text-fg-dim",
                          )}>
                            → {c.endDateIso}
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-fg-dim">nedeterminat</div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-right align-top font-mono tabular-nums text-fg">
                        {c.monthlyValueRon != null ? c.monthlyValueRon.toFixed(2) : "—"}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] font-semibold", SIGNATURE_STATUS_STYLE[c.status])}>
                          {SIGNATURE_STATUS_LABEL[c.status]}
                        </span>
                        {c.status === "signed" && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/5 px-1 py-0.5 text-[9px] font-medium text-emerald-200">
                            <ShieldCheck size={9} /> eIDAS
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        {c.signing.envelopeId ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-fg-muted">
                              <ShieldCheck size={11} className="text-emerald-300" />
                              {SIGNING_PROVIDER_LABEL[c.signing.provider]}
                            </span>
                            {c.signing.signUrl && (
                              <a
                                href={c.signing.signUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-sky-300 hover:underline"
                              >
                                Link semnare <ExternalLink size={9} />
                              </a>
                            )}
                            <span className="font-mono text-[9px] text-fg-dim">{c.signing.envelopeId.slice(0, 24)}…</span>
                          </div>
                        ) : (
                          <span className="text-[10.5px] italic text-fg-dim">netrimis</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 align-top">
                        <RowActions
                          canSend={c.status === "draft"}
                          canMarkOurs={c.status === "sent_for_signing"}
                          canMarkCounter={c.status === "pending_counterparty"}
                          canReject={c.status === "sent_for_signing" || c.status === "pending_counterparty"}
                          canCancel={c.status !== "cancelled" && c.status !== "signed"}
                          onSend={() => setSignFor(c)}
                          onMarkOurs={() => { markOurSigned(c.id); toast.success("Ai semnat contractul", c.number); }}
                          onMarkCounter={() => { markCounterSigned(c.id); toast.success("Semnat complet", c.number); }}
                          onReject={() => { markRejected(c.id, "Respins de contrapartidă"); toast.info("Marcat respins", c.number); }}
                          onCancel={() => { cancelContract(c.id); toast.info("Contract anulat", c.number); }}
                          onDelete={() => { deleteContract(c.id); toast.success("Contract șters", c.number); }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Contract nou" size="lg">
        <AddContractForm
          onCancel={() => setShowAdd(false)}
          onCreate={(input) => {
            const created = addContract({ ...input, tenantId: activeFleetId }, user.name);
            toast.success("Contract creat", created.number);
            setShowAdd(false);
          }}
        />
      </Dialog>

      {signFor && (
        <SendForSigningDialog
          contract={signFor}
          providerConnected={providerConfig.connected}
          onCancel={() => setSignFor(null)}
          onSend={async (provider) => {
            const res = await sendForSigning(signFor.id, provider);
            if (res.ok) {
              toast.success("Trimis la semnare", `${SIGNING_PROVIDER_LABEL[provider]}`);
              setSignFor(null);
            } else {
              toast.error("Nu s-a putut trimite", res.error);
            }
          }}
        />
      )}

      <Dialog open={showConnect} onClose={() => setShowConnect(false)} title="Conectare eContracte.ro" size="md">
        <ConnectDialog
          onCancel={() => setShowConnect(false)}
          onConnect={async (accountEmail, apiKey, plan) => {
            const res = await connect({ provider: "econtract_ro", accountEmail, apiKey, plan });
            if (res.ok) {
              toast.success("Conectat", `${accountEmail} · plan ${plan}`);
              setShowConnect(false);
            } else {
              toast.error("Conectare eșuată", res.error);
            }
          }}
        />
      </Dialog>
    </div>
  );
}

/** Micuț indicator dacă env var-urile pentru API real sunt setate. */
function ApiStatusNotice() {
  const configured = Boolean(process.env.NEXT_PUBLIC_ECONTRACTE_BASE_URL);
  if (configured) {
    return (
      <div className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/[0.08] px-3 py-2 text-[11.5px] text-emerald-100">
        <ShieldCheck size={12} className="mr-1 inline text-emerald-300" />
        API eContracte.ro configurat (<code className="font-mono text-emerald-200">{process.env.NEXT_PUBLIC_ECONTRACTE_BASE_URL}</code>) — trimiterile se fac real. Webhook: <code className="font-mono">/api/webhooks/econtracte</code>
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-[11.5px] text-amber-100">
      <Sparkles size={12} className="mr-1 inline text-amber-300" />
      Mod <b>mock</b> — <code className="font-mono">NEXT_PUBLIC_ECONTRACTE_BASE_URL</code> nu e setat în <code className="font-mono">.env.local</code>. Vezi <code className="font-mono">.env.example</code>. Când setezi URL-ul + reconectezi contul, trimiterile devin reale automat.
    </div>
  );
}

function EcontracteRoConnectBanner({ connected, accountEmail, plan, onConnect, onDisconnect }: {
  connected: boolean; accountEmail: string | null; plan: string | null;
  onConnect: () => void; onDisconnect: () => void;
}) {
  return (
    <div className={cn(
      "mt-4 overflow-hidden rounded-2xl border p-4",
      connected
        ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/[0.05] to-transparent"
        : "border-violet-500/40 bg-gradient-to-r from-violet-500/10 via-indigo-500/[0.06] to-transparent",
    )}>
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          connected ? "bg-emerald-500/20 text-emerald-200" : "bg-violet-500/20 text-violet-200",
        )}>
          {connected ? <ShieldCheck size={18} /> : <Sparkles size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold text-fg">eContracte.ro</span>
            <span className="rounded border border-line bg-card px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-fg-muted">
              eIDAS · Legea 214/2024
            </span>
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Conectat
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-fg-dim/40 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">
                Neconectat
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
            Platformă românească pentru contracte, acte adiționale, oferte, acorduri și procese verbale
            cu semnătură electronică. Trimite documentul, partea semnează pe telefon în câteva minute,
            statusul se actualizează automat aici.
          </p>
          {connected ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-fg-dim">
              <span>Cont: <b className="text-fg">{accountEmail}</b></span>
              {plan && <span>Plan: <b className="text-fg">{plan}</b></span>}
              <a
                href={SIGNING_PROVIDER_URL.econtract_ro}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-300 hover:underline"
              >
                Deschide econtracte.ro <ExternalLink size={10} />
              </a>
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-fg-dim">
              <span>De la <b className="text-fg">69.9 RON/lună</b> (Basic) · 14 zile trial fără card</span>
              <a
                href="https://econtracte.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-300 hover:underline"
              >
                Vezi platforma <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {connected ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-fg-muted hover:text-fg"
            >
              <Unplug size={12} /> Deconectează
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110"
            >
              <Link2 size={12} /> Conectează contul
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectDialog({ onCancel, onConnect }: {
  onCancel: () => void;
  onConnect: (email: string, apiKey: string, plan: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [plan, setPlan] = useState<"Basic" | "Optim" | "Premium">("Optim");
  const [busy, setBusy] = useState(false);

  const canSubmit = email.includes("@") && apiKey.length >= 8;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-sky-500/30 bg-sky-500/[0.06] p-3 text-[11.5px] text-sky-100">
        <div className="font-semibold text-sky-200">Cum obții cheia API?</div>
        <div className="mt-1 text-fg-muted">
          eContracte.ro nu are docs API publice — pentru integrare, contactează <b>sales@econtracte.ro</b>
          și solicită plan Business/Enterprise cu access token. Odată primit, îl lipești aici.
        </div>
      </div>

      <Field label="Email cont eContracte.ro">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@firma.ro"
          className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
        />
      </Field>

      <Field label="Cheie API">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_live_xxxxxxxxxxxx"
          className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 font-mono text-[12px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
        />
      </Field>

      <Field label="Plan activ">
        <div className="grid grid-cols-3 gap-2">
          {([
            ["Basic",   "69.9 RON/lună"],
            ["Optim",   "129.9 RON/lună"],
            ["Premium", "399.9 RON/lună"],
          ] as ["Basic" | "Optim" | "Premium", string][]).map(([p, price]) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              className={cn(
                "flex flex-col rounded-md border p-2 text-left transition-colors",
                plan === p
                  ? "border-violet-500/60 bg-violet-500/10"
                  : "border-line bg-card-2 hover:border-violet-500/30",
              )}
            >
              <span className="text-[12px] font-bold text-fg">{p}</span>
              <span className="text-[10px] text-fg-dim">{price}</span>
            </button>
          ))}
        </div>
      </Field>

      <DialogFooter>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"
        >
          Anulează
        </button>
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={async () => { setBusy(true); await onConnect(email, apiKey, plan); setBusy(false); }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white",
            (!canSubmit || busy) && "opacity-50",
          )}
        >
          <Link2 size={13} /> {busy ? "Conectez…" : "Conectează cont"}
        </button>
      </DialogFooter>
    </div>
  );
}

function KpiCard({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone: "sky" | "emerald" | "rose" | "amber";
}) {
  const toneClass = {
    sky:     "from-sky-500/15 to-sky-500/5 text-sky-200",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-200",
    rose:    "from-rose-500/15 to-rose-500/5 text-rose-200",
    amber:   "from-amber-500/15 to-amber-500/5 text-amber-200",
  }[tone];
  return (
    <Card className={cn("bg-gradient-to-br p-3", toneClass)}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      <div className="mt-1 text-[16px] font-bold sm:text-[17px]">{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-fg-dim">{sub}</div>}
    </Card>
  );
}

function RowActions({
  canSend, canMarkOurs, canMarkCounter, canReject, canCancel,
  onSend, onMarkOurs, onMarkCounter, onReject, onCancel, onDelete,
}: {
  canSend: boolean; canMarkOurs: boolean; canMarkCounter: boolean; canReject: boolean; canCancel: boolean;
  onSend: () => void; onMarkOurs: () => void; onMarkCounter: () => void;
  onReject: () => void; onCancel: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Acțiuni"
        className="inline-flex h-7 w-7 items-center justify-center rounded text-fg-dim hover:bg-white/[0.06] hover:text-fg"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Închide" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-lg border border-line bg-card p-1 shadow-lg shadow-black/40">
            {canSend && (
              <MenuItem icon={<Send size={13} />} label="Trimite la semnat" onClick={() => { onSend(); setOpen(false); }} tone="violet" />
            )}
            {canMarkOurs && (
              <MenuItem icon={<Check size={13} />} label="Am semnat eu" onClick={() => { onMarkOurs(); setOpen(false); }} tone="sky" />
            )}
            {canMarkCounter && (
              <MenuItem icon={<Check size={13} />} label="Semnat de parte" onClick={() => { onMarkCounter(); setOpen(false); }} tone="emerald" />
            )}
            {canReject && (
              <MenuItem icon={<X size={13} />} label="Marchează respins" onClick={() => { onReject(); setOpen(false); }} tone="amber" />
            )}
            {canCancel && (
              <MenuItem icon={<X size={13} />} label="Anulează contract" onClick={() => { onCancel(); setOpen(false); }} tone="amber" />
            )}
            <MenuItem icon={<Trash2 size={13} />} label="Șterge" onClick={() => { onDelete(); setOpen(false); }} tone="rose" />
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, tone }: {
  icon: React.ReactNode; label: string; onClick: () => void; tone: "violet" | "sky" | "emerald" | "amber" | "rose";
}) {
  const cls = {
    violet:  "text-fg hover:bg-violet-500/10 hover:text-violet-200",
    sky:     "text-fg hover:bg-sky-500/10 hover:text-sky-200",
    emerald: "text-fg hover:bg-emerald-500/10 hover:text-emerald-200",
    amber:   "text-fg hover:bg-amber-500/10 hover:text-amber-200",
    rose:    "text-rose-300 hover:bg-rose-500/10",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px]", cls)}
    >
      {icon} {label}
    </button>
  );
}

function AddContractForm({ onCancel, onCreate }: {
  onCancel: () => void;
  onCreate: (input: Omit<Contract, "id" | "createdAtIso" | "createdBy" | "status" | "signing" | "tenantId">) => void;
}) {
  const [templateId, setTemplateId] = useState<string>("");
  const [number, setNumber] = useState(`COM-${new Date().getFullYear()}-`);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ContractKind>("colaborare_curier");
  const [documentType, setDocumentType] = useState<DocumentType>("contract");
  const [partyType, setPartyType] = useState<ContractPartyType>("courier");
  const [partyName, setPartyName] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyCui, setPartyCui] = useState("");
  const [startDate, setStartDate] = useState(todayIsoLocal());
  const [endDate, setEndDate] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [notes, setNotes] = useState("");
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number | null>(null);

  const applyTemplate = (tpl: ContractTemplate) => {
    setTemplateId(tpl.id);
    setKind(tpl.kind);
    setDocumentType(tpl.documentType);
    if (!title.trim()) setTitle(tpl.name);
  };

  const canSubmit = number.trim().length > 0 && title.trim().length > 0 && partyName.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Template selector — auto-completează kind + documentType */}
      <div className="rounded-md border border-violet-500/30 bg-violet-500/[0.05] p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-violet-200">
          <Sparkles size={11} /> Template-uri eContracte.ro
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CONTRACT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              title={tpl.description}
              className={cn(
                "rounded border px-2 py-1 text-[11px] font-medium transition-colors",
                templateId === tpl.id
                  ? "border-violet-500/60 bg-violet-500/20 text-violet-100"
                  : "border-line bg-card-2 text-fg-muted hover:border-violet-500/40 hover:text-fg",
              )}
            >
              {tpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Field label="Număr contract *">
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="COM-2026-0001"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Titlu *">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Colaborare curier — Ioan P."
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Tip document">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {(Object.entries(DOCUMENT_TYPE_LABEL) as [DocumentType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Categorie">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ContractKind)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {(Object.entries(CONTRACT_KIND_LABEL) as [ContractKind, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Parte">
          <select
            value={partyType}
            onChange={(e) => setPartyType(e.target.value as ContractPartyType)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          >
            {(Object.entries(CONTRACT_PARTY_LABEL) as [ContractPartyType, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label={`Nume ${CONTRACT_PARTY_LABEL[partyType].toLowerCase()} *`}>
          <input
            type="text"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Persoană sau companie"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="CUI / CNP">
          <input
            type="text"
            value={partyCui}
            onChange={(e) => setPartyCui(e.target.value)}
            placeholder="RO12345678 sau CNP"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Email (pentru semnare)">
          <input
            type="email"
            value={partyEmail}
            onChange={(e) => setPartyEmail(e.target.value)}
            placeholder="parte@example.ro"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Telefon">
          <input
            type="tel"
            value={partyPhone}
            onChange={(e) => setPartyPhone(e.target.value)}
            placeholder="+40 7XX XXX XXX"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Data start *">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Data sfârșit (opțional)">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="Valoare lunară RON (opțional)">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={monthlyValue}
            onChange={(e) => setMonthlyValue(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
        </Field>
        <Field label="PDF contract">
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-card-2 px-2.5 py-1.5 text-[11.5px] text-fg-muted hover:border-violet-500/40 hover:text-fg">
            <Upload size={13} />
            <span className="truncate">{pdfName ?? "Încarcă PDF"}</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setPdfName(f.name); setPdfSize(f.size); }
              }}
              className="hidden"
            />
          </label>
        </Field>
      </div>

      <Field label="Notițe">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Clauze speciale, condiții etc."
          className="w-full resize-none rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
        />
      </Field>

      <DialogFooter>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"
        >
          Anulează
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onCreate({
            number: number.trim(),
            title: title.trim(),
            kind,
            documentType,
            templateId: templateId || null,
            partyType,
            partyName: partyName.trim(),
            partyEmail: partyEmail.trim() || null,
            partyPhone: partyPhone.trim() || null,
            partyCui: partyCui.trim() || null,
            linkedEntityId: null,
            startDateIso: startDate,
            endDateIso: endDate || null,
            monthlyValueRon: monthlyValue ? Number(monthlyValue) : null,
            pdfName,
            pdfSize,
            pdfUploadedAtIso: pdfName ? new Date().toISOString() : null,
            notes: notes.trim() || null,
          })}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white",
            !canSubmit && "opacity-50",
          )}
        >
          <FileText size={13} /> Salvează contract
        </button>
      </DialogFooter>
    </div>
  );
}

function SendForSigningDialog({ contract, providerConnected, onCancel, onSend }: {
  contract: Contract;
  providerConnected: boolean;
  onCancel: () => void;
  onSend: (provider: SigningProvider) => void;
}) {
  const [provider, setProvider] = useState<SigningProvider>("econtract_ro");
  const [sending, setSending] = useState(false);
  const needsEmail = provider !== "internal" && !contract.partyEmail;
  const needsConnection = provider === "econtract_ro" && !providerConnected;

  return (
    <Dialog open={true} onClose={onCancel} title="Trimite la semnare electronică" size="md">
      <div className="flex flex-col gap-3">
        <div className="rounded-md border border-line bg-card-2 p-3">
          <div className="text-[11px] text-fg-dim">Contract</div>
          <div className="text-[13px] font-semibold text-fg">{contract.number} · {contract.title}</div>
          <div className="mt-1 text-[11.5px] text-fg-muted">Către: {contract.partyName}</div>
          {contract.partyEmail ? (
            <div className="text-[11px] text-fg-dim">{contract.partyEmail}</div>
          ) : (
            <div className="mt-1 text-[11px] font-semibold text-amber-300">
              Fără email — adaugă-l înainte de trimitere la un provider extern.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-semibold text-fg">Serviciu de semnare</span>
          {(Object.keys(SIGNING_PROVIDER_LABEL) as SigningProvider[]).map((p) => (
            <label
              key={p}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12.5px]",
                provider === p ? "border-violet-500/60 bg-violet-500/10 text-fg" : "border-line bg-card-2 text-fg-muted hover:text-fg",
              )}
            >
              <input
                type="radio"
                name="provider"
                checked={provider === p}
                onChange={() => setProvider(p)}
                className="accent-violet-500"
              />
              <span className="flex-1">{SIGNING_PROVIDER_LABEL[p]}</span>
              {p === "internal" && (
                <span className="text-[10px] text-fg-dim">manual, fără plic extern</span>
              )}
            </label>
          ))}
        </div>

        {needsConnection && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.08] p-2.5 text-[11px] text-amber-100">
            <strong>Nu ești conectat la eContracte.ro.</strong> Închide dialogul și conectează contul din
            banner-ul de sus, sau alege un alt provider.
          </div>
        )}
        {!needsConnection && (
          <div className="rounded-md border border-sky-500/30 bg-sky-500/[0.06] p-2.5 text-[11px] text-sky-100">
            <strong>Mock:</strong> la trimitere generez un envelope ID + URL fake. În producție, aici se face
            request HTTP către API-ul providerului cu PDF-ul atașat, iar contrapartida primește email cu link
            de semnare. Statusul se actualizează via webhook.
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line bg-card-hover px-3 py-1.5 text-[12.5px] font-medium text-fg hover:bg-white/[0.06]"
          >
            Anulează
          </button>
          <button
            type="button"
            disabled={sending || needsEmail || needsConnection}
            onClick={async () => { setSending(true); await onSend(provider); setSending(false); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white",
              (sending || needsEmail || needsConnection) && "opacity-50",
            )}
          >
            <Send size={13} /> {sending ? "Trimit…" : "Trimite la semnat"}
          </button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
