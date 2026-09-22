// Mapare curier → subcontractor pentru identificare rapidă în UI.
//
// Cheia e numele complet normalizat (lowercase, fără diacritice, spații simple).
// Când introducem sistemul real de subcontractori în backend, această mapare
// devine fallback pentru curieri care nu au încă `subcontractorName` setat.

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Curieri asignați subcontractorului „HUSEIN" (confirmat 2026-09-21). */
const HUSEIN_COURIERS = [
  "Ibrar Haroon",
  "Khuram Shahzad",
  "Ahmed Akhlaq",
  "Iftikhar Muhammad",
  "Bouchaala Thamine",
  "Bensafi Nadjib",
  "Emon Sheikh",
  "Kamal Azmat",
  "Khan Ibrahim",
  "Islam Rashedul",
  "Haani San",
  "Brar Aroon",
  "Rehman Raza",
  "Hammad Harat",
  "Huram Hahzad",
  "Iqbal Aqib",
];

const NAME_TO_SUBCONTRACTOR: Record<string, string> = {};
for (const n of HUSEIN_COURIERS) NAME_TO_SUBCONTRACTOR[normalize(n)] = "HUSEIN";

/** Întoarce numele subcontractorului pentru un curier după nume, sau null dacă nu e mapat. */
export function subcontractorFor(fullName: string): string | null {
  if (!fullName) return null;
  return NAME_TO_SUBCONTRACTOR[normalize(fullName)] ?? null;
}

/** Inițialele subcontractorului (max 2 caractere) pentru badge compact. */
export function subcontractorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
