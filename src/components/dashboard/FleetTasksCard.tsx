"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, Check, CircleDot, KeyRound, Pencil, Play, Plus, Ticket } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils/cn";
import {
  TASK_KIND_LABEL, TASK_PRIORITY_LABEL, TASK_STATUS_LABEL,
  type FleetTask, type FleetTaskKind, type FleetTaskPriority, type UrgentItem,
} from "@/lib/tasks/types";

const KIND_ICON: Record<FleetTaskKind, typeof Ticket> = { activation: KeyRound, transfer: ArrowRightLeft, ticket: Ticket, other: CircleDot };
const PRIORITY_TONE: Record<FleetTaskPriority, "danger" | "warn" | "neutral"> = { urgent: "danger", high: "warn", normal: "neutral" };
const inp = "w-full rounded-md border border-line bg-card-2 px-2.5 py-1.5 text-[12.5px] text-fg";

type Draft = { kind: FleetTaskKind; title: string; details: string; priority: FleetTaskPriority; courierId: string };
const EMPTY: Draft = { kind: "activation", title: "", details: "", priority: "normal", courierId: "" };

type Props = {
  items: UrgentItem[];
  couriers: { id: string; name: string }[];
  isOwner: boolean;
  onAdd: (d: Omit<Draft, "courierId"> & { courierId?: string; courierName?: string }) => void;
  onUpdate: (id: string, patch: Partial<FleetTask>) => void;
};

const ago = (days: number) => (days === 0 ? "azi" : days === 1 ? "de ieri" : `de ${days} zile`);

/** Top urgențe de flotă: task-uri ridicate de subcontractori + alerte automate; editabile pe loc. */
export function FleetTasksCard({ items, couriers, isOwner, onAdd, onUpdate }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const shown = showAll ? items : items.slice(0, 5);
  const courierName = useMemo(() => new Map(couriers.map((c) => [c.id, c.name])), [couriers]);

  const openNew = () => { setDraft(EMPTY); setEditing("new"); };
  const openEdit = (t: FleetTask) => { setDraft({ kind: t.kind, title: t.title, details: t.details, priority: t.priority, courierId: t.courierId ?? "" }); setEditing(t.id); };
  const save = () => {
    const title = draft.title.trim();
    if (!title) return;
    const courier = draft.courierId ? { courierId: draft.courierId, courierName: courierName.get(draft.courierId) } : { courierId: undefined, courierName: undefined };
    if (editing === "new") onAdd({ ...draft, title, ...courier });
    else if (editing) onUpdate(editing, { kind: draft.kind, title, details: draft.details.trim(), priority: draft.priority, ...courier });
    setEditing(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Urgențe flotă</CardTitle>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-fg hover:bg-white/[0.05]">
          <Plus size={13} /> Task nou
        </button>
      </CardHeader>
      <CardBody className="space-y-2">
        {editing && (
          <div className="space-y-2 rounded-lg border border-violet-500/40 bg-violet-500/[0.06] p-3">
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Tip" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as FleetTaskKind })} className={inp}>
                {(Object.keys(TASK_KIND_LABEL) as FleetTaskKind[]).map((k) => <option key={k} value={k}>{TASK_KIND_LABEL[k]}</option>)}
              </select>
              <select aria-label="Prioritate" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as FleetTaskPriority })} className={inp}>
                {(Object.keys(TASK_PRIORITY_LABEL) as FleetTaskPriority[]).map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <input aria-label="Titlu" autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="ex. Activare cont Glovo pentru Ion" className={inp} maxLength={140} />
            <select aria-label="Curier" value={draft.courierId} onChange={(e) => setDraft({ ...draft, courierId: e.target.value })} className={inp}>
              <option value="">Fără curier anume</option>
              {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea aria-label="Detalii" value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} rows={2} placeholder={draft.kind === "transfer" ? "De unde → unde (oraș, platformă, cazare)" : "Detalii pentru owner"} className={inp} maxLength={1000} />
            <div className="flex gap-2">
              <button type="button" onClick={save} disabled={!draft.title.trim()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"><Check size={13} /> {editing === "new" ? "Trimite" : "Salvează"}</button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-fg-muted hover:text-fg">Anulează</button>
            </div>
          </div>
        )}

        {items.length === 0 && !editing && (
          <div className="rounded-lg border border-line/50 bg-card-2/40 p-3 text-center text-[12px] text-fg-muted">
            ✓ Nicio urgență deschisă. {isOwner ? "Subcontractorii pot ridica task-uri de aici." : "Ridică un task către owner cu „Task nou”."}
          </div>
        )}

        <ul className="divide-y divide-line/40">
          {shown.map((it) => it.source === "auto" ? (
            <li key={it.id} className="flex items-start gap-3 py-2">
              <AlertTriangle size={15} className={cn("mt-0.5 shrink-0", it.days >= 10 ? "text-rose-400" : "text-amber-400")} />
              <div className="min-w-0 flex-1">
                <Link href={`/curieri/${it.courierId}`} className="block truncate text-[12.5px] font-medium text-fg hover:underline">{it.courierName} — {it.statusLabel.toLowerCase()} {ago(it.days)}</Link>
                <div className="text-[11px] text-fg-dim">Alertă automată · se închide când curierul trece în alt status</div>
              </div>
              <Badge tone={it.days >= 10 ? "danger" : "warn"} className="shrink-0">Automat</Badge>
            </li>
          ) : (
            <TaskRow key={it.id} task={it.task} days={it.days} isOwner={isOwner} onEdit={() => openEdit(it.task)} onUpdate={onUpdate} />
          ))}
        </ul>

        {items.length > 5 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full rounded-lg py-1.5 text-[12px] font-medium text-violet-300 hover:text-violet-200">
            {showAll ? "Arată doar top 5" : `Arată toate (${items.length})`}
          </button>
        )}
      </CardBody>
    </Card>
  );
}

function TaskRow({ task, days, isOwner, onEdit, onUpdate }: { task: FleetTask; days: number; isOwner: boolean; onEdit: () => void; onUpdate: Props["onUpdate"] }) {
  const Icon = KIND_ICON[task.kind];
  return (
    <li className="flex items-start gap-3 py-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-violet-300" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium text-fg" title={task.details || task.title}>{task.title}</div>
        <div className="truncate text-[11px] text-fg-dim">
          {TASK_KIND_LABEL[task.kind]}{isOwner ? ` · ${task.raisedBy}` : ""}{task.courierName ? ` · ${task.courierName}` : ""} · {ago(days)} · {TASK_STATUS_LABEL[task.status]}
        </div>
      </div>
      <Badge tone={PRIORITY_TONE[task.priority]} className="shrink-0">{TASK_PRIORITY_LABEL[task.priority]}</Badge>
      <div className="flex shrink-0 gap-1">
        {task.status === "open" && (
          <IconBtn label="Preia (în lucru)" onClick={() => onUpdate(task.id, { status: "in_progress" })}><Play size={11} /></IconBtn>
        )}
        <IconBtn label="Marchează rezolvat" onClick={() => onUpdate(task.id, { status: "resolved" })}><Check size={11} /></IconBtn>
        <IconBtn label="Editează" onClick={onEdit}><Pencil size={11} /></IconBtn>
      </div>
    </li>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex h-6 w-6 items-center justify-center rounded border border-line text-fg-muted hover:bg-white/[0.06] hover:text-fg">
      {children}
    </button>
  );
}

