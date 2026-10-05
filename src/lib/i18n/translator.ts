// Traducere în runtime, 100% locală: înlocuiește textele românești cu cele din dicționarul /i18n/<lang>.json.
// Fără servicii externe — datele din CRM nu pleacă nicăieri. Textele netraduse rămân în română.
export type Lang = "ro" | "en";
export const LANGS: Array<{ code: Lang; label: string; name: string }> = [
  { code: "ro", label: "RO", name: "Română" },
  { code: "en", label: "EN", name: "English" },
];
export const LANG_KEY = "crm31-lang";

export function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "en") return v;
  } catch {}
  return "ro";
}

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
// SKIP: nu traducem conținutul text (date introduse de utilizator, cod). SKIP_ALL: nici atributele.
const SKIP = "script,style,noscript,textarea,code,pre,[data-no-translate],[contenteditable='true']";
const SKIP_ALL = "script,style,noscript,[data-no-translate]";
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

type Pattern = { re: RegExp; out: string; len: number };

const DAYS: Record<string, string> = { luni: "Monday", marți: "Tuesday", marti: "Tuesday", miercuri: "Wednesday", joi: "Thursday", vineri: "Friday", sâmbătă: "Saturday", sambata: "Saturday", duminică: "Sunday", duminica: "Sunday" };
const MONTHS: Record<string, string> = { ianuarie: "January", februarie: "February", martie: "March", aprilie: "April", mai: "May", iunie: "June", iulie: "July", august: "August", septembrie: "September", octombrie: "October", noiembrie: "November", decembrie: "December" };
const cap = (from: string, to: string) => (from[0] === from[0].toUpperCase() ? to : to.toLowerCase());
/** Zile și luni românești → engleză (doar cu context de dată, ca „luni\"/„mai\" ca cuvinte obișnuite să rămână). */
function dateWords(s: string): string {
  const m = Object.keys(MONTHS).join("|");
  return s
    .replace(new RegExp(`(\\d{1,2}\\s+(?:-\\s+\\d{1,2}\\s+)?)(${m})\\b|\\b(${m})(\\s+\\d{4})`, "gi"), (_x, d, mo1, mo2, y) => (d ? d + cap(mo1, MONTHS[mo1.toLowerCase()]) : cap(mo2, MONTHS[mo2.toLowerCase()]) + y))
    .replace(/(^|[^\d\p{L}]\s*)(luni|mar[țt]i|miercuri|joi|vineri|s[âa]mb[ăa]t[ăa]|duminic[ăa])(?=$|[^\p{L}])/giu, (x, pre, w, off, str) => (/\d\s$/.test(str.slice(0, off + pre.length)) ? x : pre + cap(w, DAYS[w.toLowerCase()])));
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
    res = dateWords(res ?? key);
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
