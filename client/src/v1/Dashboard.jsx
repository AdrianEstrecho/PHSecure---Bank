import { banking } from "../api/endpoints.js";
import { cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, formatMoney } from "../lib/format.js";
import { useLoad } from "../lib/useLoad.js";
import Layout from "./Layout.jsx";
import { Box, Message } from "./ui.jsx";

const loadDashboard = () =>
  Promise.all([banking.accounts(), banking.transactions({ limit: 8 })]).then(([accounts, { transactions }]) => ({ ...accounts, transactions }));

/** Version 1 has one page once you're in: balances, recent transactions and how sign-in is protected. */
export default function Dashboard() {
  const { user } = useAuth();
  const { data, error } = useLoad(loadDashboard);

  return (
    <Layout>
      <h1 className="text-[26px] leading-tight font-bold">Welcome, {user.fullName.split(" ")[0]}</h1>
      <p className="mt-1 text-[14px] text-muted">Signed in as {user.maskedEmail}</p>

      {error && <Message className="mt-6">{error}</Message>}
      {!data && !error && (
        <p role="status" className="mt-8 text-[14px] text-muted">
          Loading your accounts…
        </p>
      )}

      {data && (
        <>
          <section aria-label="Balances" className="mt-8 grid gap-4 sm:grid-cols-3">
            <Box className="p-5">
              <p className="text-[13px] text-muted">Total balance</p>
              <p className="mt-1 text-[22px] font-bold tabular">{formatMoney(data.total)}</p>
            </Box>
            {data.accounts.map((a) => (
              <Box key={a.id} className="p-5">
                <p className="text-[13px] text-muted">
                  {a.type} · <span className="font-mono">{a.maskedNumber}</span>
                </p>
                <p className="mt-1 text-[22px] font-bold tabular">{formatMoney(a.balance)}</p>
              </Box>
            ))}
          </section>

          <Box className="mt-6">
            <h2 className="border-b border-line px-5 py-3 text-[15px] font-semibold">Recent transactions</h2>
            {data.transactions.length ? (
              <ul className="divide-y divide-line">
                {data.transactions.map((t) => {
                  const value = Number(t.amount);
                  return (
                    <li key={t.id} className="flex items-baseline justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-ink">{t.description}</p>
                        <p className="text-[12.5px] text-muted">
                          {formatDate(t.createdAt)} · {t.accountType}
                        </p>
                      </div>
                      <p className={cx("shrink-0 text-[14px] font-medium tabular", value > 0 ? "text-success" : "text-ink")}>
                        {value > 0 ? "+" : "−"}
                        {formatMoney(Math.abs(value))}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-[14px] text-muted">No transactions yet.</p>
            )}
          </Box>

          <Box className="mt-6 p-5">
            <h2 className="text-[15px] font-semibold">Sign-in security</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Email verification is on. Every time you sign in, we email a 6-digit code to {user.maskedEmail}.
            </p>
          </Box>
        </>
      )}
    </Layout>
  );
}
