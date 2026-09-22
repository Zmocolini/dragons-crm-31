// Framework generic pentru import plăți din platforme.
// Fiecare platformă are propriul parser care produce PlatformImportRow[] uniform.
// UI-ul + logica de matching/preview/confirmare sunt agnostice de platformă.

import type { PlatformKey } from "@/lib/dashboard/types";

/** Un rând normalizat, indiferent de platforma sursă. */
export type PlatformImportRow = {
  platform: PlatformKey;
  uid: string;               // ID extern (Bolt: U235988, Wolt: courier_id, etc.)
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  ordersCount: number;
  brutRon: number;           // venit brut (fără tips)
  tipsRon: number;           // bacșiș
  negativeBalanceRon: number;// balanță anterioară / sold precedent negativ
  /** Câmpuri extra specifice platformei — se afișează opțional în UI de debug. */
  raw?: Record<string, unknown>;
};

/** ID unic parser — mai multe parsere per platformă pentru surse diferite (Bolt oficial vs Gusty). */
export type ParserKey =
  | "bolt_ttg"
  | "bolt_gusty"
  | "wolt_gusty"
  | "glovo_gusty";

export type PlatformParser = {
  key: ParserKey;
  /** Platforma pe care o produce parser-ul (pentru match la curier via boltUid/etc.). */
  platform: PlatformKey;
  /** Grup vizual în UI: TTG (oficial) sau Gusty (agregator). */
  group: "ttg" | "gusty";
  label: string;
  status: "ready" | "coming_soon";
  /** Detectează dacă fișierul se potrivește cu parser-ul (pentru auto-detect). */
  detect?: (workbook: unknown) => boolean;
  /** Extrage rândurile dintr-un fișier XLSX. */
  parse: (buf: ArrayBuffer) => PlatformImportRow[];
  /** Extrage rândurile din text lipit (TSV/CSV din clipboard). */
  parseText?: (text: string) => PlatformImportRow[];
  /** Instrucțiuni scurte pentru user când parser-ul nu e gata. */
  helpMessage?: string;
};
