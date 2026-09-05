"use client";

import { useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";

const MAX = 500;

export function EditBioDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, updateProfile, logActivity } = useProfile();
  const toast = useToast();
  const [bio, setBio] = useState(profile.bio);

  function save() {
    // TODO(real-users): server action updateBio(bio).
    updateProfile({ bio: bio.trim().slice(0, MAX) });
    logActivity("profile.update", "Bio");
    toast.success("Bio-ul a fost actualizat.");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Despre mine"
      description="O scurtă descriere despre tine și rolul tău în echipă."
      size="lg"
    >
      <textarea
        value={bio}
        maxLength={MAX}
        onChange={(e) => setBio(e.target.value)}
        rows={6}
        className="w-full resize-y rounded-lg border border-line bg-card-2 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-violet-500/60 focus:outline-none"
        placeholder="Scrie câteva rânduri despre tine…"
      />
      <div className="mt-1 flex justify-end text-[11px] text-fg-dim">
        {bio.length}/{MAX}
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-violet-500"
        >
          Salvează
        </button>
      </DialogFooter>
    </Dialog>
  );
}
