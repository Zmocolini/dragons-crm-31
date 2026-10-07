/** Regim TVA al unui subcontractor: Moldova 20%, România 21%, neplătitor 0%. Se setează la înregistrare. */
export function vatRateFor(country: string, vatPayer: boolean | undefined): number {
  if (!vatPayer) return 0;
  return /mold/i.test(country) ? 20 : 21;
}

export function vatRegimeLabel(country: string, vatPayer: boolean | undefined): string {
  const pct = vatRateFor(country, vatPayer);
  return vatPayer ? `plătitor TVA ${pct}%` : "neplătitor TVA (0%)";
}

/** Factura = consecința raportului: suma plăților achitate care încap în perioadă. */
export function reportBase(
  payments: ReadonlyArray<{ status: string; periodStartIso: string; periodEndIso: string; amountPaid: number }>,
  from: string, to: string,
): { base: number; count: number } {
  const rows = payments.filter((p) => p.status === "paid" && p.periodStartIso >= from && p.periodEndIso <= to);
  return { base: Math.round(rows.reduce((s, p) => s + p.amountPaid, 0) * 100) / 100, count: rows.length };
}
