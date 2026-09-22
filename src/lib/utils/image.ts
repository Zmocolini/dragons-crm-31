/**
 * Resize + compress imagine pe canvas → dataUrl.
 * Reduce imaginea la max maxSize × maxSize (păstrează aspect ratio).
 *
 * Default: JPEG cu quality 0.75 → foarte mic (30-100 KB pentru o poză 4000×3000).
 * Pentru logo-uri (mici, transparent), folosește `format: "png"`.
 */
export function resizeImageFile(
  file: File,
  maxSize: number,
  opts: { format?: "jpeg" | "png"; quality?: number } = {},
): Promise<string> {
  const format = opts.format ?? "jpeg";
  const quality = opts.quality ?? 0.75;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nu s-a putut citi fișierul."));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("Fișierul nu e o imagine validă."));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas indisponibil.")); return; }
        // Fundal alb pentru JPEG (nu suportă transparent).
        if (format === "jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        const mime = format === "jpeg" ? "image/jpeg" : "image/png";
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
