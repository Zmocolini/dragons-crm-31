"use client";

import {
  Building2, Calendar, CheckCircle2, CreditCard, Crown, Download,
  FileText, Pencil, Receipt,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import type { BillingInfo, Invoice, PaymentMethod } from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

const RO_MONTHS_LONG = [
  "Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie",
  "Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie",
];

function formatRoDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${RO_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ro-RO")} RON`;
}

export function TabFacturare() {
  return (
    <div className="space-y-5">
      <PlanCard />
      <BillingInfoCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentMethodCard />
        <InvoicesCard />
      </div>

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </div>
  );
}

/* ═══════════ PLAN ═══════════ */

function PlanCard() {
  const { user } = useSession();
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);

  const b = settings.billing;
  const used = user.activeTenant.planUsage.used;
  const pct = Math.min(100, Math.round((used / b.planLimit) * 100));

  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <header className="mb-4">
        <h3 className="text-[15px] font-semibold text-fg">Planul tău</h3>
        <p className="text-[11.5px] text-fg-muted">Planul și consumul organizației.</p>
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
          <Crown size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[17px] font-bold text-fg">{b.planLabel}</div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Activ
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-fg-muted">
            <span>
              <span className="font-mono font-semibold text-fg">{used}</span> / {b.planLimit} curieri
            </span>
            <span>
              <span className="font-mono font-bold text-emerald-400">{pct}%</span> utilizat
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-fg-muted">
            <Calendar size={12} className="text-fg-dim" />
            Următoarea facturare: <span className="font-semibold text-fg">{formatRoDate(b.nextBillingIso)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
        >
          Gestionează planul
        </button>
      </div>

      <PlanManageDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function PlanManageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { logActivity } = useProfile();
  function request() {
    logActivity("preferences.update", "Cerere schimbare plan", "Facturare");
    toast.success("Cerere trimisă echipei Dragon.", "Te contactăm în 24h.");
    onClose();
  }
  return (
    <Dialog open={open} onClose={onClose} title="Gestionează planul" description="Alege planul potrivit pentru dimensiunea flotei tale.">
      <div className="grid gap-3">
        <PlanTier name="Plan Starter"    limit="până la 50 curieri"  price="990 RON / lună"  current={false} />
        <PlanTier name="Plan Business"   limit="până la 500 curieri" price="1990 RON / lună" current />
        <PlanTier name="Plan Enterprise" limit="flotă nelimitată"    price="Personalizat"    current={false} />
      </div>
      <div className="mt-4 rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 text-[11.5px] text-sky-100">
        Schimbarea planului se face cu un membru al echipei Dragon Delivery. Trimite o cerere și te contactăm.
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={request} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
          Trimite cerere
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function PlanTier({ name, limit, price, current }: { name: string; limit: string; price: string; current: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-xl border p-3.5",
      current ? "border-violet-500/50 bg-violet-500/[0.08]" : "border-line/60 bg-card-2/40",
    )}>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
        <Crown size={16} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-semibold text-fg">{name}</div>
          {current && (
            <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              Plan curent
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-muted">{limit}</div>
      </div>
      <div className="text-right text-[12.5px] font-bold text-fg">{price}</div>
    </div>
  );
}

/* ═══════════ DATE FACTURARE ═══════════ */

function BillingInfoCard() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const b = settings.billing;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex items-start justify-between border-b border-line/70 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold text-fg">Date de facturare</h3>
          <p className="text-[11.5px] text-fg-muted">Date utilizate pentru facturi.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          <Pencil size={12} />
          Editează
        </button>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <InfoField icon={Building2} label="Nume firmă"    value={b.billingName} />
        <InfoField icon={FileText}  label="CUI"           value={b.billingCui} />
        <InfoField icon={Receipt}   label="Email facturi" value={b.billingEmail} />
        <InfoField icon={Building2} label="Adresă"        value={b.billingAddress} />
      </div>
      <EditBillingDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function InfoField({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line/60 bg-card-2/50 p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-[13px] text-fg">
        <Icon size={12} className="text-fg-dim" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function EditBillingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, updateBilling } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [draft, setDraft] = useState<Partial<BillingInfo>>(settings.billing);
  useEffect(() => setDraft(settings.billing), [settings.billing]);

  function save() {
    if (!draft.billingName || !draft.billingCui || !draft.billingEmail) {
      toast.error("Câmpuri obligatorii", "Completează nume, CUI și email.");
      return;
    }
    updateBilling({
      billingName: draft.billingName!.trim(),
      billingCui: draft.billingCui!.trim(),
      billingEmail: draft.billingEmail!.trim(),
      billingAddress: (draft.billingAddress ?? "").trim(),
    });
    logActivity("preferences.update", "Date facturare actualizate", "Facturare");
    toast.success("Date facturare salvate.");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Editează date de facturare" size="lg">
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="Nume firmă"    value={draft.billingName    ?? ""} onChange={(v) => setDraft({ ...draft, billingName: v })} />
        <FormField label="CUI"           value={draft.billingCui     ?? ""} onChange={(v) => setDraft({ ...draft, billingCui: v })} />
        <FormField label="Email facturi" value={draft.billingEmail   ?? ""} onChange={(v) => setDraft({ ...draft, billingEmail: v })} />
        <FormField label="Adresă"        value={draft.billingAddress ?? ""} onChange={(v) => setDraft({ ...draft, billingAddress: v })} />
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">Salvează</button>
      </DialogFooter>
    </Dialog>
  );
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
      />
    </div>
  );
}

/* ═══════════ METODĂ PLATĂ ═══════════ */

function PaymentMethodCard() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const p = settings.billing.paymentMethod;

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Metodă de plată</h3>
        <p className="text-[11.5px] text-fg-muted">Card activ pentru abonament.</p>
      </header>
      <div className="p-5">
        <div data-surface="dark" className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-[#2e1065] p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-white/60">
                {p.brand === "mastercard" ? "Mastercard Business" : p.brand.toUpperCase()}
              </div>
              <div className="mt-4 font-mono text-[18px] tracking-widest">
                •••• •••• •••• {p.last4}
              </div>
            </div>
            <div className="flex gap-1">
              <span className="h-6 w-6 rounded-full bg-red-500/85" />
              <span className="-ml-3 h-6 w-6 rounded-full bg-amber-400/85 mix-blend-screen" />
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between text-[11px]">
            <div>
              <div className="text-white/50">Titular</div>
              <div className="mt-0.5 font-semibold uppercase tracking-wide">{p.holder}</div>
            </div>
            <div>
              <div className="text-white/50">Expiră</div>
              <div className="mt-0.5 font-mono font-semibold">
                {String(p.expiresMonth).padStart(2, "0")}/{p.expiresYear}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-card-2 px-4 py-2.5 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          <CreditCard size={13} />
          Actualizează
        </button>
      </div>
      <UpdatePaymentDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function UpdatePaymentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { updatePaymentMethod } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");

  function save() {
    if (!/^\d{12,19}$/.test(cardNumber.replace(/\s/g, ""))) {
      toast.error("Număr card invalid");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      toast.error("Expirare invalidă", "Format: MM/YY.");
      return;
    }
    if (cvc.length < 3) {
      toast.error("CVC invalid");
      return;
    }
    const [m, y] = expiry.split("/");
    const last4  = cardNumber.slice(-4);
    const brand: PaymentMethod["brand"] = /^4/.test(cardNumber) ? "visa" : /^3/.test(cardNumber) ? "amex" : "mastercard";
    updatePaymentMethod({
      brand,
      last4,
      expiresMonth: Number(m),
      expiresYear:  2000 + Number(y),
      holder: holder.toUpperCase().trim() || "Dragon Delivery SRL",
    });
    logActivity("preferences.update", "Metodă plată actualizată", "Facturare");
    toast.success("Card actualizat.", `•••• ${last4}`);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Actualizează metoda de plată">
      <div className="grid gap-3">
        <FormField label="Titular card"                 value={holder}     onChange={setHolder} />
        <FormField label="Număr card (12–19 cifre)"     value={cardNumber} onChange={(v) => setCardNumber(v.replace(/[^\d\s]/g, ""))} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Expirare (MM/YY)"           value={expiry}     onChange={(v) => setExpiry(v.replace(/[^\d/]/g, "").slice(0, 5))} />
          <FormField label="CVC"                        value={cvc}        onChange={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-sky-500/25 bg-sky-500/10 p-3 text-[11.5px] text-sky-100">
        Datele cardului sunt criptate și procesate prin gateway PCI-DSS (Stripe/EuPlătesc — backend TODO).
        Doar ultimele 4 cifre rămân stocate în CRM.
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">Salvează card</button>
      </DialogFooter>
    </Dialog>
  );
}

/* ═══════════ FACTURI ═══════════ */

function InvoicesCard() {
  const { settings } = useSettings();
  const [allOpen, setAllOpen] = useState(false);
  const list = settings.billing.invoices;
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Facturi recente</h3>
        <p className="text-[11.5px] text-fg-muted">Ultimele facturi emise pentru abonament.</p>
      </header>
      <ul className="divide-y divide-line/40">
        {list.slice(0, 3).map((i) => <InvoiceRow key={i.id} invoice={i} />)}
      </ul>
      <div className="border-t border-line/60 p-4">
        <button
          type="button"
          onClick={() => setAllOpen(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-card-2 px-4 py-2.5 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          Vezi toate facturile
        </button>
      </div>
      <AllInvoicesDialog open={allOpen} onClose={() => setAllOpen(false)} />
    </section>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const { logActivity } = useProfile();
  const toast = useToast();
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 text-fg-muted">
        <Receipt size={14} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[13px] font-semibold text-fg">{invoice.number}</div>
        <div className="mt-0.5 text-[11px] text-fg-dim">{formatRoDate(invoice.dateIso)}</div>
      </div>
      <div className="text-right text-[13px] font-mono font-bold text-fg">
        {formatCurrency(invoice.amountRon)}
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
        <CheckCircle2 size={10} />
        Plătită
      </span>
      <button
        type="button"
        onClick={() => {
          logActivity("document.download", invoice.number, "Facturare");
          toast.success("Factură descărcată.", `${invoice.number}.pdf`);
        }}
        aria-label={`Descarcă ${invoice.number}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-card-2 text-fg-muted hover:bg-card-hover hover:text-fg"
      >
        <Download size={12} />
      </button>
    </li>
  );
}

function AllInvoicesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useSettings();
  return (
    <Dialog open={open} onClose={onClose} title="Toate facturile" size="lg">
      <ul className="divide-y divide-line/50 overflow-hidden rounded-xl border border-line">
        {settings.billing.invoices.map((i) => <InvoiceRow key={i.id} invoice={i} />)}
      </ul>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Închide</button>
      </DialogFooter>
    </Dialog>
  );
}

function SaveButton() {
  const toast = useToast();
  const { logActivity } = useProfile();
  function save() {
    logActivity("preferences.update", "Modificări facturare", "Facturare");
    toast.success("Modificări salvate.");
  }
  return (
    <button
      type="button"
      onClick={save}
      className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-2.5 text-[13px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
    >
      Salvează modificările
    </button>
  );
}
