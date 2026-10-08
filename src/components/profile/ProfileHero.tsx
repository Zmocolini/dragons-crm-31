"use client";

import Image from "next/image";
import { Calendar, Camera, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { AvatarUploadDialog } from "./dialogs/AvatarUploadDialog";
import { formatRoDate } from "./utils";

export function ProfileHero() {
  const { user } = useSession();
  const { profile } = useProfile();
  const [uploadOpen, setUploadOpen] = useState(false);

  const displayName = profile.displayName ?? user.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-7">
        <div className="relative shrink-0">
          <span className="relative inline-flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-[38px] font-bold text-white ring-4 ring-violet-500/25">
            {profile.avatarDataUrl ? (
              <Image
                src={profile.avatarDataUrl}
                alt={displayName}
                width={140}
                height={140}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              initials
            )}
          </span>
          <button
            type="button"
            aria-label="Schimbă poza de profil"
            onClick={() => setUploadOpen(true)}
            className="absolute bottom-1 right-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg ring-2 ring-card transition-colors hover:bg-violet-500"
          >
            <Camera size={15} />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] font-bold text-fg">{displayName}</h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Activ
            </span>
          </div>
          <div className="mt-0.5 text-[13px] font-medium text-violet-300">
            {ROLE_LABELS[user.role]}
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            <MetaItem icon={<Mail size={14} />} label="Email" value={user.email} />
            <MetaItem
              icon={<Phone size={14} />}
              label="Telefon"
              value={profile.phone || "Necompletat"}
              muted={!profile.phone}
            />
            <MetaItem
              icon={<MapPin size={14} />}
              label="Locație"
              value={profile.location || "Necompletat"}
              muted={!profile.location}
            />
            <MetaItem
              icon={<Calendar size={14} />}
              label="Membru din"
              value={formatRoDate(profile.joinedAt)}
            />
          </dl>
        </div>

        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-line bg-card-2 px-3.5 py-2 text-[12.5px] font-semibold text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
        >
          <Camera size={14} />
          Schimbă poza
        </button>
      </div>

      <AvatarUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </section>
  );
}

function MetaItem({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-fg-dim">{icon}</span>
      <div className="min-w-0 leading-tight">
        <dt className="text-[10.5px] uppercase tracking-wider text-fg-dim">{label}</dt>
        <dd className={`truncate text-[13px] ${muted ? "italic text-fg-dim" : "text-fg"}`}>
          {value}
        </dd>
      </div>
    </div>
  );
}
