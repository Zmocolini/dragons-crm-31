// Generator .xlsx REAL, self-contained (fără dependințe externe).
// Un .xlsx e o arhivă ZIP cu părți XML OOXML. Implementăm un ZIP writer minimal
// (metoda STORE + CRC32) și scriem workbook-ul cu inline strings — Excel/LibreOffice
// îl deschid nativ. TODO(real-users): pe server folosește exceljs/SheetJS cu streaming.

export type XlsxCell = string | number | null;
export type XlsxSheet = { name: string; rows: XlsxCell[][] };

// ── CRC32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Coloane A, B, ... AA ─────────────────────────────────────────────────────
function colName(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function sheetXml(rows: XlsxCell[][]): string {
  const body = rows
    .map((row, ri) => {
      const cells = row
        .map((cell, ci) => {
          const ref = `${colName(ci)}${ri + 1}`;
          if (cell === null || cell === undefined || cell === "") return "";
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${ref}" t="n"><v>${cell}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(cell))}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function workbookXml(sheets: XlsxSheet[]): string {
  const s = sheets
    .map((sh, i) => `<sheet name="${xmlEscape(sh.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${s}</sheets></workbook>`;
}

function workbookRels(sheets: XlsxSheet[]): string {
  const rels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

function contentTypes(sheets: XlsxSheet[]): string {
  const overrides = sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${overrides}</Types>`;
}

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

// ── ZIP (STORE) ──────────────────────────────────────────────────────────────
type ZipEntry = { name: string; data: Uint8Array; crc: number; offset: number };

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

function u16(n: number): Uint8Array { return new Uint8Array([n & 0xff, (n >>> 8) & 0xff]); }
function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
}

export function buildXlsx(sheets: XlsxSheet[]): Blob {
  const enc = new TextEncoder();
  const files: Array<{ name: string; content: string }> = [
    { name: "[Content_Types].xml", content: contentTypes(sheets) },
    { name: "_rels/.rels", content: ROOT_RELS },
    { name: "xl/workbook.xml", content: workbookXml(sheets) },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels(sheets) },
    ...sheets.map((sh, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(sh.rows) })),
  ];

  const localChunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);

    const header = concat([
      u32(0x04034b50), // local file header sig
      u16(20),         // version needed
      u16(0x0800),     // flags: UTF-8
      u16(0),          // method: store
      u16(0), u16(0),  // mod time / date
      u32(crc),
      u32(data.length), // compressed size
      u32(data.length), // uncompressed size
      u16(nameBytes.length),
      u16(0),          // extra len
      nameBytes,
    ]);

    entries.push({ name: f.name, data, crc, offset });
    localChunks.push(header, data);
    offset += header.length + data.length;
  }

  const centralChunks: Uint8Array[] = [];
  let centralSize = 0;
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const central = concat([
      u32(0x02014b50), // central dir sig
      u16(20), u16(20),
      u16(0x0800),
      u16(0),
      u16(0), u16(0),
      u32(e.crc),
      u32(e.data.length),
      u32(e.data.length),
      u16(nameBytes.length),
      u16(0), u16(0), // extra, comment
      u16(0), u16(0), // disk, internal attrs
      u32(0),         // external attrs
      u32(e.offset),
      nameBytes,
    ]);
    centralChunks.push(central);
    centralSize += central.length;
  }

  const central = concat(centralChunks);
  const eocd = concat([
    u32(0x06054b50),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  ]);

  const blobData = concat([concat(localChunks), central, eocd]);
  return new Blob([blobData.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
