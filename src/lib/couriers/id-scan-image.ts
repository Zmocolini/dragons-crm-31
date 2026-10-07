// Prelucrarea pozei unui act înainte de OCR: gri, micșorare, rotire, unghiul rândurilor de text, BMP.
// Pur (fără DOM): rulează la fel în browser și în teste (tests/id-scan.test.mts).

export type Gray = { w: number; h: number; px: Uint8Array };

export function rgbaToGray(rgba: ArrayLike<number>, w: number, h: number): Gray {
  const px = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i++, j += 4) px[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return { w, h, px };
}

/** Micșorare prin medie pe arie (fără aliasing) până la `maxSide` pe latura mare. */
export function downscale(g: Gray, maxSide: number): Gray {
  const s = maxSide / Math.max(g.w, g.h);
  if (s >= 1) return g;
  const w = Math.max(1, Math.round(g.w * s));
  const h = Math.max(1, Math.round(g.h * s));
  const px = new Uint8Array(w * h);
  const fx = g.w / w, fy = g.h / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
      let sum = 0;
      for (let yy = y0; yy < y1; yy++) {
        const row = yy * g.w;
        for (let xx = x0; xx < x1; xx++) sum += g.px[row + xx];
      }
      px[y * w + x] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return { w, h, px };
}

export function crop(g: Gray, x: number, y: number, w: number, h: number): Gray {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
  const cw = Math.max(1, Math.min(g.w - x0, Math.ceil(w))), ch = Math.max(1, Math.min(g.h - y0, Math.ceil(h)));
  const px = new Uint8Array(cw * ch);
  for (let r = 0; r < ch; r++) px.set(g.px.subarray((y0 + r) * g.w + x0, (y0 + r) * g.w + x0 + cw), r * cw);
  return { w: cw, h: ch, px };
}

/** Întinde contrastul între percentilele 1% și 99% (poze cu lumină slabă sau spălate). */
export function stretchContrast(g: Gray): Gray {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.px.length; i++) hist[g.px[i]]++;
  const cut = g.px.length * 0.01;
  let lo = 0, hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < cut; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < cut; hi--);
  if (hi - lo < 16) return g;
  const lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.max(0, Math.min(255, Math.round(((v - lo) * 255) / (hi - lo))));
  const px = new Uint8Array(g.px.length);
  for (let i = 0; i < px.length; i++) px[i] = lut[g.px[i]];
  return { w: g.w, h: g.h, px };
}

/** Median 3×3 — scoate zgomotul „sare și piper" fără să înmoaie marginile literelor. */
export function median3(g: Gray): Gray {
  const { w, h } = g;
  const px = new Uint8Array(g.px);
  const win = new Uint8Array(9);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) win[k++] = g.px[(y + dy) * w + x + dx];
      win.sort();
      px[y * w + x] = win[4];
    }
  }
  return { w, h, px };
}

/** Sferturi de tură în sensul acelor de ceas — exact, fără interpolare. */
function rotate90(g: Gray, k: number): Gray {
  if (k === 0) return g;
  const { w, h } = g;
  const W = k === 2 ? w : h, H = k === 2 ? h : w;
  const px = new Uint8Array(w * h);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = k === 1 ? y : k === 2 ? w - 1 - x : w - 1 - y;
      const sy = k === 1 ? h - 1 - x : k === 2 ? h - 1 - y : x;
      px[y * W + x] = g.px[sy * w + sx];
    }
  }
  return { w: W, h: H, px };
}

/**
 * Rotește conținutul cu `deg` grade în sensul acelor de ceas (pe ecran) și îl scalează cu `scale`.
 * Pânza crește cât să încapă tot; colțurile noi sunt albe (fundal neutru pentru OCR).
 */
export function rotate(g: Gray, deg: number, scale = 1): Gray {
  const quarter = Math.round(deg / 90);
  if (scale === 1 && Math.abs(deg - quarter * 90) < 1e-6) return rotate90(g, ((quarter % 4) + 4) % 4);
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const w = Math.max(1, Math.round((Math.abs(g.w * c) + Math.abs(g.h * s)) * scale));
  const h = Math.max(1, Math.round((Math.abs(g.w * s) + Math.abs(g.h * c)) * scale));
  const px = new Uint8Array(w * h).fill(255);
  const cx = g.w / 2, cy = g.h / 2, ox = w / 2, oy = h / 2;
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - oy) / scale;
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - ox) / scale;
      // inversa rotației: sursa = R(-a)·destinație (y în jos ⇒ unghi pozitiv = sensul acelor de ceas)
      const sx = c * dx + s * dy + cx - 0.5;
      const sy = -s * dx + c * dy + cy - 0.5;
      if (sx < 0 || sy < 0 || sx > g.w - 1 || sy > g.h - 1) continue;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, g.w - 1), y1 = Math.min(y0 + 1, g.h - 1);
      const fx = sx - x0, fy = sy - y0;
      const top = g.px[y0 * g.w + x0] * (1 - fx) + g.px[y0 * g.w + x1] * fx;
      const bot = g.px[y1 * g.w + x0] * (1 - fx) + g.px[y1 * g.w + x1] * fx;
      px[y * w + x] = top * (1 - fy) + bot * fy + 0.5;
    }
  }
  return { w, h, px };
}

