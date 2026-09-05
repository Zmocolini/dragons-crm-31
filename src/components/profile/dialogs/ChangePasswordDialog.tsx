"use client";

import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logActivity } = useProfile();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const err: Record<string, string> = {};
    if (!current) err.current = "Introdu parola actuală.";
    if (next.length < 8) err.next = "Minim 8 caractere.";
    if (next !== confirm) err.confirm = "Parolele nu se potrivesc.";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  function save() {
    if (!validate()) return;
    // TODO(real-users): apelează Better-Auth changePassword(current, next).
    // Fresh project: nu avem auth real — logăm activity și afișăm mesaj informativ.
    logActivity("password.change", "Cerere schimbare parolă");
    toast.info(
      "Cererea a fost înregistrată",
      "Schimbarea parolei se activează după integrarea Better-Auth (backend).",
    );
    close();
  }

  function close() {
    setCurrent("");
    setNext("");
    setConfirm("");
    setErrors({});
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="Schimbă parola" description="Minim 8 caractere.">
      <div className="space-y-3">
        <PasswordField
          label="Parola actuală"
          value={current}
          onChange={setCurrent}
          visible={showCurrent}
          onToggleVisible={() => setShowCurrent((v) => !v)}
          error={errors.current}
        />
        <PasswordField
          label="Parola nouă"
          value={next}
          onChange={setNext}
          visible={showNext}
          onToggleVisible={() => setShowNext((v) => !v)}
          error={errors.next}
        />
        <PasswordField
          label="Confirmă parola nouă"
          value={confirm}
          onChange={setConfirm}
          visible={showNext}
          onToggleVisible={() => setShowNext((v) => !v)}
          error={errors.confirm}
        />
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11.5px] text-amber-200">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            În versiunea demo, schimbarea parolei este simulată. Se activează real după
            integrarea Better-Auth pe backend.
          </span>
        </div>
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={close}
          className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500"
        >
          Schimbă parola
        </button>
      </DialogFooter>
    </Dialog>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-line bg-card-2 px-3 pr-10 text-[13px] text-fg focus:border-violet-500/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Ascunde parola" : "Arată parola"}
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-fg-dim hover:bg-white/[0.05] hover:text-fg"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}
