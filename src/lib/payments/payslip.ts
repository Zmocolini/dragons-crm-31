import { BREAKDOWN_META, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatMoney, formatPeriodLong, type Payment } from "./types";

// Fișă de plată reală: generează un document HTML self-contained (imprimabil ca PDF)
// și îl descarcă. Nu depinde de o bibliotecă PDF externă (nu există în proiect).

function esc(s: string | number | null | undefined): string {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export function buildPayslipHtml(p: Payment): string {
  const currency = p.currency ?? "RON";
  const lines = BREAKDOWN_META
    .filter((m) => (p.breakdown[m.key] || 0) !== 0 || m.key === "grossRevenue" || m.key === "fleetCommission")
    .map((m) => {
      const v = p.breakdown[m.key] || 0;
      const val = m.sign === "-" ? `- ${formatMoney(v, currency)}` : formatMoney(v, currency);
      return `<tr><td>${esc(m.label)}</td><td class="r ${m.sign === "-" ? "neg" : ""}">${esc(val)}</td></tr>`;
    }).join("");

  return `<!doctype html><html lang="ro"><head><meta charset="utf-8">
<title>Fișă plată — ${esc(p.recipient.name)}</title>
<style>
  *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
  body{margin:0;padding:32px;color:#0f172a;background:#fff}
  .brand{font-size:22px;font-weight:800;color:#4f46e5}
  .muted{color:#64748b;font-size:12px}
  h1{font-size:18px;margin:18px 0 4px}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  td,th{padding:7px 4px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:left}
  .r{text-align:right;font-variant-numeric:tabular-nums}
  .neg{color:#e11d48}
  .total td{border-top:2px solid #0f172a;border-bottom:none;font-weight:800;font-size:15px;padding-top:10px}
  .grid{display:flex;gap:32px;margin-top:8px}
  .grid div{font-size:12.5px}
  .k{color:#64748b}
  @media print{body{padding:0}}
</style></head><body>
  <div class="brand">Dragon Delivery</div>
  <div class="muted">Fișă de plată curier · generată ${esc(new Date().toLocaleString("ro-RO"))}</div>
  <h1>${esc(p.recipient.name)} <span class="muted">#${esc(p.recipient.id.toUpperCase())}</span></h1>
  <div class="grid">
    <div><span class="k">Perioadă:</span> ${esc(formatPeriodLong(p.periodStartIso, p.periodEndIso))}</div>
    <div><span class="k">Platformă:</span> ${esc((p.platforms ?? []).join(", ").toUpperCase() || "—")}</div>
    <div><span class="k">Comenzi:</span> ${esc(p.ordersCount ?? "—")}</div>
  </div>
  <div class="grid">
    <div><span class="k">Status:</span> ${esc(PAYMENT_STATUS_LABEL[p.status])}</div>
    <div><span class="k">Metodă:</span> ${esc(PAYMENT_METHOD_LABEL[p.method])}</div>
    <div><span class="k">IBAN:</span> ${esc(p.ibanSnapshot ?? "—")}</div>
  </div>
  <div class="grid">
    <div><span class="k">Data plății:</span> ${esc(p.paidAtIso ? new Date(p.paidAtIso).toLocaleString("ro-RO") : "—")}</div>
    <div><span class="k">Operator:</span> ${esc(p.operatorName ?? "—")}</div>
  </div>
  <table>
    <tbody>
      ${lines}
      <tr class="total"><td>SUMĂ DE PLATĂ</td><td class="r">${esc(formatMoney(p.totalCalculated, currency))}</td></tr>
    </tbody>
  </table>
</body></html>`;
}

export function downloadPayslip(p: Payment): void {
  const html = buildPayslipHtml(p);
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fisa-plata-${p.recipient.name.replace(/\s+/g, "-").toLowerCase()}-${p.periodStartIso}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