/** Pixelii de „cerneală": mult mai închiși decât vecinătatea lor (prag adaptiv, imagine integrală). */
function inkPoints(g: Gray): { xs: Float32Array; ys: Float32Array } {
  const { w, h, px } = g;
  const W = w + 1;
  const integ = new Float64Array(W * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) { row += px[y * w + x]; integ[(y + 1) * W + x + 1] = integ[y * W + x + 1] + row; }
  }
  const r = Math.max(3, Math.round(Math.min(w, h) / 40));
  const xs: number[] = [], ys: number[] = [];
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1);
      const mean = (integ[y1 * W + x1] - integ[y0 * W + x1] - integ[y1 * W + x0] + integ[y0 * W + x0]) / ((y1 - y0) * (x1 - x0));
      if (mean - px[y * w + x] > Math.max(30, mean * 0.25)) { xs.push(x); ys.push(y); }
    }
  }
  // ponytail: plafon de 60k puncte prin eșantionare cu pas fix; suficient pentru profilul de proiecție
  const step = Math.max(1, Math.ceil(xs.length / 60000));
  const n = Math.ceil(xs.length / step);
  const ox = new Float32Array(n), oy = new Float32Array(n);
  for (let i = 0, j = 0; i < xs.length; i += step, j++) { ox[j] = xs[i]; oy[j] = ys[i]; }
  return { xs: ox, ys: oy };
}

/**
 * Unghiurile probabile ale rândurilor de text, în grade din [-90, 90), cel mai puternic primul.
 * `rotate(g, -unghi)` aduce rândurile orizontale — drepte sau cu susul în jos (OCR-ul decide).
 * Metoda: profilul de proiecție al pixelilor de cerneală e cel mai „ascuțit" perpendicular pe rânduri.
 */
export function textAngles(g: Gray, max = 3): number[] {
  const s = downscale(g, 640);
  const { xs, ys } = inkPoints(s);
  if (xs.length < 50) return [];
  const cx = s.w / 2, cy = s.h / 2;
  const half = Math.ceil(Math.hypot(s.w, s.h) / 2) + 1;
  const hist = new Float64Array(2 * half + 1);
  const score = (deg: number) => {
    const a = (deg * Math.PI) / 180, sn = Math.sin(a), cs = Math.cos(a);
    hist.fill(0);
    for (let i = 0; i < xs.length; i++) hist[(-(xs[i] - cx) * sn + (ys[i] - cy) * cs + half) | 0]++;
    let sum = 0;
    for (let i = 0; i < hist.length; i++) sum += hist[i] * hist[i];
    return sum;
  };
  const coarse = Array.from({ length: 180 }, (_, i) => score(i - 90));
  const peaks = coarse
    .map((v, i) => ({ i, v }))
    .filter(({ i, v }) => v >= coarse[(i + 179) % 180] && v >= coarse[(i + 1) % 180])
    .sort((a, b) => b.v - a.v);
  const out: number[] = [];
  for (const p of peaks) {
    if (out.length >= max) break;
    let best = p.i - 90, bestV = p.v;
    for (let d = -1; d <= 1.001; d += 0.1) {
      const v = score(p.i - 90 + d);
      if (v > bestV) { bestV = v; best = p.i - 90 + d; }
    }
    const norm = ((((best + 90) % 180) + 180) % 180) - 90;
    if (out.every((o) => Math.abs(((o - norm + 270) % 180) - 90) >= 8)) out.push(Math.round(norm * 10) / 10);
  }
  return out;
}

/** BMP 8 biți cu paletă de gri — format pe care tesseract.js îl citește direct, fără canvas. */
export function encodeBmp(g: Gray): Uint8Array {
  const rowSize = (g.w + 3) & ~3;
  const offset = 14 + 40 + 256 * 4;
  const size = offset + rowSize * g.h;
  const buf = new Uint8Array(size);
  const dv = new DataView(buf.buffer);
  buf[0] = 0x42; buf[1] = 0x4d;
  dv.setUint32(2, size, true);
  dv.setUint32(10, offset, true);
  dv.setUint32(14, 40, true);
  dv.setInt32(18, g.w, true);
  dv.setInt32(22, g.h, true); // pozitiv = rânduri de jos în sus
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 8, true);
  dv.setUint32(34, rowSize * g.h, true);
  dv.setUint32(46, 256, true);
  for (let i = 0; i < 256; i++) { const p = 54 + i * 4; buf[p] = buf[p + 1] = buf[p + 2] = i; }
  for (let y = 0; y < g.h; y++) buf.set(g.px.subarray(y * g.w, (y + 1) * g.w), offset + (g.h - 1 - y) * rowSize);
  return buf;
}
