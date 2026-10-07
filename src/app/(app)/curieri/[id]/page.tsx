"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowLeft, Bike, Car, Check, ChevronLeft, ChevronRight, Copy, FileText, Home, Key, Mail, MapPin, Pencil, Percent, Phone, Trash2, Upload, X, Zap,
} from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { CourierAvatar, StatusDot } from "@/components/reports/bits";
import { useSession } from "@/lib/rbac/session";
import { useCouriers } from "@/lib/couriers/context";
import { useDocuments } from "@/lib/documents/context";
import { buildCourierRow, COURIER_DOC_STATUS_LABEL } from "@/lib/documents/rules";
import { DOCUMENT_TYPE_LABEL } from "@/lib/documents/types";
import { cn } from "@/lib/utils/cn";
import { NATIONALITY_LABEL } from "@/lib/candidates/types";
import { VEHICLE_TYPE_LABEL, VEHICLE_OWNERSHIP_LABEL, collaborationLabel, type VehicleType } from "@/lib/couriers/types";
import { EditCourierDialog } from "@/components/couriers/EditCourierDialog";
import { UploadDocumentDialog } from "@/components/dashboard/dialogs/UploadDocumentDialog";
import { CourierDocumentsSection } from "@/components/couriers/CourierDocumentsSection";

