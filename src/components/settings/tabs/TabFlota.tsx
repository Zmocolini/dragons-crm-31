"use client";

import {
  AlertCircle, Bike, Car, CheckCircle2, HardHat, Home, Info,
  Layers, LifeBuoy, MapPin, MoreHorizontal, Package, ShoppingBag,
  Users, X, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/Switch";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { PlatformLogo } from "@/components/ui/PlatformLogo";
import { useToast } from "@/components/ui/Toast";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { useSettings } from "@/lib/settings/context";
import {
  MODULE_DESCRIPTION, MODULE_LABEL, PLATFORM_LABEL, VEHICLE_LABEL, VEHICLE_TYPES,
  type CityStatus, type FleetConfig, type ModuleKey, type PlatformKey, type VehicleType,
} from "@/lib/settings/types";
import { cn } from "@/lib/utils/cn";

const MODULE_ICON: Record<ModuleKey, LucideIcon> = {
  vehicles:       Car,
  accommodations: Home,
  equipment:      HardHat,
  bags:           ShoppingBag,
  subcontractors: Users,
  issues:         LifeBuoy,
};

const VEHICLE_ICON: Record<VehicleType, LucideIcon> = {
  bike:    Bike,
  e_bike:  Zap,
  scooter: Bike,
  car:     Car,
};

const CITY_STATUS_LABEL: Record<CityStatus, string> = {
  active:      "Activ",
  waitlist:    "Listă de așteptare",
  unavailable: "Indisponibil",
};

const CITY_STATUS_TONE: Record<CityStatus, string> = {
  active:      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  waitlist:    "border-amber-500/30 bg-amber-500/10 text-amber-300",
  unavailable: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export function TabFlota() {
  const { settings, updateFleet, toggleVehicleType, toggleModule, addCity, removeCity, updateCityStatus, togglePlatform } = useSettings();
  const { logActivity } = useProfile();
  const toast = useToast();

  // Draft snapshots for the „Salvează modificările" button la nivel de tab
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDirty(false); }, []); // reset flag pe mount

  function commit() {
    // datele sunt deja aplicate în context la fiecare acțiune (persistă live).
    // acest buton confirmă intenția de „aplică pe backend real" — TODO(real-users) server action.
    logActivity("preferences.update", "Configurație flotă", "Setări");
    toast.success("Configurația flotei a fost salvată.");
    setDirty(false);
  }

  function markDirty() { setDirty(true); }

  return (
    <div className="space-y-5">
      <FleetHeaderCard />

      <ModulesCard
        modules={settings.modules}
        onToggle={(k, v) => { toggleModule(k, v); markDirty(); }}
      />

      <VehiclesEquipmentCard
        fleet={settings.fleet}
        onToggleType={(t, v) => { toggleVehicleType(t, v); markDirty(); }}
        onUpdateFleet={(p) => { updateFleet(p); markDirty(); }}
      />

      <CitiesPlatformsCard
        cities={settings.cities}
        platforms={settings.platforms}
        onAddCity={(name) => { addCity(name); markDirty(); }}
        onRemoveCity={(id) => { removeCity(id); markDirty(); }}
        onUpdateCity={(id, s) => { updateCityStatus(id, s); markDirty(); }}
        onTogglePlatform={(k, v) => { togglePlatform(k, v); markDirty(); }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={commit}
          disabled={!dirty}
          className={cn(
            "rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white transition-colors",
            dirty
              ? "bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500"
              : "cursor-not-allowed bg-white/[0.06] text-fg-dim",
          )}
        >
          Salvează modificările
        </button>
      </div>
    </div>
  );
}

/* ─── FLEET HEADER + SWITCH DIALOG ─── */
function FleetHeaderCard() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-[14px] font-black text-white">
            {user.activeTenant.name.charAt(0)}
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">Configurare flotă</div>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="text-[17px] font-bold text-fg">{user.activeTenant.name}</div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Activă
              </span>
            </div>
            <div className="mt-0.5 text-[12px] text-fg-muted">
              {user.activeTenant.planUsage.used} curieri activi · Gestionează flota activă și regulile operaționale.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
        >
          Schimbă flota
        </button>
      </div>

      <FleetSwitchDialog open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function FleetSwitchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const toast = useToast();
  const { logActivity } = useProfile();
  const [selected, setSelected] = useState<string>(user.activeTenant.id);

  const tenants = [
    { id: user.activeTenant.id, name: user.activeTenant.name, active: true },
  ];

  function apply() {
    // TODO(real-users): server action switchTenant(id) + revalidate session + refresh dashboard.
    logActivity("tenant.switch", user.activeTenant.name, "Flotă");
    toast.success("Flotă activă setată.", `${user.activeTenant.name} rămâne flota curentă.`);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Schimbă flota" size="md">
      <p className="mb-4 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[12px] text-sky-100">
        <Info size={12} className="mr-1 inline align-[-2px]" />
        Flota selectată va fi setată ca flotă activă pentru această sesiune. Poți reveni oricând și
        schimba.
      </p>
      <ul className="space-y-1.5">
        {tenants.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                selected === t.id
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-line bg-card-2/40 hover:bg-card-hover",
              )}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-[13px] font-black text-white">
                {t.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-fg">{t.name}</div>
                <div className="text-[11px] text-fg-dim">
                  {t.active ? "Flotă curentă" : "Alte flote disponibile"}
                </div>
              </div>
              {selected === t.id && <CheckCircle2 size={16} className="text-violet-300" />}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-fg-dim">
        Alte flote apar aici odată ce contul tău e adăugat ca membru.
      </p>
      <DialogFooter>
        <button type="button" onClick={onClose} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
        <button type="button" onClick={apply} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
          Setează flotă activă
        </button>
      </DialogFooter>
    </Dialog>
  );
}

