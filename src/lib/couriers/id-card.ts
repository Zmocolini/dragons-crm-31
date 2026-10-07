// Extrage nume + CNP din textul OCR al unui buletin românesc (CI), permis de ședere sau pașaport.
// Sursa sigură e zona MRZ (liniile cu „<<"): numele e acolo fără diacritice, iar CNP-ul
// se poate reconstrui din ea. Orice CNP propus trece prin cifra de control — un OCR greșit
// nu ajunge în formular.

export type IdCardFields = {
  fullName?: string;
  cnp?: string;
  /** Seria + numărul actului, ex. „KS123456". */
  docNumber?: string;
  /** Data expirării actului (YYYY-MM-DD). */
  expiryIso?: string;
  /** A doua citire a numelui când fața și MRZ nu se potrivesc — userul alege. */
  nameAlt?: string;
};

const CNP_KEY = "279146358279";

export function isValidCnp(cnp: string): boolean {
  if (!/^[1-9]\d{12}$/.test(cnp)) return false;
  const mm = Number(cnp.slice(3, 5));
  const dd = Number(cnp.slice(5, 7));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(cnp[i]) * Number(CNP_KEY[i]);
  const ctrl = sum % 11 === 10 ? 1 : sum % 11;
  return ctrl === Number(cnp[12]);
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** YYMMDD din MRZ → YYYY-MM-DD (expirarea e mereu după 2000). */
const mrzDate = (d: string) => `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`;

/** Litere/cifre confundate des de OCR în MRZ (font OCR-B). */
const toDigits = (s: string) => s.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/B/g, "8").replace(/S/g, "5").replace(/Z/g, "2").replace(/G/g, "6");

/** Litere mari românești + cratimă; restul e zgomot de OCR. */
const NAME_CHARS = /[^A-ZĂÂÎȘȚŞŢ\- ]/g;
const fold = (s = "") => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/[-\s]+/g, " ").trim().toUpperCase();

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

/** Valoarea de sub o etichetă („Nume/Nom/Last name" → „POPESCU"): pe aceeași linie după etichetă sau pe linia următoare. */
function valueAfterLabel(raw: string[], label: RegExp, not?: RegExp): string | undefined {
  for (let i = 0; i < raw.length; i++) {
    if (!label.test(raw[i]) || (not && not.test(raw[i]))) continue;
    for (const cand of [raw[i].replace(/^.*\b(name|nom|nume)\b/i, ""), raw[i + 1] ?? ""]) {
      if (cand.includes("<") || /[a-z]{3}/.test(cand)) continue; // altă etichetă sau MRZ
      // Litere izolate („D A Î") sunt zgomot din guilloche, nu inițiale.
      const v = cand.toUpperCase().replace(NAME_CHARS, "").split(/\s+/).filter((t) => t.length > 1).join(" ");
      if (/[A-ZĂÂÎȘȚŞŢ]{2}/.test(v)) return v;
    }
  }
}

/** Numele din MRZ: NUME<<PRENUME<PRENUME2<<<<. Umplutura citită greșit („LLLL", „K<K") se taie. */
function mrzName(lines: string[]): string | undefined {
  for (const l of lines) {
    let names: string | null = null;
    // CI: „IDROU…", citit și „TDROU", „IDR0U", uneori cu gunoi lipit în față.
    const td2 = l.match(/[I1T][A-Z0<]R[O0]{1,2}U([A-Z<]{6,})/);
    if (td2) names = td2[1];
    else if (/^P[A-Z<][A-Z]{3}[A-Z<]+$/.test(l) && l.length >= 40) names = l.slice(5); // pașaport (TD3)
    else if (/^[A-Z<]+$/.test(l) && /[A-Z]<<[A-Z]/.test(l)) names = l;                // permis (TD1, linia 3)
    if (!names || !names.includes("<<")) continue;
    const seg = names.split("<<");
    const clean = (x = "") => x.replace(/(.)\1{2,}.*$/, "").replace(/<+/g, " ").replace(/[^A-Z ]/g, "").trim();
    const surname = clean(seg[0]), given = clean(seg[1]);
    if (surname.length >= 2 && given.length >= 2) return `${given} ${surname}`;
  }
}

