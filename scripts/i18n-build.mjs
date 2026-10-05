// Compilează i18n/chunks (out-N: [en, ru]; hi-N: hindi) + extra.json (+ out-extra: [ru, hi]) în public/i18n/{en,ru,hi}.json.
import fs from "node:fs";
const N = fs.readdirSync("i18n/chunks").filter((f) => /^in-\d+\.json$/.test(f)).length;
const dicts = { en: {}, ru: {}, hi: {} };
const stats = { badChunks: 0, missing: [] };
const ph = (s) => (s.match(/\{n\}/g) || []).length;
const put = (lang, k, v) => { if (typeof v === "string" && v && v !== k && ph(v) === ph(k)) dicts[lang][k] = v; };
const read = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
for (let i = 0; i < N; i++) {
  const inp = read(`i18n/chunks/in-${i}.json`);
  const out = read(`i18n/chunks/out-${i}.json`);
  const hi = read(`i18n/chunks/hi-${i}.json`);
  if (out && out.length === inp.length) inp.forEach((k, j) => { put("en", k, out[j][0]); put("ru", k, out[j][1]); });
  else stats.missing.push(`out-${i}`);
  if (hi && hi.length === inp.length) inp.forEach((k, j) => put("hi", k, hi[j]));
  else stats.missing.push(`hi-${i}`);
}
const extra = read("i18n/extra.json") || {};
const xk = Object.keys(extra);
const xo = read("i18n/chunks/out-extra.json");
for (const k of xk) put("en", k, extra[k]);
if (xo && xo.length === xk.length) xk.forEach((k, j) => { put("ru", k, xo[j][0]); put("hi", k, xo[j][1]); });
else stats.missing.push("out-extra");
const xl = read("i18n/extra-lang.json") || {};
for (const [k, v] of Object.entries(xl)) for (const l of Object.keys(v)) put(l, k, v[l]);
fs.mkdirSync("public/i18n", { recursive: true });
for (const [l, d] of Object.entries(dicts)) fs.writeFileSync(`public/i18n/${l}.json`, JSON.stringify(d));
console.log(JSON.stringify({ en: Object.keys(dicts.en).length, ru: Object.keys(dicts.ru).length, hi: Object.keys(dicts.hi).length, ...stats }));
