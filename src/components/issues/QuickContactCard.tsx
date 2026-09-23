"use client";

import { useState } from "react";
import { LifeBuoy, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/lib/rbac/session";
import type { TicketCategory, TicketPriority } from "@/lib/issues/data";
import { cn } from "@/lib/utils/cn";

// TODO(real-users): mută în setări/tenant → contact_support field.
const SUPPORT_PHONE = "+40 724 990 952";
const SUPPORT_EMAIL = "suport@dragondelivery.ro";
const SUPPORT_HOURS = "Luni–Vineri 09:00 — 21:00 · Sâmbătă 10:00 — 16:00";

type SubmitPayload = {
  subject: string;
  description: string;
  requesterName: string;
  category: TicketCategory;
  priority: TicketPriority;
  platform: string;
};

export function QuickContactCard({ onSubmit }: { onSubmit: (payload: SubmitPayload) => void }) {
  const toast = useToast();
  const { user } = useSession();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");

  const phoneHref = `tel:${SUPPORT_PHONE.replace(/\s/g, "")}`;
  const waHref = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}`;
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Suport CRM")}`;

  function submit() {
    if (!subject.trim() && !message.trim()) {
      toast.error("Câmp gol", "Scrie măcar un subiect sau un mesaj.");
      return;
    }
    onSubmit({
      subject: subject.trim() || message.trim().slice(0, 60),
      description: message.trim(),
      requesterName: user.name,
      category: "other",
      priority,
      platform: "bolt",
    });
    setSubject("");
    setMessage("");
    setPriority("normal");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-br from-violet-500/[0.06] via-blue-500/[0.04] to-transparent">
      <div className="flex flex-wrap items-start gap-4 border-b border-line/50 px-5 py-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 text-violet-300">
          <LifeBuoy size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-fg">Ai o problemă? Contactează-ne rapid</h2>
          <p className="mt-1 text-[12px] text-fg-muted">
            Alege cum vrei să iei legătura cu echipa de suport. Răspundem cât se poate de repede.
          </p>
          <p className="mt-1.5 text-[10.5px] text-fg-dim">Program: {SUPPORT_HOURS}</p>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Butoane rapide */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-1">
          <ContactBtn
            href={phoneHref}
            icon={Phone}
            label="Sună acum"
            value={SUPPORT_PHONE}
            tint="from-emerald-500/20 to-emerald-600/10"
            iconColor="text-emerald-300"
          />
          <ContactBtn
            href={waHref}
            external
            icon={MessageCircle}
            label="WhatsApp"
            value={SUPPORT_PHONE}
            tint="from-green-500/20 to-green-600/10"
            iconColor="text-green-300"
          />
          <ContactBtn
            href={mailHref}
            icon={Mail}
            label="Trimite email"
            value={SUPPORT_EMAIL}
            tint="from-sky-500/20 to-sky-600/10"
            iconColor="text-sky-300"
          />
        </div>

        {/* Formular scurt */}
        <div className="rounded-xl border border-line/60 bg-card/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-fg-dim">
              Sau scrie-ne aici
            </span>
            <div className="flex items-center gap-1">
              {(["normal", "high", "urgent"] as TicketPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider transition-colors",
                    priority === p
                      ? p === "urgent" ? "bg-rose-500/25 text-rose-200"
                      : p === "high" ? "bg-amber-500/25 text-amber-200"
                      : "bg-violet-500/25 text-violet-200"
                      : "text-fg-dim hover:text-fg-muted",
                  )}
                >
                  {p === "urgent" ? "Urgent" : p === "high" ? "Important" : "Normal"}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subiect scurt (ex: Nu pot loga în Bolt)"
            className="w-full rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Descrie problema… oră, oraș, ce ai încercat"
            className="mt-2 w-full resize-none rounded-lg border border-line bg-card-hover px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10.5px] text-fg-dim">
              Trimit ca <b className="text-fg-muted">{user.name}</b>
            </span>
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
            >
              <Send size={13} /> Trimite
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactBtn({ href, external, icon: Icon, label, value, tint, iconColor }: {
  href: string;
  external?: boolean;
  icon: typeof Phone;
  label: string;
  value: string;
  tint: string;
  iconColor: string;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-line bg-gradient-to-br px-3 py-3 transition-transform hover:-translate-y-0.5",
        tint,
      )}
    >
      <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]", iconColor)}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[12.5px] font-semibold text-fg">{label}</span>
        <span className="block truncate text-[10.5px] text-fg-muted">{value}</span>
      </span>
    </a>
  );
}
