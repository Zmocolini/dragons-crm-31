import assert from "node:assert/strict";
import { mrzBox, rotationCandidates, scanIdImage, type Ocr } from "../src/lib/couriers/id-scan";
import { crop, encodeBmp, rotate, textAngles, type Gray } from "../src/lib/couriers/id-scan-image";

const blank = (w: number, h: number): Gray => ({ w, h, px: new Uint8Array(w * h).fill(255) });
const fill = (g: Gray, x: number, y: number, w: number, h: number, v = 0) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g.px[yy * g.w + xx] = v;
};
const at = (g: Gray, x: number, y: number) => g.px[y * g.w + x];
/** Distanța unghiulară modulo `mod` (rândurile de text: 180°; rotațiile: 360°). */
const angDist = (a: number, b: number, mod: number) => Math.abs((((a - b) % mod) + mod * 1.5) % mod - mod / 2);

// ── rotate: sferturi exacte, în sensul acelor de ceas ───────────────────────
// 0 1 2 3
// 4 5 6 7
// 8 9 10 11
const g: Gray = { w: 4, h: 3, px: Uint8Array.from({ length: 12 }, (_, i) => i) };
const r90 = rotate(g, 90);
assert.deepEqual([r90.w, r90.h], [3, 4]);
assert.deepEqual([...r90.px], [8, 4, 0, 9, 5, 1, 10, 6, 2, 11, 7, 3], "90° în sensul acelor: stânga-jos ajunge sus-stânga");
assert.deepEqual([...rotate(g, 180).px], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
assert.deepEqual([...rotate(g, -90).px], [3, 7, 11, 2, 6, 10, 1, 5, 9, 0, 4, 8]);
assert.deepEqual([...rotate(g, 360).px], [...g.px]);
// unghi oarecare: dus-întors păstrează conținutul din centru
const big = blank(120, 80);
fill(big, 50, 30, 20, 20);
const back = rotate(rotate(big, 33), -33);
assert.ok(at(back, Math.floor(back.w / 2), Math.floor(back.h / 2)) < 60, "centrul rămâne negru după ±33°");
// mărire
assert.deepEqual([rotate(big, 0, 2).w, rotate(big, 0, 2).h], [240, 160]);
assert.deepEqual(crop(big, 50, 30, 20, 20).px.every((v) => v === 0), true);

// ── textAngles: rânduri de „text" (cuvinte = bare) rotite cu unghiuri cunoscute ─────────────
function textCard(): Gray {
  const c = blank(900, 560);
  fill(c, 30, 30, 220, 280, 120); // poza
  for (let row = 0; row < 9; row++) {
    const y = 60 + row * 52;
    for (let x = 300 + (row % 3) * 17; x < 860; x += 70 + ((row * 13 + x) % 40)) fill(c, x, y, 40 + ((x * 7) % 25), 18);
  }
  return c;
}
for (const deg of [0, 17, -33, 62, 90, 124]) {
  const est = textAngles(rotate(textCard(), deg))[0];
  assert.ok(angDist(est, deg, 180) < 1.5, `rânduri la ${deg}° → estimat ${est}°`);
}

// ── rotationCandidates: orientarea rândurilor + întoarsă, apoi cele 4 drepte, fără dubluri ──
assert.deepEqual(rotationCandidates([-14, 76]), [14, 194, 284, 104, 0, 90, 180, 270]);
assert.deepEqual(rotationCandidates([0]), [0, 180, 90, 270]);
assert.deepEqual(rotationCandidates([]), [0, 90, 180, 270]);

// ── encodeBmp: antet + rânduri de jos în sus, aliniate la 4 octeți ──
const tiny = blank(3, 2);
tiny.px[0] = 7; // (0,0) = primul pixel din ULTIMUL rând al fișierului
const bmp = encodeBmp(tiny);
const dv = new DataView(bmp.buffer);
assert.equal(String.fromCharCode(bmp[0], bmp[1]), "BM");
assert.equal(dv.getUint32(2, true), bmp.length);
assert.deepEqual([dv.getInt32(18, true), dv.getInt32(22, true), dv.getUint16(28, true)], [3, 2, 8]);
const off = dv.getUint32(10, true);
assert.equal(bmp.length, off + 4 * 2, "rând de 3 pixeli → 4 octeți");
assert.equal(bmp[off + 4], 7);

// ── mrzBox: rândurile lungi A-Z0-9< (și al doilea rând, cu un singur „<"), cu margine ──
const box = mrzBox([
  { text: "CNP 1800101400120", x0: 300, y0: 100, x1: 600, y1: 130 },
  { text: "IDROUPOPESCU<<ANDREI<MIHAI<<<<<<<<<<", x0: 40, y0: 470, x1: 860, y1: 500 },
  { text: "KS123456<5ROU8001014M290513214001208", x0: 40, y0: 560, x1: 860, y1: 590 },
], blank(900, 700))!;
assert.ok(box.y < 470 && box.y + box.h > 590 && box.x < 40 && box.x + box.w > 860, JSON.stringify(box));
assert.ok(box.y > 130, "rândul cu CNP nu intră în bandă");
assert.equal(mrzBox([{ text: "ROMANIA ROUMANIE ROMANIA", x0: 0, y0: 0, x1: 10, y1: 10 }], blank(10, 10)), null);

// ── scanIdImage: găsește orientarea în orice poziție, cu un OCR fals care citește doar actul drept ──
// Actul: poza (pătrat închis) sus-stânga + rânduri de text; „drept" = poza în cadranul sus-stânga.
const PAGE = "ROMANIA\nCNP 1800101400120\nIDROUPOPESCU<<ANDREI<MIHAI<<<<<<<<<<\nKS123456<5ROU8001014M290513214001208";
const fakeOcr = (log: string[]): Ocr => async (img, mode) => {
  log.push(mode);
  if (mode === "mrz") return { text: PAGE.split("\n").slice(2).join("\n"), lines: [] };
  const q = (x0: number, y0: number) => {
    let s = 0;
    for (let y = Math.floor(y0 * img.h); y < Math.floor((y0 + 0.5) * img.h); y += 4)
      for (let x = Math.floor(x0 * img.w); x < Math.floor((x0 + 0.5) * img.w); x += 4) s += img.px[y * img.w + x];
    return s;
  };
  const upright = Math.abs(textAngles(img)[0] ?? 90) < 3 && q(0, 0) < Math.min(q(0.5, 0), q(0, 0.5), q(0.5, 0.5));
  if (!upright) return { text: "~ ;: !! \n 1l| ", lines: [] };
  const lines = [{ text: "IDROUPOPESCU<<ANDREI<MIHAI<<<<<<<<<<", x0: img.w * 0.05, y0: img.h * 0.8, x1: img.w * 0.95, y1: img.h * 0.85 }];
  return { text: PAGE, lines };
};
for (const deg of [0, 90, 180, 270, 25, -140]) {
  const log: string[] = [];
  const res = await scanIdImage(rotate(textCard(), deg), fakeOcr(log));
  assert.equal(res.fields.cnp, "1800101400120", `${deg}°`);
  assert.equal(res.fields.fullName, "Andrei Mihai Popescu", `${deg}°`);
  assert.equal(res.fields.expiryIso, "2029-05-13", `${deg}°`);
  assert.ok(angDist(res.rotation, -deg, 360) < 2, `${deg}°: rotația ${res.rotation} îl aduce drept`);
  assert.ok(log.filter((m) => m === "text").length <= 3, `${deg}°: ${log.join(",")} — cel mult 3 citiri de pagină`);
}
// Poză fără act: încearcă tot, nu inventează nimic.
const none = await scanIdImage(blank(400, 300), async () => ({ text: "", lines: [] }));
assert.deepEqual(none.fields, {});

console.log("id-scan ok");
