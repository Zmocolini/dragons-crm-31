// Garda de ACURATEȚE a scannerului de buletin, pe OCR real (tesseract, model ron) — nu pe OCR fals.
// tests/id-scan.test.mts verifică logica (orientare, MRZ, parsare) cu un OCR simulat; doar aici se vede
// dacă numele chiar iese corect dintr-o poză. Fără garda asta, „5/24 → 23/24" și „6/94 → 89/94"
// trăiau doar în mesaje de commit, iar o schimbare de model/preprocesare putea strica numele tăcut.
//
// Calea e EXACT cea din browser de la poza gri încolo: EXIF aplicat → rgbaToGray → scanIdImage(tesseractOcr).
// Diferă doar decodorul JPEG (sharp aici, browserul acolo).
//
// Comparația e PER IMAGINE față de baseline.json, nu un prag absolut (vezi INCIDENT
// prag-absolut-fara-linie-de-baza): pică dacă un câmp citit corect înainte nu mai e corect,
// sau dacă setul de imagini s-a schimbat fără re-calibrare conștientă.
//
//   npm run test:ocr                → verifică
//   npm run test:ocr -- --update    → rescrie baseline-ul (doar după o îmbunătățire verificată)
//   ID_OCR_LANG=eng npm run test:ocr → dezarmare: modelul vechi TREBUIE să pice (dovada că garda mușcă)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createWorker } from "tesseract.js";
import { tesseractOcr } from "../src/lib/couriers/id-ocr";
import { scanIdImage } from "../src/lib/couriers/id-scan";
import { rgbaToGray } from "../src/lib/couriers/id-scan-image";

type Expected = { fullName: string; cnp: string; expiryIso?: string; note?: string };
type Hits = { name: boolean; cnp: boolean; expiry: boolean };
type Baseline = { fixturesHash: string; images: Record<string, Hits>; totals: Record<keyof Hits, number> };

const DIR = fileURLToPath(new URL("./fixtures/id-cards/", import.meta.url));
const FIELDS: (keyof Hits)[] = ["name", "cnp", "expiry"];

/** Câmpurile corecte înainte care acum sunt greșite (regresii) și invers (îmbunătățiri). */
export function compareToBaseline(base: Baseline["images"], now: Baseline["images"]) {
  const regressions: string[] = [], improvements: string[] = [];
  for (const [img, b] of Object.entries(base)) {
    for (const f of FIELDS) {
      const n = now[img]?.[f] ?? false;
      if (b[f] && !n) regressions.push(`${img}: ${f}`);
      if (!b[f] && n) improvements.push(`${img}: ${f}`);
    }
  }
  for (const img of Object.keys(now)) if (!(img in base)) regressions.push(`${img}: lipsește din baseline`);
  return { regressions, improvements };
}

// Comparatorul însuși trebuie să muște: un câmp pierdut = regresie, unul câștigat = nu.
{
  const a = { x: { name: true, cnp: true, expiry: false } };
  assert.deepEqual(compareToBaseline(a, { x: { name: false, cnp: true, expiry: false } }).regressions, ["x: name"]);
  assert.deepEqual(compareToBaseline(a, { x: { name: true, cnp: true, expiry: true } }), { regressions: [], improvements: ["x: expiry"] });
  assert.deepEqual(compareToBaseline(a, {}).regressions, ["x: name", "x: cnp"]);
}

const expected: Record<string, Expected> = JSON.parse(readFileSync(DIR + "expected.json", "utf8"));
const jpgs = readdirSync(DIR).filter((f) => f.endsWith(".jpg")).sort();
assert.deepEqual(jpgs.map((f) => f.slice(0, -4)), Object.keys(expected).sort(), "fiecare poză are rezultat așteptat și invers");

const hash = createHash("sha256");
hash.update(readFileSync(DIR + "expected.json"));
for (const f of jpgs) hash.update(f).update(readFileSync(DIR + f));
const fixturesHash = hash.digest("hex").slice(0, 16);

const lang = process.env.ID_OCR_LANG ?? "ron";
let worker;
try {
  worker = await createWorker(lang, 1, { cachePath: fileURLToPath(new URL("../node_modules/.cache/tesseract", import.meta.url)) });
} catch (e) {
  // Fără model descărcat și fără rețea garda NU trece în tăcere.
  throw new Error(`Modelul OCR „${lang}" nu s-a putut încărca (prima rulare îl descarcă, ~1.7 MB): ${e}`);
}
const ocr = tesseractOcr(worker);

const images: Baseline["images"] = {};
const t0 = Date.now();
for (const f of jpgs) {
  const name = f.slice(0, -4), want = expected[name];
  const { data, info } = await sharp(DIR + f).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { fields } = await scanIdImage(rgbaToGray(data, info.width, info.height), ocr);
  images[name] = {
    name: fields.fullName === want.fullName,
    cnp: fields.cnp === want.cnp,
    expiry: !want.expiryIso || fields.expiryIso === want.expiryIso,
  };
  if (!images[name].name || !images[name].cnp) console.log(`  ${name.padEnd(24)} ${(fields.fullName ?? "—").padEnd(26)} ${fields.cnp ?? "—"}  (vrea ${want.fullName})`);
}
await worker.terminate();

const totals = Object.fromEntries(FIELDS.map((f) => [f, Object.values(images).filter((h) => h[f]).length])) as Baseline["totals"];
const n = jpgs.length;
console.log(`id-scan OCR [${lang}]: nume ${totals.name}/${n} · CNP ${totals.cnp}/${n} · expirare ${totals.expiry}/${n} · ${Math.round((Date.now() - t0) / n)} ms/poză`);

const BASE = DIR + "baseline.json";
if (process.argv.includes("--update")) {
  writeFileSync(BASE, JSON.stringify({ fixturesHash, totals, images } satisfies Baseline, null, 1) + "\n");
  console.log(`baseline rescris (${fixturesHash})`);
} else {
  const base: Baseline = JSON.parse(readFileSync(BASE, "utf8"));
  assert.equal(fixturesHash, base.fixturesHash, "Setul de poze s-a schimbat: rulează `npm run test:ocr -- --update` și spune în commit de ce.");
  const { regressions, improvements } = compareToBaseline(base.images, images);
  if (improvements.length) console.log(`îmbunătățiri (${improvements.length}) — fixează-le cu --update: ${improvements.join(", ")}`);
  assert.deepEqual(regressions, [], `REGRESIE de acuratețe (${regressions.length}): ${regressions.join(", ")}`);
  console.log("id-scan OCR ok");
}
