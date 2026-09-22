"use client";

import Image from "next/image";
import { Flame } from "lucide-react";
import { useSettings } from "@/lib/settings/context";

export function Logo({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  const logo = settings.organization.logoDataUrl;
  const name = settings.organization.name || "Dragon Delivery";

  if (logo) {
    return (
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-line bg-card-2">
          <Image src={logo} alt={name} fill sizes="40px" className="object-contain" unoptimized />
        </span>
        {!compact && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[14px] font-bold tracking-tight text-fg">{name}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-red-600 shadow-[0_8px_24px_-6px_rgba(249,115,22,0.55)]">
        <Flame
          size={22}
          className="text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
          strokeWidth={2.2}
        />
      </span>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-black tracking-[0.14em] text-fg">
            DRAGON
          </div>
          <div className="-mt-0.5 text-[15px] font-black tracking-[0.14em] text-fg">
            DELIVERY
          </div>
          <div className="mt-0.5 text-[8px] font-semibold tracking-[0.22em] text-amber-500/90">
            MORE THAN DELIVERY
          </div>
        </div>
      )}
    </div>
  );
}
