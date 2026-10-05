/**
 * Utilitar pentru normalizarea și compararea numelor de curieri,
 * detectarea numelor inversate și găsirea automată a conturilor duplicate.
 */

import type { CourierRow } from "@/lib/couriers/mock-seed";

/** Curăță diacriticele și normalizează spațiile */
export function normalizeBase(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrage cuvintele componente din nume, curățate și sortate alfabetic */
export function getNameTokens(name: string): string[] {
  const norm = normalizeBase(name);
  if (!norm) return [];
  return norm.split(" ").filter((w) => w.length > 0).sort();
}

/**
 * Verifică dacă două nume sunt echivalente:
 * - identice (după normalizare)
 * - aceleași cuvinte în ordine diferită (ex: "Manh Cuong Tran" === "Tran Manh Cuong", "Dan Rus" === "Rus Dan")
 */
export function areNamesEquivalent(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const normA = normalizeBase(nameA);
  const normB = normalizeBase(nameB);
  if (normA === normB) return true;

  const tokensA = getNameTokens(nameA);
  const tokensB = getNameTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  if (tokensA.length === tokensB.length) {
    return tokensA.every((t, i) => t === tokensB[i]);
  }

  // Cazul în care unul include prenumele secundar (ex: "Francisc Balla" și "Francisc Gabriel Balla")
  // Dacă toate cuvintele din cel mai scurt (min 2 cuvinte) se regăsesc în cel mai lung:
  const [shorter, longer] = tokensA.length < tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  if (shorter.length >= 2) {
    const longerSet = new Set(longer);
    if (shorter.every((t) => longerSet.has(t))) {
      return true;
    }
  }

  return false;
}

/** Normalizare telefon pentru comparație (elimină prefixul de țară și caracterele speciale) */
export function normalizePhoneSimple(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0040")) digits = digits.slice(4);
  else if (digits.startsWith("40") && digits.length >= 11) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 10) digits = digits.slice(1);
  return digits;
}

export type DuplicateSuggestion = {
  courierA: CourierRow;
  courierB: CourierRow;
  reason: "name_reversed" | "name_similar" | "phone" | "email";
  explanation: string;
};

/**
 * Scanează o listă de curieri și returnează perechi candidate de conturi duble
 * care nu sunt încă împerecheate.
 */
export function detectCourierDuplicates(
  couriers: CourierRow[],
  existingPairIds: Set<string> = new Set(),
): DuplicateSuggestion[] {
  const suggestions: DuplicateSuggestion[] = [];
  const seenPairKey = new Set<string>();

  for (let i = 0; i < couriers.length; i++) {
    const a = couriers[i];
    for (let j = i + 1; j < couriers.length; j++) {
      const b = couriers[j];
      if (a.id === b.id) continue;

      const pairKey1 = `${a.id}__${b.id}`;
      const pairKey2 = `${b.id}__${a.id}`;
      if (existingPairIds.has(pairKey1) || existingPairIds.has(pairKey2)) continue;
      if (seenPairKey.has(pairKey1) || seenPairKey.has(pairKey2)) continue;

      // 1. Verificare telefon identic (dacă are cel puțin 8 cifre)
      const phoneA = normalizePhoneSimple(a.phone);
      const phoneB = normalizePhoneSimple(b.phone);
      if (phoneA && phoneB && phoneA.length >= 8 && phoneA === phoneB) {
        suggestions.push({
          courierA: a,
          courierB: b,
          reason: "phone",
          explanation: `Același număr de telefon (${a.phone})`,
        });
        seenPairKey.add(pairKey1);
        continue;
      }

      // 2. Verificare email identic
      if (a.email && b.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()) {
        suggestions.push({
          courierA: a,
          courierB: b,
          reason: "email",
          explanation: `Același email (${a.email})`,
        });
        seenPairKey.add(pairKey1);
        continue;
      }

      // 3. Verificare nume identic sau inversat
      if (areNamesEquivalent(a.fullName, b.fullName)) {
        const isReversed = normalizeBase(a.fullName) !== normalizeBase(b.fullName);
        suggestions.push({
          courierA: a,
          courierB: b,
          reason: isReversed ? "name_reversed" : "name_similar",
          explanation: isReversed
            ? `Nume inversat: „${a.fullName}” ↔ „${b.fullName}”`
            : `Același nume: „${a.fullName}”`,
        });
        seenPairKey.add(pairKey1);
        continue;
      }
    }
  }

  return suggestions;
}