/* ─── MODULES CARD ─── */
function ModulesCard({
  modules,
  onToggle,
}: {
  modules: Record<ModuleKey, boolean>;
  onToggle: (k: ModuleKey, v: boolean) => void;
}) {
  const rows: ModuleKey[] = ["vehicles", "accommodations", "equipment", "bags", "subcontractors", "issues"];
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Module operaționale</h3>
        <p className="text-[11.5px] text-fg-muted">Activează modulele folosite de această flotă.</p>
      </header>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {rows.map((k) => {
          const Icon = MODULE_ICON[k];
          return (
            <div
              key={k}
              className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-card-2/40 p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-fg-muted">
                  <Icon size={15} />
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="text-[13px] font-semibold text-fg">{MODULE_LABEL[k]}</div>
                  <div className="mt-0.5 truncate text-[11px] text-fg-muted">{MODULE_DESCRIPTION[k]}</div>
                </div>
              </div>
              <Switch checked={modules[k]} onChange={(v) => onToggle(k, v)} ariaLabel={MODULE_LABEL[k]} />
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-3 border-t border-line/60 bg-card-2/40 px-5 py-3 text-[11.5px] text-fg-muted">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
          <Info size={12} />
        </span>
        <div>
          <strong className="text-fg">Notă:</strong> Când un modul e oprit, dispare din sidebar,
          dashboard și formulare — dar datele rămân intacte. La reactivare, totul revine exact
          cum era.
        </div>
      </div>
    </section>
  );
}

/* ─── VEHICLES + EQUIPMENT CARD ─── */
function VehiclesEquipmentCard({
  fleet,
  onToggleType,
  onUpdateFleet,
}: {
  fleet: FleetConfig;
  onToggleType: (t: VehicleType, v: boolean) => void;
  onUpdateFleet: (p: Partial<FleetConfig>) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Vehicule și echipamente</h3>
        <p className="text-[11.5px] text-fg-muted">Selectează tipurile de vehicule permise în flotă.</p>
      </header>

      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {VEHICLE_TYPES.map((t) => {
          const Icon = VEHICLE_ICON[t];
          const on = fleet.vehicleTypesAllowed[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggleType(t, !on)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                on
                  ? "border-violet-500/50 bg-violet-500/[0.08]"
                  : "border-line/60 bg-card-2/40 hover:bg-card-hover",
              )}
            >
              <span className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg border",
                on ? "border-violet-500/60 bg-violet-500/15 text-violet-200" : "border-line bg-card text-fg-muted",
              )}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-fg">{VEHICLE_LABEL[t]}</div>
                <div className="mt-0.5 text-[11px] text-fg-muted">{on ? "Permis" : "Interzis"}</div>
              </div>
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                  on ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-line bg-card-2 text-fg-dim",
                )}
              >
                {on ? <CheckCircle2 size={11} /> : <X size={11} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 border-t border-line/60 p-5 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-card-2/40 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-fg">Permite vehicul propriu</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">Curierii pot folosi vehiculul personal.</div>
          </div>
          <Switch checked={fleet.allowOwnVehicle} onChange={(v) => onUpdateFleet({ allowOwnVehicle: v })} ariaLabel="Vehicul propriu" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-card-2/40 p-3.5">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-fg">Permite vehicul închiriat</div>
            <div className="mt-0.5 text-[11.5px] text-fg-muted">Curierii pot folosi vehicul închiriat.</div>
          </div>
          <Switch checked={fleet.allowRentedVehicle} onChange={(v) => onUpdateFleet({ allowRentedVehicle: v })} ariaLabel="Vehicul închiriat" />
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-line/60 bg-card-2/40 px-5 py-3 text-[11.5px] text-fg-muted">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">
          <AlertCircle size={12} />
        </span>
        <div>
          Garanția pentru vehicule/echipamente <strong className="text-fg">nu este impusă automat</strong>.
          Persoana responsabilă de flotă poate introduce o garanție custom în profilul fiecărui curier.
        </div>
      </div>
    </section>
  );
}

/* ─── CITIES + PLATFORMS CARD ─── */
function CitiesPlatformsCard({
  cities,
  platforms,
  onAddCity,
  onRemoveCity,
  onUpdateCity,
  onTogglePlatform,
}: {
  cities: { id: string; name: string; status: CityStatus }[];
  platforms: Record<PlatformKey, "active" | "inactive">;
  onAddCity: (name: string) => void;
  onRemoveCity: (id: string) => void;
  onUpdateCity: (id: string, status: CityStatus) => void;
  onTogglePlatform: (key: PlatformKey, v: boolean) => void;
}) {
  const [openCity, setOpenCity] = useState<string | null>(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [newCityName, setNewCityName] = useState("");

  function submitCity() {
    if (!newCityName.trim()) return;
    onAddCity(newCityName);
    setNewCityName("");
    setAddOpen(false);
  }

  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="border-b border-line/70 px-5 py-4">
        <h3 className="text-[15px] font-semibold text-fg">Orașe și platforme active</h3>
        <p className="text-[11.5px] text-fg-muted">
          Selectează orașele de operare și platformele integrate.
        </p>
      </header>

      <div className="grid gap-5 p-5 md:grid-cols-2">
        {/* ORAȘE */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
            <MapPin size={11} />
            Orașe
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cities.map((c) => (
              <div key={c.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenCity((prev) => prev === c.id ? null : c.id)}
                  onBlur={() => setTimeout(() => setOpenCity(null), 140)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                    CITY_STATUS_TONE[c.status],
                  )}
                >
                  {c.name}
                  <span className="text-[10px] opacity-80">·</span>
                  <span className="text-[10.5px] font-medium opacity-90">{CITY_STATUS_LABEL[c.status]}</span>
                  <MoreHorizontal size={12} />
                </button>
                {openCity === c.id && (
                  <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-card shadow-xl">
                    {(["active", "waitlist", "unavailable"] as CityStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={() => onUpdateCity(c.id, s)}
                        className={cn(
                          "block w-full px-3 py-2 text-left text-[12px] transition-colors",
                          c.status === s ? "bg-violet-500/10 text-violet-200" : "text-fg-muted hover:bg-white/[0.03] hover:text-fg",
                        )}
                      >
                        {CITY_STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={() => onRemoveCity(c.id)}
                      className="block w-full border-t border-line/60 px-3 py-2 text-left text-[12px] text-rose-300 transition-colors hover:bg-rose-500/10"
                    >
                      Șterge oraș
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line bg-card-2/40 px-3 py-1.5 text-[12.5px] font-semibold text-fg-muted hover:border-violet-500/50 hover:text-violet-200"
            >
              + Adaugă oraș
            </button>
          </div>
        </div>

        {/* PLATFORME */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim">
            <Layers size={11} />
            Platforme integrate
          </div>
          <div className="space-y-2">
            {(Object.keys(PLATFORM_LABEL) as PlatformKey[]).map((k) => {
              const on = platforms[k] === "active";
              return (
                <div
                  key={k}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                    on ? "border-violet-500/40 bg-violet-500/[0.06]" : "border-line/60 bg-card-2/40",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <PlatformLogo platform={k} size={34} rounded="lg" />
                    <div className="leading-tight">
                      <div className="text-[13px] font-semibold text-fg">{PLATFORM_LABEL[k]}</div>
                      <div className="text-[11px] text-fg-muted">
                        {on ? "Activă" : "Inactivă"}
                      </div>
                    </div>
                  </div>
                  <Switch checked={on} onChange={(v) => onTogglePlatform(k, v)} ariaLabel={PLATFORM_LABEL[k]} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t border-line/60 bg-card-2/40 px-5 py-3 text-[11.5px] text-fg-muted">
        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
          <Info size={12} />
        </span>
        <div>
          Aceste date sunt folosite în recrutare, activări și dashboard.
        </div>
      </div>

      {/* Add city dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Adaugă oraș">
        <input
          type="text"
          autoFocus
          value={newCityName}
          onChange={(e) => setNewCityName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submitCity(); }}
          placeholder="Ex: Brașov"
          className="h-10 w-full rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
        />
        <DialogFooter>
          <button type="button" onClick={() => setAddOpen(false)} className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover">Anulează</button>
          <button type="button" onClick={submitCity} className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500">
            Adaugă
          </button>
        </DialogFooter>
      </Dialog>
    </section>
  );
}

// unused-import guards
void Package;
