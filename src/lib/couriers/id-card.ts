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
const toDigits = (s: string) => s.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/B/g, "8").replace(/S/g, "5").replace(/Z/g, "2");

export function parseIdCardText(text: string): IdCardFields {
  const out: IdCardFields = {};
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

  const mrz = lines.filter((l) => l.includes("<<") && l.length >= 20);

  // 2) Nume: CI (TD2) → prima linie „ID" + „ROU" + NUME<<PRENUME; permis (TD1) → linia doar cu litere.
  for (const l of mrz) {
    let names: string | null = null;
    const td2 = l.match(/^I[A-Z<][A-Z<]{3}([A-Z<]+)$/);
    if (td2 && /^I.ROU/.test(l)) names = td2[1];
    else if (/^P[A-Z<][A-Z]{3}[A-Z<]+$/.test(l) && l.length >= 40) names = l.slice(5); // pașaport (TD3)
    else if (/^[A-Z<]+$/.test(l) && !/^I.ROU/.test(l) && /[A-Z]<<[A-Z]/.test(l)) names = l;
    if (!names) continue;
    const [surname, given = ""] = names.replace(/<+$/, "").split("<<");
    const clean = (s: string) => s.replace(/<+/g, " ").replace(/[^A-Z -]/g, "").trim();
    const full = [clean(given), clean(surname)].filter(Boolean).join(" ");
    if (full.split(" ").length >= 2) { out.fullName = titleCase(full); break; }
  }

  // 3) Linia 2 CI: serie+nr, ROU, data nașterii, sex, expirare, opțional (cifra 1 + ultimele 6 din CNP).
  for (const l of mrz.concat(lines)) {
    const m = l.match(/^([A-Z]{2}[0-9O]{6})<?[0-9O]?ROU([0-9O]{6})[0-9O]([MF<])([0-9O]{6})[0-9O]([0-9O]{7})/);
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
