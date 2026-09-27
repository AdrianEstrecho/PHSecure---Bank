import { useSearchParams } from "react-router";
import { banking } from "../api/endpoints.js";
import BankCard from "../components/BankCard.jsx";
import TransactionList from "../components/TransactionList.jsx";
import { Alert, Card, PageHeader, Spinner, cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, splitMoney } from "../lib/format.js";
import { useLoad } from "../lib/useLoad.js";

export default function Accounts() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data, error } = useLoad(banking.accounts);
  const selectedId = params.get("account") ?? data?.accounts[0]?.id;
  const { data: history } = useLoad(() => (selectedId ? banking.transactions({ accountId: selectedId, limit: 50 }) : Promise.resolve({ transactions: [] })), [selectedId]);

  if (error) return <Alert>{error}</Alert>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const account = data.accounts.find((a) => a.id === selectedId) ?? data.accounts[0];
  const balance = splitMoney(account.balance);

  return (
    <div>
      <PageHeader
        eyebrow="Banking"
        title="Accounts"
        actions={
          <div role="tablist" aria-label="Accounts" className="flex gap-1 self-start rounded-full bg-surface p-1 shadow-soft sm:self-auto">
            {data.accounts.map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={a.id === account.id}
                onClick={() => setParams({ account: a.id })}
                className={cx("rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors", a.id === account.id ? "bg-forest text-white" : "text-muted hover:text-ink")}
              >
                {a.type}
              </button>
            ))}
          </div>
        }
      />

      <section role="tabpanel" aria-labelledby="account-heading" className="relative mb-5 overflow-hidden rounded-[32px] bg-forest p-7 text-white sm:p-9">
        <div aria-hidden className="absolute -bottom-24 -left-24 size-72 rounded-full bg-lime/15 blur-[90px]" />
        <div className="relative grid items-center gap-8 sm:grid-cols-[1fr_220px]">
          <div>
            <h2 id="account-heading" className="font-display text-[17px] font-semibold">
              {account.type}
            </h2>
            <p className="mt-6 text-[13px] text-white/60">Available balance · {account.currency}</p>
            <p className="mt-2 font-display text-[44px] leading-none font-semibold tracking-[-0.03em] tabular sm:text-[54px]">
              {balance.whole}
              <span className="text-[0.5em] text-white/50">{balance.cents}</span>
            </p>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-[13px]">
              <div>
                <dt className="text-white/55">Account number</dt>
                <dd className="mt-0.5 font-mono">{account.maskedNumber}</dd>
              </div>
              <div>
                <dt className="text-white/55">Opened</dt>
                <dd className="mt-0.5">{formatDate(account.createdAt)}</dd>
              </div>
            </dl>
          </div>
          <BankCard theme={account.type.includes("Savings") ? "light" : "mist"} holder={user.fullName} last4={account.maskedNumber.slice(-4)} className="hidden rotate-[6deg] sm:block" />
        </div>
      </section>

      <Card className="overflow-hidden">
        <h2 className="px-6 pt-6 pb-2 text-[20px] font-semibold">Transactions</h2>
        {history ? (
          <TransactionList transactions={history.transactions} showBalance />
        ) : (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
      </Card>
    </div>
  );
}
