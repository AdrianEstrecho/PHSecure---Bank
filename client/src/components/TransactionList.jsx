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
          <li key={t.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
            <span aria-hidden className={cx("grid size-10 shrink-0 place-items-center rounded-full", credit ? "bg-lime-soft text-forest" : "bg-mist text-ink")}>
              <Icon className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-medium text-ink">{t.description}</p>
              <p className="text-[12.5px] text-muted">
                {formatDate(t.createdAt)} · {t.category}
                {showAccount && t.accountType && <> · {t.accountType}</>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cx("text-[14.5px] font-semibold tabular", credit ? "text-success" : "text-ink")}>
                {credit ? "+" : "−"}
                {formatMoney(Math.abs(value))}
              </p>
              {showBalance && <p className="text-[12px] text-muted tabular">Bal. {formatMoney(t.balanceAfter)}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