// Hub central curier (Etapa 8): agregă din TOATE modulele prin courierId — o singură
// identitate. Deep-link-urile „Deschide profil" din orice modul ajung aici.
export default function CourierProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { activeFleetId, can, user } = useSession();
  const isSubcontractor = user.role === "subcontractor_owner";
  const toast = useToast();
  const { allRows, deleteCourier, updateCourier } = useCouriers();
  const canDelete = can("couriers.create");
  const canEdit = can("couriers.edit");
  const canUpload = can("documents.upload");
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { documentsForSubject } = useDocuments();

  const fleetCouriers = useMemo(() => allRows.filter((c) => c.tenantId === activeFleetId), [allRows, activeFleetId]);
  const courier = useMemo(() => fleetCouriers.find((c) => c.id === id) ?? null, [fleetCouriers, id]);

  const data = useMemo(() => {
    if (!courier) return null;
    const docs = documentsForSubject(id);
    const docRow = buildCourierRow(courier, docs);
    return { docs, docRow };
  }, [courier, id, documentsForSubject]);

  if (!courier || !data) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-line bg-card p-6 text-center">
          <div className="text-[15px] font-bold text-fg">Curier inexistent</div>
          <p className="mt-2 text-[12.5px] text-fg-muted">Nu există un curier cu acest ID în flota activă.</p>
          <Link href="/curieri" className="mt-3 inline-block text-[12.5px] font-medium text-[color:var(--color-info)] hover:underline">← Înapoi la Curieri</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[1200px] flex-col gap-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push("/curieri")} className="inline-flex w-fit items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg"><ArrowLeft size={14} /> Înapoi la curieri</button>
        <div className="flex items-center gap-2">
          {canUpload && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
            >
              <Upload size={13} /> Adaugă document
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:from-violet-500 hover:to-blue-500"
            >
              <Pencil size={13} /> Editează
            </button>
          )}
          {canDelete && (!isSubcontractor || courier.status !== "active") && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Ștergi definitiv curierul „${courier.fullName}"? Această acțiune ascunde curierul din toate modulele.`)) {
                  deleteCourier(courier.id);
                  router.push("/curieri");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[12.5px] font-medium text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 size={13} /> Șterge curier
            </button>
          )}
        </div>
      </div>

      {courier.status === "pending" && (
        isSubcontractor ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-[12.5px] text-amber-200">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
            <span>Acest curier este <b>în așteptare</b> pentru confirmarea și activarea de către flotă. Odată confirmat, va apărea ca Activ.</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
              </span>
              <div>
                <div className="text-[13.5px] font-bold text-amber-100">
                  Curier în așteptare aprobare flotă
                </div>
                <div className="text-[12px] text-amber-200/80">
                  Subcontractorul a propus acest curier. Confirmi activarea sau îl respingi?
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  updateCourier(courier.id, { status: "active" });
                  toast.success("Curier aprobat și activat", courier.fullName);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow hover:bg-emerald-500"
              >
                <Check size={14} /> Activează curier
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCourier(courier.id, { status: "rejected" });
                  toast.error("Curier marcat ca respins", courier.fullName);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/20 px-3.5 py-1.5 text-[12.5px] font-semibold text-rose-200 hover:bg-rose-500/30"
              >
                <X size={14} /> Respinge
              </button>
            </div>
          </div>
        )
      )}

      {editOpen && <EditCourierDialog row={courier} onClose={() => setEditOpen(false)} />}
      {uploadOpen && <UploadDocumentDialog open onClose={() => setUploadOpen(false)} prefillSubjectId={courier.id} />}

      {/* Header profil */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          {courier.avatarUrl ? (
            <span className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full border border-line">
              <Image src={courier.avatarUrl} alt={courier.fullName} fill sizes="60px" className="object-cover" unoptimized />
            </span>
          ) : (
            <CourierAvatar name={courier.fullName} size={60} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="select-all cursor-text text-[22px] font-bold text-fg">{courier.fullName}</h1>
              <StatusDot status={courier.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5"><Phone size={13} className="text-fg-dim" /> <span className="select-all cursor-text">{courier.phone}</span></span>
              {courier.email && <span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-fg-dim" /> <span className="select-all cursor-text">{courier.email}</span></span>}
              <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="text-fg-dim" /> <span className="select-all cursor-text">{courier.city}</span></span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {courier.platforms.map((p) => <Badge key={p} tone={p as "bolt"}>{p}</Badge>)}
              <span className="rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] text-fg-muted">{NATIONALITY_LABEL[courier.nationality]}</span>
              <span className="rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] text-fg-muted">{collaborationLabel(courier.collaboration)}</span>
              <span className="rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] text-fg-muted">#{courier.id.toUpperCase()}</span>
            </div>
          </div>
          {can("subcontractors.view") && (
            <div className="text-right">
              <div className="text-[11px] text-fg-dim">Subcontractor</div>
              <div className="text-[13px] font-semibold text-fg">{courier.subcontractorName ?? "Flotă directă"}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Grid date curier */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Date personale */}
        <Card>
          <CardHeader>
            <CardTitle><span className="inline-flex items-center gap-2"><Phone size={15} className="text-[color:var(--color-accent-3)]" /> Date personale</span></CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-2 text-[12.5px]">
              <InfoRow label="Nume complet" value={courier.fullName} copyable />
              <InfoRow label="Telefon" value={courier.phone || "—"} copyable={!!courier.phone} />
              <InfoRow label="Email" value={courier.email || "—"} copyable={!!courier.email} />
              <InfoRow label="Naționalitate" value={NATIONALITY_LABEL[courier.nationality]} />
              <InfoRow label="Oraș" value={courier.city} copyable />
              <InfoRow label="IBAN" value={courier.iban || "—"} mono copyable={!!courier.iban} />
            </dl>
          </CardBody>
        </Card>

        {/* Contract & Vehicul */}
        <Card>
          <CardHeader>
            <CardTitle><span className="inline-flex items-center gap-2"><Percent size={15} className="text-[color:var(--color-accent-3)]" /> Contract și vehicul</span></CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-2 text-[12.5px]">
              <InfoRow label="Tip colaborare" value={collaborationLabel(courier.collaboration)} copyable />
              <InfoRow label="Comision flotă" value={`${courier.commissionPct ?? 10}%`} copyable />
              <InfoRow label="Platforme" copyValue={courier.platforms.join(", ") || undefined} valueNode={
                <div className="flex flex-wrap gap-1">
                  {courier.platforms.length > 0
                    ? courier.platforms.map((p) => <Badge key={p} tone={p as "bolt"}>{p}</Badge>)
                    : <span className="text-fg-dim">—</span>}
                </div>
              } />
              <InfoRow label="Vehicul" copyValue={VEHICLE_TYPE_LABEL[courier.vehicleType]} valueNode={
                <span className="inline-flex items-center gap-1.5">
                  <VehicleIcon type={courier.vehicleType} />
                  {VEHICLE_TYPE_LABEL[courier.vehicleType]}
                </span>
              } />
              <InfoRow label="Tip vehicul" copyValue={VEHICLE_OWNERSHIP_LABEL[courier.vehicleOwnership]} valueNode={
                <span className="inline-flex items-center gap-1.5">
                  {courier.vehicleOwnership === "own" ? <Home size={12} className="text-fg-dim" /> : <Key size={12} className="text-fg-dim" />}
                  {VEHICLE_OWNERSHIP_LABEL[courier.vehicleOwnership]}
                </span>
              } />
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Documente cu preview vizual */}
      <DocumentsGallery
        courierId={id}
        docs={data.docs}
        badge={COURIER_DOC_STATUS_LABEL[data.docRow.status]}
      />
    </div>
  );
}

type DocItem = {
  id: string;
  name: string;
  type: string;
  url: string | null;
  docType: string;
  expiryIso: string | null;
};

function DocumentsGallery({ courierId, docs, badge }: { courierId: string; docs: Array<{ id: string; file: { name: string; type: string; objectUrl: string | null }; type: string; expiryIso: string | null }>; badge: string }) {
  const [lightbox, setLightbox] = useState<{ items: DocItem[]; index: number } | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.items.length } : lb);
      if (e.key === "ArrowLeft") setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.items.length) % lb.items.length } : lb);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  const items: DocItem[] = docs.map((d) => ({
    id: d.id, name: d.file.name, type: d.file.type, url: d.file.objectUrl,
    docType: DOCUMENT_TYPE_LABEL[d.type as keyof typeof DOCUMENT_TYPE_LABEL] ?? d.type,
    expiryIso: d.expiryIso,
  }));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle><span className="inline-flex items-center gap-2"><FileText size={15} className="text-[color:var(--color-accent-3)]" /> Documente</span></CardTitle>
          <span className="text-[11.5px] font-medium text-fg-muted">{items.length} {items.length === 1 ? "document" : "documente"}</span>
        </CardHeader>
        <CardBody>
          {items.length === 0 ? (
            <div className="py-2 text-[12px] text-fg-dim">Niciun document încărcat.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item, i) => {
                const isImage = item.type.startsWith("image/");
                const canPreview = !!item.url;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => canPreview && setLightbox({ items, index: i })}
                    disabled={!canPreview}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-lg border border-line bg-card-2 transition-colors",
                      canPreview ? "hover:border-violet-500/40" : "cursor-not-allowed opacity-60",
                    )}
                    title={item.name}
                  >
                    {isImage && item.url ? (
                      <Image src={item.url} alt="" fill sizes="200px" className="object-cover transition-transform group-hover:scale-105" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center text-fg-dim">
                        <FileText size={36} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Documente + poze stocate în Cloudflare R2 (persistent, safe) */}
      <CourierDocumentsSection courierId={courierId} />

      {lightbox && typeof document !== "undefined" && createPortal(
        (() => {
          const cur = lightbox.items[lightbox.index];
          const isImg = cur.type.startsWith("image/");
          return (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
              onClick={() => setLightbox(null)}
            >
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Închide"
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X size={18} />
              </button>
              {lightbox.items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.items.length) % lb.items.length } : lb); }}
                    aria-label="Anterior"
                    className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.items.length } : lb); }}
                    aria-label="Următorul"
                    className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
              <div className="relative flex max-h-[92vh] max-w-[92vw] flex-col" onClick={(e) => e.stopPropagation()}>
                {isImg && cur.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cur.url} alt={cur.name} className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" />
                ) : cur.url ? (
                  <iframe src={cur.url} title={cur.name} className="h-[85vh] w-[90vw] rounded-lg border border-white/20 bg-white" />
                ) : (
                  <div className="rounded-lg bg-card p-8 text-center text-fg-muted">Preview indisponibil</div>
                )}
                <div className="mt-2 text-center text-[12.5px] text-white select-all cursor-text">
                  {cur.name}{lightbox.items.length > 1 && ` (${lightbox.index + 1}/${lightbox.items.length})`}
                </div>
              </div>
            </div>
          );
        })(),
        document.body,
      )}
    </>
  );
}

