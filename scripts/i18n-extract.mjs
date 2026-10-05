// Extrage textele vizibile din cod (JSX text, atribute de UI, literale cu aspect de text) → i18n/ro.json (cheie = text român).
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";

const ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "description", "subtitle", "hint", "helper", "tooltip", "text", "message", "heading", "body", "emptyText"]);
const DENY_ATTR = /^(className|class|style|href|src|key|id|type|name|value|defaultValue|htmlFor|role|rel|target|method|action|autoComplete|inputMode|pattern|accept|data-.*|viewBox|d|fill|stroke.*|transform|width|height|size|icon|color|tint|variant|kind|tone|ref|as|mode|lang|dir|loading|decoding|sizes|srcSet|media|crossOrigin|onClick|onChange|on[A-Z].*)$/;
const out = new Map();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const RO_DIAC = /[ăâîșțşţĂÂÎȘȚŞŢ]/;
// text "uman": are litere, nu arată a clasă Tailwind / cale / identificator / cod
function looksHuman(s) {
  if (s.length < 2 || s.length > 300) return false;
  if (!/\p{L}{2,}/u.test(s)) return false;
  if (/^[\w.-]+\/[\w./-]*$/.test(s) || /^(https?:|\/|#|@|\.)/.test(s)) return false;
  if (/^[a-z0-9_-]+(:[a-z0-9_[\]-]+)*(\s[a-z0-9_:/\[\]().%!-]+)*$/.test(s) && !RO_DIAC.test(s) && !/\s[A-ZĂÂÎȘȚ]/.test(s)) {
    // token(uri) lowercase fără spații umane → probabil clasă/identificator; păstrăm doar cuvinte simple românești >3 litere cu spațiu
    if (!/\s/.test(s)) return false;
    if (/(^|\s)(flex|grid|px|py|bg|text|border|rounded|gap|w|h|min|max|items|justify|font|hover|focus|absolute|relative|inline|block|hidden|opacity|shadow|ring|from|to|via)[-:\s]/.test(s)) return false;
  }
  if (/^[A-Z0-9_]+$/.test(s)) return false;
  if (/(^|\s)(bg|text|border|from|to|via|ring|shadow|hover:|focus:|max-lg:|lg:|sm:|md:|xl:)[a-z-]*-[a-z0-9/[\].%-]+/.test(s) && !RO_DIAC.test(s)) return false;
  if (/^(ops|dev|prod|true|false|null|none|auto|all)$/i.test(s)) return false;
  if (/[{}<>=;]/.test(s) && !/\{n\}/.test(s)) return false;
  return true;
}
function add(s, file, force = false) {
  const k = norm(s);
  if (force ? !/\p{L}{2,}/u.test(k) || k.length > 300 : !looksHuman(k)) return;
  if (!out.has(k)) out.set(k, new Set());
  out.get(k).add(file);
}
function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) { if (!["node_modules", ".next"].includes(f.name)) walk(p); }
    else if (/\.(tsx?|jsx?)$/.test(f.name) && !f.name.endsWith(".d.ts")) scan(p);
  }
}
function scan(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(process.cwd(), file);
  const tpl = (n) => {
    if (ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    let s = n.head.text;
    for (const sp of n.templateSpans) s += "{n}" + sp.literal.text;
    return s;
  };
  (function visit(n) {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    if (ts.isJsxText(n)) add(n.text, rel, true);
    else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n)) {
      const parent = n.parent;
      const text = ts.isTemplateExpression(n) ? tpl(n) : n.text;
      // ignoră className, href, key, type, id, name, value în JSX; keep atribute UI + orice literal în afara JSX-attr
      if (ts.isJsxAttribute(parent)) { const an = parent.name.getText(); if (ATTRS.has(an) || !DENY_ATTR.test(an)) add(text, rel); }
      else if (ts.isPropertyAssignment(parent) && /^(className|cls|style|href|key|id|type|icon|color|tint|variant|size|kind|tone|route|path|slug|storageKey)$/.test(parent.name.getText())) { /* skip */ }
      else if (ts.isElementAccessExpression(parent) || ts.isCallExpression(parent) && /(^|\.)(cn|clsx|twMerge|require|import|getItem|setItem|removeItem|fetch|querySelector|addEventListener|createElement)$/.test(parent.expression.getText())) { /* skip */ }
      else if (ts.isBinaryExpression(parent) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(parent.operatorToken.kind)) { /* comparație */ }
      else if (ts.isCaseClause(parent)) { /* skip */ }
      else if (ts.isJsxExpression(parent) || ts.isPropertyAssignment(parent) || ts.isArrayLiteralExpression(parent) || ts.isConditionalExpression(parent) || ts.isReturnStatement(parent) || ts.isVariableDeclaration(parent) || ts.isArrowFunction(parent) || ts.isBinaryExpression(parent) || ts.isTemplateSpan(parent) || ts.isParenthesizedExpression(parent) || ts.isCallExpression(parent)) add(text, rel);
    }
    ts.forEachChild(n, visit);
  })(sf);
}
walk("src");
for (const w of ["NOU", "BETA"]) add(w, "manual", true);
const keys = [...out.keys()].sort();
fs.mkdirSync("i18n", { recursive: true });
fs.writeFileSync("i18n/ro.json", JSON.stringify(Object.fromEntries(keys.map((k) => [k, k])), null, 0));
const ro = keys.filter((k) => RO_DIAC.test(k));
console.log(JSON.stringify({ total: keys.length, withDiacritics: ro.length, chars: keys.join("").length }));
