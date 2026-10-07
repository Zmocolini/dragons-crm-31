"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  X,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useCouriers } from "@/lib/couriers/context";
import { useDocuments } from "@/lib/documents/context";
import type { CourierRow } from "@/lib/couriers/mock-seed";
import { cn } from "@/lib/utils/cn";

type RemoteDoc = {
  id: number;
  courierId: string;
  docType: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedAtIso: string;
  url?: string;
};

const DOC_LABEL: Record<string, string> = {
  ci: "Buletin / Carte de identitate",
  buletin: "Buletin / Carte de identitate",
  permis: "Permis de conducere",
  contract: "Contract colaborare",
  medical: "Certificat medical",
  asigurare: "Asigurare",
  foto: "Poză profil",
  alt: "Document",
};

export function CourierDocsInspectionModal({
  courier,
  open,
  onClose,
  onActivated,
  onRejected,
}: {
  courier: CourierRow;
  open: boolean;
  onClose: () => void;
  onActivated?: () => void;
  onRejected?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { updateCourier } = useCouriers();
  const { documentsForSubject } = useDocuments();

  const [remoteDocs, setRemoteDocs] = useState<RemoteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Documente locale (mock/seed/client)
  const localDocs = documentsForSubject(courier.id);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/documents?courierId=${encodeURIComponent(courier.id)}`)
      .then((r) => r.json())
      .then(async (j) => {
        const rawDocs: RemoteDoc[] = j.documents ?? [];
        // Preia URL-urile semnate pentru fiecare document pentru previzualizare imagini
        const withUrls = await Promise.all(
          rawDocs.map(async (doc) => {
            try {
              const res = await fetch(`/api/documents/${doc.id}`);
              const item = await res.json();
              return { ...doc, url: item.url };
            } catch {
              return doc;
            }
          }),
        );
        setRemoteDocs(withUrls);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, courier.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxUrl) setLightboxUrl(null);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, lightboxUrl]);

  if (!open || typeof document === "undefined") return null;

  const handleActivate = () => {
    updateCourier(courier.id, { status: "active" });
    toast.success("Curier aprobat și activat!", courier.fullName);
    onActivated?.();
    onClose();
  };

  const handleReject = () => {
    updateCourier(courier.id, { status: "rejected" });
    toast.error("Curier marcat ca respins", courier.fullName);
    onRejected?.();
    onClose();
  };

  const handleGoToFullProfile = () => {
    onClose();
    router.push(`/curieri/${courier.id}`);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-5 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative my-4 flex w-full max-w-2xl max-h-[92vh] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4 bg-card-2/40">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-[15px] font-bold text-white shadow">
              {courier.fullName.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="truncate text-[16px] font-bold text-fg">{courier.fullName}</h2>
                <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  În așteptare activare
                </span>
              </div>
              <p className="text-[11.5px] text-fg-dim">
                Verifică datele de contact și documentele (buletin, permis) înainte de activare.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-dim hover:bg-white/[0.06] hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corp modal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Date de contact & identificare */}
          <div className="rounded-xl border border-line bg-card-2/40 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-fg-dim mb-3">
              Date contact și detalii colaborare
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
              <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-card p-2.5">
                <Phone size={15} className="text-sky-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] text-fg-dim">Număr de contact</div>
                  <div className="font-mono font-semibold text-fg truncate">
                    {courier.phone || "Lipsă telefon"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-card p-2.5">
                <Mail size={15} className="text-violet-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] text-fg-dim">Adresă email</div>
                  <div className="font-medium text-fg truncate">
                    {courier.email || "Lipsă email"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-card p-2.5">
                <MapPin size={15} className="text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] text-fg-dim">Oraș / Naționalitate</div>
                  <div className="font-medium text-fg truncate">
                    {courier.city || "—"} ({courier.nationality || "RO"})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-line/60 bg-card p-2.5">
                <Zap size={15} className="text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] text-fg-dim">Platforme & Vehicul</div>
                  <div className="font-medium text-fg truncate capitalize">
                    {courier.platforms.join(", ") || "—"} · {courier.vehicleType}
                  </div>
                </div>
              </div>
            </div>

            {courier.iban && (
              <div className="mt-3 rounded-lg border border-line/60 bg-card px-3 py-2 text-[12px]">
                <span className="text-[10.5px] text-fg-dim block">IBAN plată:</span>
                <span className="font-mono font-semibold text-fg tracking-wider">
                  {courier.iban}
                </span>
              </div>
            )}
          </div>

          {/* 2. Documente și Poze (Buletin / CI, permis, etc.) */}
          <div className="rounded-xl border border-line bg-card-2/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-fg-dim">
                Documente încărcate (Buletin / Permis / Contract)
              </div>
              <button
                type="button"
                onClick={handleGoToFullProfile}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-violet-300 hover:text-violet-200"
              >
                Deschide profil complet <ExternalLink size={12} />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-[12px] text-fg-muted">
                Se încarcă documentele și pozele...
              </div>
            ) : remoteDocs.length === 0 && localDocs.length === 0 ? (
              <div className="rounded-xl border border-line/70 bg-card p-6 text-center text-[12.5px] text-fg-muted space-y-2">
                <FileText size={28} className="mx-auto text-fg-dim opacity-60" />
                <div className="font-semibold text-fg">Niciun document atașat încă</div>
                <p className="text-[11.5px] text-fg-dim max-w-sm mx-auto">
                  Subcontractorul nu a încărcat încă poza buletinului sau fișierele prin formular.
                  Poți activa curierul oricum sau îi poți cere să atașeze buletinul.
                </p>
                <button
                  type="button"
                  onClick={handleGoToFullProfile}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[11.5px] font-semibold text-fg hover:bg-white/[0.06]"
                >
                  Încarcă document din profil
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Documente din R2/Server */}
                {remoteDocs.map((doc) => {
                  const isImage = doc.contentType?.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(doc.filename);
                  return (
                    <div
                      key={`remote-${doc.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-violet-500/40"
                    >
                      {/* Previzualizare imagine */}
                      {isImage && doc.url ? (
                        <div
                          className="relative h-44 w-full bg-black/40 cursor-pointer overflow-hidden"
                          onClick={() => setLightboxUrl(doc.url!)}
                          title="Apasă pentru mărire la rezoluție maximă"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={doc.url}
                            alt={doc.filename}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="rounded-lg bg-black/75 px-3 py-1.5 text-[12px] font-bold text-white flex items-center gap-1.5 shadow">
                              <Eye size={14} /> Mărește poza
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-36 items-center justify-center bg-card-2 text-fg-dim">
                          <FileText size={40} />
                        </div>
                      )}

                      <div className="p-3 bg-card-2/60">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-[12px] text-fg truncate">
                            {DOC_LABEL[doc.docType] || doc.docType.toUpperCase()}
                          </span>
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-violet-300 font-semibold hover:underline flex items-center gap-0.5"
                            >
                              Deschide <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div className="text-[10.5px] text-fg-dim truncate mt-0.5">
                          {doc.filename}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Documente locale/client (dacă există) */}
                {localDocs.map((doc) => {
                  const url = doc.file.objectUrl;
                  const isImage = doc.file.type.startsWith("image/");
                  return (
                    <div
                      key={`local-${doc.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-violet-500/40"
                    >
                      {isImage && url ? (
                        <div
                          className="relative h-44 w-full bg-black/40 cursor-pointer overflow-hidden"
                          onClick={() => setLightboxUrl(url)}
                          title="Apasă pentru mărire la rezoluție maximă"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={doc.file.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="rounded-lg bg-black/75 px-3 py-1.5 text-[12px] font-bold text-white flex items-center gap-1.5 shadow">
                              <Eye size={14} /> Mărește poza
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-36 items-center justify-center bg-card-2 text-fg-dim">
                          <FileText size={40} />
                        </div>
                      )}
                      <div className="p-3 bg-card-2/60">
                        <div className="font-bold text-[12px] text-fg truncate">
                          {DOC_LABEL[doc.type] || doc.type.toUpperCase()}
                        </div>
                        <div className="text-[10.5px] text-fg-dim truncate mt-0.5">
                          {doc.file.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer cu butoane de decizie */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 bg-card-2/50">
          <button
            type="button"
            onClick={handleGoToFullProfile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3.5 py-2 text-[12px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg transition-colors"
          >
            Vezi profil complet pe pagină <ExternalLink size={13} />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/15 px-4 py-2 text-[12px] font-bold text-rose-300 hover:bg-rose-500/25 transition-colors"
            >
              <X size={14} /> Respinge
            </button>
            <button
              type="button"
              onClick={handleActivate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-[12px] font-bold text-white shadow hover:from-emerald-500 hover:to-teal-500 transition-colors"
            >
              <Check size={14} /> Activează curier
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox mărire imagine la ecran complet */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Închide previzualizarea"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X size={20} />
          </button>
          <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Document"
              className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
