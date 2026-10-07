"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useSession } from "@/lib/rbac/session";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";

const CONFIRM_TEXT = "STERGE CONTUL";
// Textul de confirmare e tradus în EN de translator ("DELETE ACCOUNT"), deci îl acceptăm și pe el.
const CONFIRM_TEXT_EN = "DELETE ACCOUNT";

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const { logActivity } = useProfile();
  const toast = useToast();
  const [text, setText] = useState("");

  // Global Owner unic → nu poate șterge contul
  const isSoleGlobalOwner = user.role === "global_owner";

  function del() {
    if (isSoleGlobalOwner) return;
    if (text !== CONFIRM_TEXT && text !== CONFIRM_TEXT_EN) return;
    // TODO(real-users): apelează server action deleteMyAccount() + revoke sessions + audit + redirect /login.
    logActivity("account.delete_requested", "Cerere ștergere cont");
    toast.error("Cont trimis spre ștergere", "Se activează după integrarea backend.");
    close();
  }

  function close() {
    setText("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="Șterge contul?" description="Această acțiune este permanentă.">
      {isSoleGlobalOwner ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-amber-100">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Ștergere blocată</div>
            <p className="mt-1 text-[12px] text-amber-100/80">
              Contul <strong>Global Owner</strong> nu poate fi șters cât timp este singurul
              proprietar global al platformei. Transferă proprietatea altui utilizator înainte.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-[12.5px] text-rose-100">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Acțiune ireversibilă</div>
              <p className="mt-1 text-[11.5px] text-rose-100/80">
                Toate datele tale personale, sesiunile active și preferințele vor fi șterse
                permanent.
              </p>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              Pentru confirmare scrie:{" "}
              <span className="text-rose-300">{CONFIRM_TEXT}</span>
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={CONFIRM_TEXT}
              className="mt-1 h-10 w-full rounded-lg border border-line bg-card-2 px-3 text-[13px] text-fg focus:border-rose-500/60 focus:outline-none"
            />
          </div>
        </div>
      )}
      <DialogFooter>
        <button
          type="button"
          onClick={close}
          className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover"
        >
          Anulează
        </button>
        {!isSoleGlobalOwner && (
          <button
            type="button"
            onClick={del}
            disabled={text !== CONFIRM_TEXT && text !== CONFIRM_TEXT_EN}
            className="rounded-lg bg-rose-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Șterge definitiv
          </button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
