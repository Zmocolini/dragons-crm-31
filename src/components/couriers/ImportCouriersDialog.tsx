"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp } from "lucide-react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
};

const REQUIRED_COLUMNS = [
  { key: "fullName", label: "Nume complet", required: true },
  { key: "phone",    label: "Telefon",      required: true },
  { key: "email",    label: "E-mail",       required: false },
  { key: "city",     label: "Oraș",         required: true },
  { key: "platforms",label: "Platforme (bolt|wolt|glovo separate cu ;)", required: true },
  { key: "vehicle",  label: "Vehicul (bike|e_bike|scooter|car)", required: true },
];

export function ImportCouriersDialog({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const toast = useToast();

  const reset = () => setFile(null);

  const handleConfirm = () => {
    // TODO(real-users): POST multipart /api/couriers/import → server validează pe rând,
    // detectează duplicate, creează Audit Log, apoi întoarce raport per linie.
    toast.info("Import — necesită backend", "Fluxul UI e complet; parsarea și validarea rulează pe server (roadmap).");
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} title="Import curieri" description="Încarcă un fișier Excel sau CSV. Vom valida coloanele, verifica duplicate pe telefon și cere confirmare înainte de salvare." size="lg">
      <div className="space-y-4">
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            file ? "border-emerald-400/60 bg-emerald-500/[0.05]" : "border-line hover:border-indigo-400/60 hover:bg-indigo-500/[0.03]",
          )}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <FileUp size={22} className={file ? "text-emerald-400" : "text-fg-dim"} />
          {file ? (
            <>
              <div className="text-[13px] font-semibold text-fg">{file.name}</div>
              <div className="text-[11.5px] text-fg-muted">
                {(file.size / 1024).toFixed(1)} KB — click pentru a schimba fișierul
              </div>
            </>
          ) : (
            <>
              <div className="text-[13px] font-semibold text-fg">Click pentru a alege fișier</div>
              <div className="text-[11.5px] text-fg-muted">Acceptă .csv, .xlsx, .xls — maxim 10 MB</div>
            </>
          )}
        </label>

        <div>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-fg-dim">
            Coloane necesare
          </div>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {REQUIRED_COLUMNS.map((c) => (
              <li key={c.key} className="flex items-start gap-2 rounded-lg bg-card-2/50 px-2.5 py-2">
                <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-fg">
                    {c.label} {c.required && <span className="text-rose-400">*</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-[11.5px] text-amber-100/90">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            După încărcare vom afișa o previzualizare cu primele 20 de rânduri și erorile detectate.
            Nimic nu se salvează până nu confirmi explicit.
          </span>
        </div>
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={() => { reset(); onClose(); }}
          className="rounded-lg border border-line bg-transparent px-3 py-1.5 text-[12.5px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          Anulează
        </button>
        <button
          type="button"
          disabled={!file}
          onClick={handleConfirm}
          className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white shadow-lg shadow-indigo-900/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analizează fișierul
        </button>
      </DialogFooter>
    </Dialog>
  );
}
