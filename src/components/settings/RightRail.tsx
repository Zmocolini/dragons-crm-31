"use client";

import { Activity, HardDrive, Headphones, Server, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatRoDateLong } from "@/components/profile/utils";

export function RightRail() {
  const toast = useToast();

  return (
    <div className="space-y-4">
      {/* INFORMAȚII SISTEM */}
      <section className="rounded-2xl border border-line bg-card">
        <header className="border-b border-line/70 px-5 py-3.5">
          <h3 className="text-[13.5px] font-semibold text-fg">Informații sistem</h3>
        </header>
        <dl className="divide-y divide-line/40">
          <InfoRow icon={HardDrive} label="Versiune aplicație" value="v3.1.0" />
          <InfoRow
            icon={Activity}
            label="Ultima actualizare"
            value={formatRoDateLong(new Date().toISOString()).replace("Sâmbătă, ", "").replace("Luni, ", "").replace("Marți, ", "").replace("Miercuri, ", "").replace("Joi, ", "").replace("Vineri, ", "").replace("Duminică, ", "")}
          />
          <InfoRow
            icon={Shield}
            label="Mediu"
            value={
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
                Production
              </span>
            }
          />
          <InfoRow icon={Server} label="Server" value={<span className="font-mono text-[12px]">eu-central-1</span>} />
          <InfoRow icon={Activity} label="Uptime" value={<span className="font-mono text-emerald-400">99.9%</span>} />
        </dl>
      </section>

      {/* AJUTOR */}
      <section className="rounded-2xl border border-line bg-gradient-to-br from-violet-600/12 via-indigo-600/8 to-blue-600/12 p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
            <Headphones size={18} />
          </span>
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-fg">Ai nevoie de ajutor?</div>
            <p className="mt-1 text-[11.5px] text-fg-muted">
              Echipa noastră te poate ajuta cu orice problemă de configurare.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => toast.info("Cerere trimisă", "Un membru al echipei te contactează în curând.")}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:from-violet-500 hover:via-indigo-500 hover:to-blue-500"
        >
          Contactează suportul
        </button>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Icon size={14} className="shrink-0 text-fg-dim" />
      <dt className="flex-1 text-[12px] text-fg-muted">{label}</dt>
      <dd className="text-[12.5px] font-semibold text-fg">{value}</dd>
    </div>
  );
}
