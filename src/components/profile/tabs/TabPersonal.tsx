"use client";

import { Pencil } from "lucide-react";
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
        <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Nume complet" value={user.name} />
          <Info label="Email" value={user.email} />
          <Info label="Telefon" value={profile.phone || "Necompletat"} muted={!profile.phone} />
          <Info label="Funcție" value={ROLE_LABELS[user.role]} />
          <Info label="Locație" value={profile.location || "Necompletat"} muted={!profile.location} />
          <Info label="Fus orar" value={currentTimezoneLabel(profile.timezone)} />
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
          <p className="text-[13px] leading-relaxed text-fg whitespace-pre-wrap">
            {profile.bio || (
              <span className="italic text-fg-dim">Nu ai completat bio. Apasă „Editează" pentru a adăuga.</span>
            )}
          </p>
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

function Info({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`mt-1 truncate text-[13px] ${muted ? "italic text-fg-dim" : "text-fg"}`}>
        {value}
      </div>
    </div>
  );
}