function InfoRow({ label, value, valueNode, mono, copyable, copyValue }: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
  copyable?: boolean;
  /** Text de copiat dacă e diferit de `value` (util pentru valueNode custom). */
  copyValue?: string;
}) {
  const [copied, setCopied] = useState(false);
  const textToCopy = copyValue ?? value ?? "";
  const canCopy = (copyable || copyValue) && textToCopy && textToCopy !== "—";

  async function copy() {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: select + document.execCommand
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-line/40 bg-card-2/40 px-3 py-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("min-w-0 truncate text-right text-[12.5px] text-fg select-all cursor-text", mono && "font-mono tracking-wider")}>{valueNode ?? value}</span>
        {canCopy && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copiază ${label}`}
            title={copied ? "Copiat" : "Copiază"}
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line/60 bg-card transition-colors",
              copied ? "text-emerald-300" : "text-fg-dim hover:bg-card-hover hover:text-fg",
            )}
          >
            {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}

function VehicleIcon({ type }: { type: VehicleType }) {
  if (type === "car") return <Car size={12} className="text-fg-dim" />;
  if (type === "e_bike") return <Zap size={12} className="text-fg-dim" />;
  return <Bike size={12} className="text-fg-dim" />;
}

function PhotoGallery({ images }: { images: Array<{ id: string; url: string; name: string }> }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => i === null ? 0 : (i + 1) % images.length);
      if (e.key === "ArrowLeft") setLightboxIdx((i) => i === null ? 0 : (i - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxIdx, images.length]);

  if (images.length === 0) return null;

  const current = lightboxIdx !== null ? images[lightboxIdx] : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle><span className="inline-flex items-center gap-2"><FileText size={15} className="text-[color:var(--color-accent-3)]" /> Galerie foto</span></CardTitle>
          <span className="text-[11.5px] text-fg-muted">{images.length} {images.length === 1 ? "imagine" : "imagini"}</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, 9).map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIdx(i)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-card-2"
                title={img.name}
              >
                <Image src={img.url} alt={img.name} fill sizes="120px" className="object-cover transition-transform group-hover:scale-105" unoptimized />
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-fg-dim">Click pe imagine → se deschide aici, pe pagină.</p>
        </CardBody>
      </Card>

      {current && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Închide"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X size={18} />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i === null ? 0 : (i - 1 + images.length) % images.length); }}
                aria-label="Anterior"
                className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => i === null ? 0 : (i + 1) % images.length); }}
                aria-label="Următorul"
                className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
          <div className="relative max-h-[90vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.name} className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" />
            <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-3 text-center text-[12.5px] text-white">
              {current.name}{images.length > 1 && ` (${(lightboxIdx ?? 0) + 1}/${images.length})`}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function HubCard({ title, icon: Icon, href, badge, children }: { title: string; icon: typeof Car; href: string; badge?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle><span className="inline-flex items-center gap-2"><Icon size={15} className="text-[color:var(--color-accent-3)]" /> {title}</span></CardTitle>
        <Link href={href} className="text-[11.5px] font-medium text-[color:var(--color-info)] hover:underline">Deschide modul →</Link>
      </CardHeader>
      <CardBody>
        {badge && <div className="mb-2 inline-flex rounded-md border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] text-fg-muted">{badge}</div>}
        {children}
      </CardBody>
    </Card>
  );
}
function Empty({ text }: { text: string }) { return <div className="py-2 text-[12px] text-fg-dim">{text}</div>; }
