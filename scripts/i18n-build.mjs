// Compilează i18n/chunks/out-*.json (+ extra.json, la nevoie) în public/i18n/en.json (doar intrările diferite de original).
import fs from "node:fs";
const keys = Object.keys(JSON.parse(fs.readFileSync("i18n/ro.json", "utf8")));
const N = fs.readdirSync("i18n/chunks").filter((f) => /^in-\d+\.json$/.test(f)).length;
const en = {}; let bad = 0, missing = 0;
for (let i = 0; i < N; i++) {
  const inp = JSON.parse(fs.readFileSync(`i18n/chunks/in-${i}.json`, "utf8"));
  const f = `i18n/chunks/out-${i}.json`;
  if (!fs.existsSync(f)) { missing += inp.length; continue; }
  const out = JSON.parse(fs.readFileSync(f, "utf8"));
  if (out.length !== inp.length) { console.error(`chunk ${i}: ${out.length} != ${inp.length}`); bad++; continue; }
  inp.forEach((k, j) => {
    const [e] = out[j];
    const ph = (k.match(/\{n\}/g) || []).length;
    if (typeof e === "string" && e !== k && (e.match(/\{n\}/g) || []).length === ph) en[k] = e;
  });
}
if (fs.existsSync("i18n/extra.json")) Object.assign(en, JSON.parse(fs.readFileSync("i18n/extra.json", "utf8")));
fs.mkdirSync("public/i18n", { recursive: true });
fs.writeFileSync("public/i18n/en.json", JSON.stringify(en));
console.log(JSON.stringify({ keys: keys.length, en: Object.keys(en).length, badChunks: bad, missingStrings: missing }));
