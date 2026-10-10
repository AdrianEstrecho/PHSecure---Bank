import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatDate, formatMoney } from "../lib/format.js";
import { cx } from "./ui.jsx";

/** Transactions as rows with an in/out icon, as in the reference's phone mockups. */
export default function TransactionList({ transactions, showAccount = false, showBalance = false, empty = "No transactions yet." }) {
  if (!transactions.length) return <p className="px-5 py-10 text-center text-[14px] text-muted">{empty}</p>;

  return (
    <ul className="divide-y divide-line/80">
      {transactions.map((t) => {
        const value = Number(t.amount);
        const credit = value > 0;
        const Icon = credit ? ArrowDownLeft : ArrowUpRight;
        return (
          <li key={t.id} className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6">
            <span aria-hidden className={cx("grid size-10 shrink-0 place-items-center rounded-full", credit ? "bg-lime-soft text-forest" : "bg-mist text-ink")}>
              <Icon className="size-4" strokeWidth={2} />
            </span>
            {/* Two lines, each paired with its own figure, so a wide balance doesn't squeeze the description on phones. */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[14.5px] font-medium text-ink">{t.description}</p>
                <p className={cx("shrink-0 text-[14.5px] font-semibold tabular", credit ? "text-success" : "text-ink")}>
                  {credit ? "+" : "−"}
                  {formatMoney(Math.abs(value))}
                </p>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
                <p className="min-w-0">
                  {formatDate(t.createdAt)} · {t.category}
                  {showAccount && t.accountType && <> · {t.accountType}</>}
                </p>
                {showBalance && <p className="shrink-0 text-[12px] tabular">Bal. {formatMoney(t.balanceAfter)}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
