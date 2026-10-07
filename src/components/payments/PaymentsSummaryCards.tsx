"use client";

import { formatMoney, type Currency } from "@/lib/payments/types";

export type PaymentsSummary = {
  count: number;
  gross: number;
  commissions: number;
  deductions: number;
  net: number;
};

export function PaymentsSummaryCards({ summary, currency, netLabel = "Total de plată" }: { summary: PaymentsSummary; currency: Currency; netLabel?: string }) {
  const cards = [
    { label: "Număr plăți", value: String(summary.count) },
    { label: "Valoare brută", value: formatMoney(summary.gross, currency) },
    { label: "Total comisioane", value: formatMoney(summary.commissions, currency) },
    { label: "Total deduceri", value: formatMoney(summary.deductions, currency) },
    { label: netLabel, value: formatMoney(summary.net, currency), strong: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-line/60 bg-card p-3.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-fg-dim">{c.label}</div>
          <div className={c.strong ? "mt-1 text-[18px] font-bold text-emerald-300 tabular-nums" : "mt-1 text-[18px] font-bold text-fg tabular-nums"}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PaymentsPagination({
  page, pageSize, total, onPage,
}: {
  page: number; pageSize: number; total: number; onPage: (p: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const pages: (number | "…")[] = [];
  const push = (n: number | "…") => pages.push(n);
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) push(i);
  } else {
    push(1);
    if (page > 3) push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) push(i);
    if (page < pageCount - 2) push("…");
    push(pageCount);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <span className="text-[12px] text-fg-muted">
        Afișează <span className="font-semibold text-fg tabular-nums">{from}–{to}</span> din <span className="font-semibold text-fg tabular-nums">{total}</span> plăți
      </span>
      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</PageBtn>
        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`e${idx}`} className="px-1.5 text-[12px] text-fg-dim">…</span>
          ) : (
            <PageBtn key={p} active={p === page} onClick={() => onPage(p)}>{p}</PageBtn>
          ),
        )}
        <PageBtn disabled={page >= pageCount} onClick={() => onPage(page + 1)}>›</PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children, active, disabled, onClick,
}: {
  children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex h-7 min-w-7 items-center justify-center rounded-md px-2 text-[12px] font-medium tabular-nums transition-colors " +
        (active
          ? "bg-violet-500 text-white"
          : "border border-line bg-card-hover text-fg hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40")
      }
    >
      {children}
    </button>
  );
}