export function parseIdCardText(text: string): IdCardFields {
  const out: IdCardFields = {};
  const raw = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines = text
    .toUpperCase()
    .replace(/[«‹(\[{]/g, "<")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ""))
    .filter(Boolean);

  // 1) CNP tipărit pe față: 13 cifre consecutive cu cifră de control validă.
  for (const l of lines) {
    for (const m of toDigits(l).matchAll(/\d{13}/g)) {
      if (isValidCnp(m[0])) { out.cnp = m[0]; break; }
    }
    if (out.cnp) break;
  }

  // 2) Nume: fața (cu diacritice și cratimă) verificată încrucișat cu MRZ (fără diacritice, dar fără etichete de ratat).
  const surname = valueAfterLabel(raw, /\bnu?r?n?me\b|\bnom\b|last\s*name|surname/i, /pre\s*n/i);
  const given = valueAfterLabel(raw, /pre\s*n[uoâ]m|first\s*name|given/i);
  const front = surname && given ? `${given} ${surname}` : undefined;
  const mrz = mrzName(lines.filter((l) => l.includes("<<") && l.length >= 15));
  if (front && mrz) {
    const agree = similarity(fold(front), fold(mrz)) >= 0.75;
    out.fullName = titleCase(agree ? front : mrz);
    if (!agree) out.nameAlt = titleCase(front);
  } else if (front || mrz) {
    out.fullName = titleCase((front ?? mrz)!);
  }
  // MRZ n-are diacritice: „RADULESCU" → „RĂDULESCU" dacă fața conține cuvântul scris complet.
  if (out.fullName && !front) {
    const words = text.toUpperCase().match(/[A-ZĂÂÎȘȚŞŢ]{2,}/g) ?? [];
    out.fullName = titleCase(out.fullName.split(" ").map((t) => words.find((w) => w !== t.toUpperCase() && fold(w) === t.toUpperCase()) ?? t).join(" "));
    // Cratima din prenumele compus („ELENA-IOANA") se vede doar pe față.
    const folded = fold(text.replace(/-/g, "§")).replace(/§/g, "-");
    const t = out.fullName.split(" ");
    for (let i = t.length - 2; i >= 0; i--) {
      if (folded.includes(`${fold(t[i])}-${fold(t[i + 1])}`)) t.splice(i, 2, `${t[i]}-${t[i + 1]}`);
    }
    out.fullName = t.join(" ");
  }
  // Forma corectă românească: Ș/Ț cu virgulă, nu Ş/Ţ cu sedilă (OCR le confundă).
  if (out.fullName) out.fullName = out.fullName.replace(/Ş/g, "Ș").replace(/ş/g, "ș").replace(/Ţ/g, "Ț").replace(/ţ/g, "ț");
  if (out.nameAlt) out.nameAlt = out.nameAlt.replace(/Ş/g, "Ș").replace(/ş/g, "ș").replace(/Ţ/g, "Ț").replace(/ţ/g, "ț");

  // 3) Linia 2 CI: serie+nr, ROU, data nașterii, sex, expirare, opțional (cifra 1 + ultimele 6 din CNP).
  const D = "[0-9OBSIZLG]";
  const re = new RegExp(`([A-Z]{2}${D}{6})<?${D}?R[O0]{1,2}U(${D}{6})${D}([MF<])(${D}{6})${D}(${D}{7})`);
  for (const l of lines) {
    const m = l.match(re);
    if (!m) continue;
    out.docNumber = m[1].slice(0, 2) + toDigits(m[1].slice(2));
    out.expiryIso = mrzDate(toDigits(m[4]));
    if (!out.cnp) {
      const opt = toDigits(m[5]);
      const cnp = opt[0] + toDigits(m[2]) + opt.slice(1);
      if (isValidCnp(cnp)) out.cnp = cnp;
    }
    break;
  }

  return out;
}

/** Citirea e sigură când avem CNP și numele de pe față se potrivește cu MRZ (sau există doar una din ele, fără conflict). */
export const isConfident = (f: IdCardFields) => !!(f.cnp && f.fullName && !f.nameAlt);

/**
 * Rulează trecerile OCR pe rând (ex. normal, apoi filtru median pentru zgomot) până la o citire sigură.
 * Fiecare câmp se ia din prima trecere care l-a citit sigur.
 */
export async function readIdCard(passes: Array<() => Promise<string>>): Promise<IdCardFields> {
  let best: IdCardFields = {};
  for (const pass of passes) {
    const r = parseIdCardText(await pass());
    const nameOk = (f: IdCardFields) => !!f.fullName && !f.nameAlt;
    best = {
      ...r, ...best,
      ...(nameOk(best) || !r.fullName || (best.fullName && !nameOk(r)) ? {} : { fullName: r.fullName, nameAlt: r.nameAlt }),
      cnp: best.cnp ?? r.cnp,
    };
    if (isConfident(best)) break;
  }
  return best;
}
