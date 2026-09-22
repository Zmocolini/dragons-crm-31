// Curieri cu conturi multiple pe platforme diferite (aceeași persoană fizică,
// nume/platforme diferite). Grupele sunt folosite pentru:
//   • badge vizual „cont dublu" în tabelul de plăți
//   • agregarea plăților la aceeași persoană (taxă săptămânală + comision aplicate O SINGURĂ DATĂ)
//
// Adaugă aici perechi noi când le confirmi.

import type { PlatformKey } from "@/lib/dashboard/types";

export type DuplicateAlias = { name: string; platform: PlatformKey };
export type DuplicateGroup = {
  /** Identificator uman (numele „principal" pe care îl folosim în UI). */
  personId: string;
  aliases: DuplicateAlias[];
};

/** Grupurile hardcoded au fost eliminate — perechile se gestionează acum
 *  exclusiv din UI prin `DuplicatePairsProvider`. Păstrez array-ul gol pentru
 *  compatibilitate cu importurile existente; se poate șterge complet ulterior. */
export const DUPLICATE_GROUPS: DuplicateGroup[] = [];

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** DEPRECATED: folosește `useDuplicatePairs().groupFor(name)` din context.
 *  Rămâne temporar pentru locurile care nu au încă acces la hook. Returnează null. */
export function duplicateGroupFor(_fullName: string): DuplicateGroup | null {
  return null;
}
