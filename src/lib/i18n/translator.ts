// Traducere în runtime, 100% locală: înlocuiește textele românești cu cele din dicționarul /i18n/<lang>.json.
// Fără servicii externe — datele din CRM nu pleacă nicăieri. Textele netraduse rămân în română.
export type Lang = "ro" | "en" | "ru" | "hi";
export const LANGS: Array<{ code: Lang; label: string; name: string }> = [
  { code: "ro", label: "RO", name: "Română" },
  { code: "en", label: "EN", name: "English" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "hi", label: "HI", name: "हिन्दी (India)" },
];
export const LANG_KEY = "crm31-lang";

export function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en" || v === "ru" || v === "hi") return v;
  } catch {}
  return "ro";
}

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
// SKIP: nu traducem conținutul text (date introduse de utilizator, cod). SKIP_ALL: nici atributele.
const SKIP = "script,style,noscript,textarea,code,pre,[data-no-translate],[contenteditable='true']";
const SKIP_ALL = "script,style,noscript,[data-no-translate]";
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

type Pattern = { re: RegExp; out: string; len: number };

const RO_M = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const RO_MS = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "noi", "dec"];
const RO_DS = ["lun", "mar", "mie", "joi", "vin", "sam", "dum"];
const RO_D = ["luni", "marti", "miercuri", "joi", "vineri", "sambata", "duminica"];
type DateNames = { monthsNom: string[]; monthsGen: string[]; days: string[]; monthsShort: string[]; daysShort: string[] };
const DATE_NAMES: Record<Exclude<Lang, "ro">, DateNames> = {
  en: {
    monthsNom: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    monthsGen: [],
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    daysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  ru: {
    monthsNom: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    monthsGen: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    days: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
    monthsShort: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
    daysShort: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  },
  hi: {
    monthsNom: ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"],
    monthsGen: [],
    days: ["सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार", "रविवार"],
    monthsShort: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
    daysShort: ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"],
  },
};
const strip = (w: string) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const cap = (from: string, to: string, lang: Lang) => (lang === "hi" || from[0] === from[0].toUpperCase() ? to : to.toLowerCase());

/** Zile și luni românești → limba aleasă (doar cu context de dată, ca „luni"/„mai" ca cuvinte obișnuite să rămână). */
export function dateWords(s: string, lang: Exclude<Lang, "ro">): string {
  const N = DATE_NAMES[lang];
  const mi = (w: string) => RO_M.indexOf(strip(w));
  const m = RO_M.join("|");
  return s
    // abrevieri: „Lun, 05 oct" și „05 – 11 Oct" (doar lângă o cifră, ca „mar"/„mai" obișnuite să rămână)
    .replace(new RegExp(`(\\d{1,2}(?:\\s*[–-]\\s*\\d{1,2})?\\s+)(${RO_MS.join("|")})\\b\\.?`, "gi"), (x, d, mo) => d + N.monthsShort[RO_MS.indexOf(strip(mo))])
    .replace(new RegExp(`\\b(${RO_DS.join("|")})(?=\\.?,?\\s+\\d{1,2}\\s)`, "gi"), (x, d) => N.daysShort[RO_DS.indexOf(strip(d))])
    .replace(new RegExp(`(\\d{1,2}\\s+(?:-\\s+\\d{1,2}\\s+)?)(${m})\\b|\\b(${m})(\\s+\\d{4})`, "gi"), (_x, d, mo1, mo2, y) => {
      if (d) { const i = mi(mo1); return d + cap(mo1, (N.monthsGen[i] ?? N.monthsNom[i]), lang); }
      return cap(mo2, N.monthsNom[mi(mo2)], lang) + y;
    })
    .replace(/(^|[^\d\p{L}]\s*)(\p{L}+)(?=$|[^\p{L}])/gu, (x, pre, w, off, str) => {
      const di = RO_D.indexOf(strip(w));
      if (di === -1 || /\d\s$/.test(str.slice(0, off + pre.length))) return x;
      return pre + cap(w, N.days[di], lang);
    });
}

export function startTranslator(lang: Lang, dict: Record<string, string>): () => void {
  const patterns: Pattern[] = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!k.includes("{n}")) continue;
    const esc = k.split("{n}").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)");
    patterns.push({ re: new RegExp(`^${esc}$`), out: v, len: k.replace(/\{n\}/g, "").length });
  }
  patterns.sort((a, b) => b.len - a.len); // cel mai specific întâi (mai mult text fix)
  const cache = new Map<string, string | null>();
  const applied = new WeakMap<Node, string>(); // ce am scris noi, ca să nu reprocesăm

  const lookup = (raw: string): string | null => {
    if (raw.length > 400) return null;
    const key = norm(raw);
    if (!key) return null;
    if (cache.has(key)) return cache.get(key)!;
    let res: string | null = dict[key] ?? null;
    if (res === null) {
      for (const p of patterns) {
        const m = p.re.exec(key);
        if (m) { let i = 1; res = p.out.replace(/\{n\}/g, () => { const c = m[i++] ?? ""; return lookup(c) ?? c; }); break; }
      }
    }
    res = dateWords(res ?? key, lang as Exclude<Lang, "ro">);
    if (res === key) res = null;
    if (cache.size > 5000) cache.clear();
    cache.set(key, res);
    return res;
  };

  const text = (n: Text) => {
    if (n.parentElement?.closest(SKIP)) return;
    const cur = n.data;
    if (applied.get(n) === cur) return;
    const tr = lookup(cur);
    if (tr === null) return;
    const lead = /^\s*/.exec(cur)![0];
    const trail = /\s*$/.exec(cur)![0];
    const next = lead + tr + trail;
    applied.set(n, next);
    n.data = next;
  };
  const attrs = (el: Element) => {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const tr = lookup(v);
      if (tr !== null) el.setAttribute(a, tr);
    }
  };
  const walk = (root: Node) => {
    if (root.nodeType === Node.TEXT_NODE) { text(root as Text); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const el = root as Element;
    if (el.closest(SKIP_ALL)) return;
    attrs(el);
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP_ALL) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    let n: Node | null = tw.nextNode();
    while (n) {
      if (n.nodeType === Node.TEXT_NODE) text(n as Text);
      else attrs(n as Element);
      n = tw.nextNode();
    }
  };
  const title = () => { const t = lookup(document.title); if (t) document.title = t; };

  document.documentElement.lang = lang;
  walk(document.body);
  title();

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") text(m.target as Text);
      else if (m.type === "attributes") { if (!(m.target as Element).closest(SKIP_ALL)) attrs(m.target as Element); }
      else m.addedNodes.forEach(walk);
    }
    title();
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
  mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  return () => mo.disconnect();
}
