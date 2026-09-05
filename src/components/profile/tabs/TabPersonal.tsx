"use client";

import { Briefcase, Clock, Mail, MapPin, Pencil, Phone, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { EditBioDialog } from "../dialogs/EditBioDialog";
import { EditPersonalDialog } from "../dialogs/EditPersonalDialog";
import { currentTimezoneLabel } from "../utils";

export function TabPersonal() {
  const { user } = useSession();
  const { profile } = useProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [bioOpen, setBioOpen]   = useState(false);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Detalii personale</h3>
            <p className="text-[11.5px] text-fg-muted">Informațiile tale de bază.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <Pencil size={12} />
            Editează
          </button>
        </header>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <FieldCard icon={User}       label="Nume complet" value={user.name} />
          <FieldCard icon={Mail}       label="Email"        value={user.email} />
          <FieldCard icon={Phone}      label="Telefon"      value={profile.phone || "Necompletat"} muted={!profile.phone} />
          <FieldCard icon={Briefcase}  label="Funcție"      value={ROLE_LABELS[user.role]} />
          <FieldCard icon={MapPin}     label="Locație"      value={profile.location || "Necompletat"} muted={!profile.location} />
          <FieldCard icon={Clock}      label="Fus orar"     value={currentTimezoneLabel(profile.timezone)} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card">
        <header className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Despre mine</h3>
            <p className="text-[11.5px] text-fg-muted">
              O scurtă descriere despre tine și rolul tău în echipă.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBioOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
          >
            <Pencil size={12} />
            Editează
          </button>
        </header>
        <div className="p-5">
          <div className="rounded-xl border border-line/60 bg-card-2/50 p-4">
            <p className="text-[13px] leading-relaxed text-fg whitespace-pre-wrap">
              {profile.bio || (
                <span className="italic text-fg-dim">
                  Nu ai completat descrierea. Apasă „Editează" pentru a adăuga.
                </span>
              )}
            </p>
          </div>
          <div className="mt-2 text-right text-[11px] text-fg-dim">
            {profile.bio.length}/500
          </div>
        </div>
      </section>

      <EditPersonalDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initialName={user.name}
      />
      <EditBioDialog open={bioOpen} onClose={() => setBioOpen(false)} />
    </div>
  );
}

function FieldCard({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-card-2/50 p-3">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2.5">
        <Icon size={14} className="shrink-0 text-fg-dim" />
        <div
          className={`min-w-0 truncate text-[13px] ${muted ? "italic text-fg-dim" : "text-fg"}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
