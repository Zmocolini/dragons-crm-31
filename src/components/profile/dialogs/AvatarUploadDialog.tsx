"use client";

import Image from "next/image";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { useProfile } from "@/lib/profile/context";
import { useToast } from "@/components/ui/Toast";

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export function AvatarUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setAvatar, logActivity } = useProfile();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setError("Format acceptat: PNG, JPG, WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Fișierul depășește 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function save() {
    if (!preview) {
      setError("Selectează o imagine.");
      return;
    }
    // TODO(real-users): upload la storage (S3/Turso Files) + returnează URL; până atunci data URL.
    setAvatar(preview);
    logActivity("avatar.update", fileName || "avatar");
    toast.success("Poza de profil a fost actualizată.");
    handleClose();
  }

  function handleClose() {
    setPreview(null);
    setError(null);
    setFileName("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Schimbă poza de profil"
      description="PNG, JPG sau WEBP, maximum 2 MB."
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-card-2/40 p-6">
          {preview ? (
            <Image
              src={preview}
              alt="Preview"
              width={140}
              height={140}
              className="h-[140px] w-[140px] rounded-full object-cover ring-4 ring-violet-500/30"
              unoptimized
            />
          ) : (
            <div className="flex h-[140px] w-[140px] items-center justify-center rounded-full border border-line bg-card text-fg-dim">
              <Upload size={28} />
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-3.5 py-2 text-[12.5px] font-semibold text-fg-muted hover:bg-card-hover hover:text-fg"
          >
            <Upload size={13} />
            {preview ? "Alege alt fișier" : "Alege un fișier"}
          </button>
          {fileName && (
            <div className="truncate text-[11px] text-fg-dim">{fileName}</div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
            {error}
          </div>
        )}
      </div>
      <DialogFooter>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-lg border border-line bg-card-2 px-4 py-2 text-[12.5px] font-medium text-fg-muted hover:bg-card-hover"
        >
          Anulează
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!preview}
          className="rounded-lg bg-violet-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Salvează poza
        </button>
      </DialogFooter>
    </Dialog>
  );
}
