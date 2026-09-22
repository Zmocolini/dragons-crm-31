"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Phone as PhoneIcon, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PlatformChip, PlatformLogo } from "@/components/ui/PlatformLogo";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import type { PlatformKey } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const PLATFORM_NAME: Record<PlatformKey, string> = {
  bolt: "Bolt Food",
  wolt: "Wolt",
  glovo: "Glovo",
};

export function WaitlistPage() {
  const { activeFleetId } = useSession();
  const { settings } = useSettings();
  const { allRows, updateCourier, hydrated } = useCouriers();
  const toast = useToast();

  const [platformFilter, setPlatformFilter] = useState<PlatformKey | "any">("any");
  const [cityFilter, setCityFilter] = useState<string | "any">("any");
  const [search, setSearch] = useState("");

  const waitlisted = useMemo(() => {
    return allRows.filter((c) =>
      c.tenantId === activeFleetId &&
      Array.isArray(c.waitlistedPlatforms) &&
      c.waitlistedPlatforms.length > 0,
    );
  }, [allRows, activeFleetId]);

  const cities = useMemo(() => {
    const set = new Set(waitlisted.map((c) => c.city).filter(Boolean));
    return Array.from(set).sort();
  }, [waitlisted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return waitlisted.filter((c) => {
      if (platformFilter !== "any" && !(c.waitlistedPlatforms ?? []).includes(platformFilter)) return false;
      if (cityFilter !== "any" && c.city !== cityFilter) return false;
      if (q && !c.fullName.toLowerCase().includes(q) && !c.phone.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [waitlisted, platformFilter, cityFilter, search]);

  const activePlatforms = useMemo(
    () => (Object.keys(PLATFORM_NAME) as PlatformKey[]).filter((p) => settings.platforms[p] === "active"),
    [settings.platforms],
  );

  const perPlatformCount = useMemo(() => {
    const counts: Record<PlatformKey, number> = { bolt: 0, wolt: 0, glovo: 0 };
    waitlisted.forEach((c) => {
      (c.waitlistedPlatforms ?? []).forEach((p) => { counts[p] = (counts[p] ?? 0) + 1; });
    });
    return counts;
  }, [waitlisted]);

  function activateOn(courierId: string, platform: PlatformKey, fullName: string) {
    const row = waitlisted.find((r) => r.id === courierId);
    if (!row) return;
    const nextWaitlist = (row.waitlistedPlatforms ?? []).filter((p) => p !== platform);
    const nextPlatforms = row.platforms.includes(platform) ? row.platforms : [...row.platforms, platform];
    updateCourier(courierId, { platforms: nextPlatforms, waitlistedPlatforms: nextWaitlist });
    toast.success("Activat pe " + PLATFORM_NAME[platform], `${fullName} este acum activ și pe ${PLATFORM_NAME[platform]}.`);
  }

  function removeFromWaitlist(courierId: string, platform: PlatformKey, fullName: string) {
    const row = waitlisted.find((r) => r.id === courierId);
    if (!row) return;
    const nextWaitlist = (row.waitlistedPlatforms ?? []).filter((p) => p !== platform);
    updateCourier(courierId, { waitlistedPlatforms: nextWaitlist });
    toast.info("Scos din așteptare", `${fullName} nu mai așteaptă ${PLATFORM_NAME[platform]}.`);
  }

  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-4 md:px-6 md:pt-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-[22px] font-bold text-fg">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 text-amber-300">
                <Clock size={18} />
              </span>
              Curieri în așteptare
            </h1>
            <p className="mt-1 text-[13px] text-fg-muted">
              Curieri cu acte depuse care așteaptă loc pe o platformă suplimentară în orașul lor.
              Când apare un slot, sună curierul și marchează-l activat.
            </p>
          </div>
          <Link
            href="/curieri"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
          >
            <PhoneIcon size={13} />
            Vezi curieri activi
          </Link>
        </div>

        {/* Stats per platformă */}
        <div className="grid gap-3 sm:grid-cols-3">
          {activePlatforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatformFilter(platformFilter === p ? "any" : p)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                platformFilter === p
                  ? "border-violet-500/60 bg-violet-500/[0.08]"
                  : "border-line bg-card hover:bg-card-hover",
              )}
            >
              <PlatformLogo platform={p} size={40} rounded="lg" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
                  Așteaptă {PLATFORM_NAME[p]}
                </div>
                <div className="mt-0.5 text-[24px] font-bold tabular-nums text-fg">
                  {perPlatformCount[p] ?? 0}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Listă */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de așteptare</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută după nume sau telefon..."
                className="min-w-[220px] flex-1 rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
              />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value as PlatformKey | "any")}
                className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none"
              >
                <option value="any">Toate platformele</option>
                {activePlatforms.map((p) => (
                  <option key={p} value={p}>{PLATFORM_NAME[p]}</option>
                ))}
              </select>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-lg border border-line bg-card-2 px-3 py-2 text-[12.5px] text-fg focus:outline-none"
              >
                <option value="any">Toate orașele</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="ml-auto text-[12px] text-fg-dim">
                {filtered.length} {filtered.length === 1 ? "curier" : "curieri"}
              </div>
            </div>

            {/* Rows */}
            {!hydrated ? (
              <div className="rounded-lg border border-dashed border-line/40 p-8 text-center text-[13px] text-fg-dim">
                Se încarcă...
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState hasAny={waitlisted.length > 0} />
            ) : (
              <ul className="space-y-2">
                {filtered.map((c) => (
                  <li key={c.id} className="rounded-lg border border-line bg-card p-3">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/curieri/${c.id}`}
                            className="truncate text-[14px] font-semibold text-fg hover:text-violet-300 hover:underline"
                          >
                            {c.fullName}
                          </Link>
                          <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] text-fg-muted">
                            <MapPin size={10} />
                            {c.city || "—"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-fg-muted">
                          <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 font-mono text-fg-muted hover:text-fg">
                            <PhoneIcon size={11} />
                            {c.phone || "—"}
                          </a>
                          {c.platforms.length > 0 && (
                            <>
                              <span className="text-fg-dim">·</span>
                              <span className="text-fg-dim">Activ pe:</span>
                              <div className="flex items-center gap-1">
                                {c.platforms.map((p) => (
                                  <PlatformChip key={p} platform={p} size={14} showLabel={false} />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {(c.waitlistedPlatforms ?? []).map((p) => (
                          <div
                            key={p}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 pl-1.5 pr-1 py-0.5 text-[11px] font-semibold text-amber-100"
                          >
                            <PlatformLogo platform={p} size={14} rounded="md" />
                            {PLATFORM_NAME[p]}
                            <button
                              type="button"
                              onClick={() => activateOn(c.id, p, c.fullName)}
                              title={`Marchează activat pe ${PLATFORM_NAME[p]}`}
                              className="ml-0.5 inline-flex h-5 items-center gap-0.5 rounded bg-emerald-500/25 px-1.5 text-[10px] font-bold text-emerald-100 hover:bg-emerald-500/40"
                            >
                              <Plus size={9} />
                              Activat
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromWaitlist(c.id, p, c.fullName)}
                              aria-label={`Scoate din așteptarea pentru ${PLATFORM_NAME[p]}`}
                              title="Scoate din așteptare"
                              className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded text-amber-200 hover:bg-amber-500/25 hover:text-amber-50"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-line/40 p-8 text-center">
      <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
        <Clock size={18} />
      </div>
      <div className="text-[14px] font-semibold text-fg">
        {hasAny ? "Niciun rezultat pentru filtrele curente" : "Lista de așteptare e goală"}
      </div>
      <p className="mx-auto mt-1 max-w-md text-[12px] text-fg-muted">
        {hasAny
          ? "Ajustează filtrele de platformă sau oraș ca să vezi mai mulți curieri."
          : 'Adaugă platforme în așteptare la un curier existent (din editorul lui) sau la unul nou (din „Curier nou"). Aici apar toți curierii care vor și pe altă aplicație.'}
      </p>
    </div>
  );
}
