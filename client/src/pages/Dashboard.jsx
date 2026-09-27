import { ArrowLeftRight, ArrowUpRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { banking, twofa } from "../api/endpoints.js";
import BankCard from "../components/BankCard.jsx";
import StrengthMeter from "../components/StrengthMeter.jsx";
import TransactionList from "../components/TransactionList.jsx";
import { Alert, ButtonLink, Card, Eyebrow, IconCircle, Spinner, cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatMoney, splitMoney } from "../lib/format.js";
import { METHOD_ORDER, METHODS, securityStrength } from "../lib/methods.js";
import { useLoad } from "../lib/useLoad.js";

const loadDashboard = () =>
  Promise.all([banking.accounts(), banking.transactions({ limit: 6 }), twofa.status()]).then(([accounts, { transactions }, status]) => ({
    ...accounts,
    transactions,
    status,
  }));

function SecurityCard({ status }) {
  const on = new Set(status.methods.filter((m) => m.enabled).map((m) => m.type));
  const strength = securityStrength(status);

  return (
    <Card className="flex h-full flex-col p-7">
      <div className="flex items-center gap-4">
        <IconCircle icon={status.twoFactorOn ? ShieldCheck : ShieldAlert} tone={status.twoFactorOn ? "lime" : "mist"} className={status.twoFactorOn ? "" : "text-danger"} />
        <h2 className="text-[20px] leading-tight font-semibold">
          {status.twoFactorOn ? `Protected by ${on.size} key${on.size === 1 ? "" : "s"}` : "Two-factor authentication is off"}
        </h2>
      </div>
      {!status.twoFactorOn && (
        <p className="mt-3 text-[14px] leading-relaxed text-muted">Anyone with your password could sign in. Adding a second key takes about a minute.</p>
      )}
      <ul className="mt-5 space-y-2">
        {METHOD_ORDER.map((type) => {
          const Icon = METHODS[type].icon;
          const enabled = on.has(type);
          return (
            <li key={type} className="flex items-center gap-3 rounded-2xl bg-canvas px-3.5 py-2.5">
              <Icon className={cx("size-4", enabled ? "text-forest" : "text-muted/60")} strokeWidth={1.8} aria-hidden />
              <span className={cx("flex-1 text-[13.5px] font-medium", !enabled && "text-muted")}>{METHODS[type].name}</span>
              <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold", enabled ? "bg-lime text-ink" : "bg-mist text-muted")}>{enabled ? "On" : "Off"}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto pt-6">
        {status.twoFactorOn ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <StrengthMeter score={strength.score} label={strength.label} />
            <Link to="/security" className="text-[13.5px] font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4">
              Manage
            </Link>
          </div>
        ) : (
          <ButtonLink to="/security" size="sm">
            Turn on 2FA
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error } = useLoad(loadDashboard);

  if (error) return <Alert>{error}</Alert>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const total = splitMoney(data.total);
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="space-y-5">
      <header className="mb-8">
        <Eyebrow className="mb-2">{today}</Eyebrow>
        <h1 className="text-[32px] leading-tight font-semibold sm:text-[40px]">Hello, {user.fullName.split(" ")[0]}</h1>
        <p className="mt-1 text-[15px] text-muted">Here's where your money stands today.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section aria-labelledby="balance-label" className="relative overflow-hidden rounded-[32px] bg-forest p-7 text-white sm:p-9">
          <div aria-hidden className="absolute -top-24 -left-24 size-72 rounded-full bg-lime/20 blur-[90px]" />
          <BankCard theme="forest" vertical holder={user.fullName} className="absolute -right-6 -bottom-16 hidden w-[180px] rotate-[14deg] ring-1 ring-white/10 sm:block" />
          <div className="relative">
            <p id="balance-label" className="text-[13px] font-medium text-white/65">
              Total balance · {data.currency}
            </p>
            <p className="mt-3 font-display text-[44px] leading-none font-semibold tracking-[-0.03em] tabular sm:text-[54px]">
              {total.whole}
              <span className="text-[0.5em] text-white/50">{total.cents}</span>
            </p>
            <p className="mt-3 text-[14px] text-white/60">Across {data.accounts.length} accounts</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink to="/transfers" variant="lime">
                <ArrowLeftRight className="size-4" aria-hidden /> Transfer
              </ButtonLink>
              <ButtonLink to="/accounts" variant="on-dark">
                View accounts
              </ButtonLink>
            </div>
          </div>
        </section>
        <SecurityCard status={data.status} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {data.accounts.map((a) => (
          <Link key={a.id} to={`/accounts?account=${a.id}`} className="group rounded-[28px] bg-surface p-6 shadow-soft transition-shadow hover:shadow-lift">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[17px] font-semibold">{a.type}</p>
                <p className="mt-0.5 font-mono text-[12.5px] text-muted">{a.maskedNumber}</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-mist transition-colors group-hover:bg-lime" aria-hidden>
                <ArrowUpRight className="size-4" />
              </span>
            </div>
            <p className="mt-8 font-display text-[30px] leading-none font-semibold tracking-[-0.03em] tabular">{formatMoney(a.balance)}</p>
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-[20px] font-semibold">Recent transactions</h2>
          <Link to="/accounts" className="text-[13.5px] font-semibold text-forest underline decoration-lime decoration-2 underline-offset-4">
            See all
          </Link>
        </div>
        <TransactionList transactions={data.transactions} showAccount />
      </Card>
    </div>
  );
}
