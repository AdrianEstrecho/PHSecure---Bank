import { useEffect, useState } from "react";
import { errorDetails, errorMessage } from "../api/client.js";
import { banking } from "../api/endpoints.js";
import TransactionList from "../components/TransactionList.jsx";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner, cx } from "../components/ui.jsx";
import { formatMoney } from "../lib/format.js";
import { useLoad } from "../lib/useLoad.js";

const loadTransfers = () =>
  Promise.all([banking.accounts(), banking.transactions({ limit: 50 })]).then(([accounts, { transactions }]) => ({
    accounts: accounts.accounts,
    transfers: transactions.filter((t) => t.category === "Transfer" && Number(t.amount) < 0).slice(0, 8),
  }));

const EMPTY = { fromAccountId: "", toAccountId: "", payeeName: "", payeeBank: "", payeeAccount: "", amount: "", note: "" };

export default function Transfers() {
  const { data, error, reload } = useLoad(loadTransfers);
  const [kind, setKind] = useState("internal");
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !form.fromAccountId) {
      setForm((f) => ({ ...f, fromAccountId: data.accounts[0]?.id ?? "", toAccountId: data.accounts[1]?.id ?? "" }));
    }
  }, [data, form.fromAccountId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setResult(null);
    const body =
      kind === "internal"
        ? { kind, fromAccountId: form.fromAccountId, toAccountId: form.toAccountId, amount: form.amount.replace(/,/g, ""), note: form.note || undefined }
        : { kind, fromAccountId: form.fromAccountId, payeeName: form.payeeName, payeeBank: form.payeeBank, payeeAccount: form.payeeAccount.replace(/\s/g, ""), amount: form.amount.replace(/,/g, ""), note: form.note || undefined };
    try {
      await banking.transfer(body);
      const to = kind === "internal" ? data.accounts.find((a) => a.id === form.toAccountId)?.type : form.payeeName;
      setResult({ tone: "success", message: `Transferred ${formatMoney(body.amount)} to ${to}.` });
      setForm((f) => ({ ...EMPTY, fromAccountId: f.fromAccountId, toAccountId: f.toAccountId }));
      reload();
    } catch (err) {
      const issues = errorDetails(err);
      if (Array.isArray(issues)) setErrors(Object.fromEntries(issues.map((i) => [i.path, i.message])));
      else setResult({ tone: "danger", message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!data) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const accountOption = (a) => (
    <option key={a.id} value={a.id}>
      {a.type} {a.maskedNumber} — {formatMoney(a.balance)}
    </option>
  );

  return (
    <div>
      <PageHeader eyebrow="Banking" title="Transfers" description="Move money between your accounts instantly, or send it to another bank." />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-7">
          <div role="radiogroup" aria-label="Transfer type" className="mb-6 grid grid-cols-2 rounded-xl border border-ink/20 bg-mist/60 p-1">
            {[
              ["internal", "Between my accounts"],
              ["external", "To another bank"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={kind === value}
                onClick={() => {
                  setKind(value);
                  setErrors({});
                  setResult(null);
                }}
                className={cx("rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors", kind === value ? "bg-forest text-white" : "text-muted hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-5">
            <Field label="From" htmlFor="from" error={errors.fromAccountId}>
              <Select id="from" value={form.fromAccountId} onChange={set("fromAccountId")}>
                {data.accounts.map(accountOption)}
              </Select>
            </Field>

            {kind === "internal" ? (
              <Field label="To" htmlFor="to" error={errors.toAccountId}>
                <Select id="to" value={form.toAccountId} onChange={set("toAccountId")}>
                  {data.accounts.map(accountOption)}
                </Select>
              </Field>
            ) : (
              <>
                <Field label="Recipient's name" htmlFor="payeeName" error={errors.payeeName}>
                  <Input id="payeeName" value={form.payeeName} onChange={set("payeeName")} autoComplete="off" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Bank" htmlFor="payeeBank" error={errors.payeeBank}>
                    <Input id="payeeBank" value={form.payeeBank} onChange={set("payeeBank")} autoComplete="off" />
                  </Field>
                  <Field label="Account number" htmlFor="payeeAccount" error={errors.payeeAccount}>
                    <Input id="payeeAccount" inputMode="numeric" value={form.payeeAccount} onChange={set("payeeAccount")} autoComplete="off" className="font-mono" />
                  </Field>
                </div>
              </>
            )}

            <Field label="Amount" htmlFor="amount" error={errors.amount}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">₱</span>
                <Input id="amount" inputMode="decimal" placeholder="0.00" value={form.amount} onChange={set("amount")} className="pl-8 tabular" required />
              </div>
            </Field>
            <Field label="Note" htmlFor="note" optional error={errors.note}>
              <Input id="note" value={form.note} onChange={set("note")} maxLength={80} />
            </Field>

            {result && <Alert tone={result.tone}>{result.message}</Alert>}

            <Button type="submit" className="w-full" loading={busy} disabled={!form.amount}>
              {form.amount && Number(form.amount.replace(/,/g, "")) > 0 ? `Transfer ${formatMoney(form.amount.replace(/,/g, ""))}` : "Transfer"}
            </Button>
          </form>
        </Card>

        <section aria-labelledby="recent-transfers">
          <h2 id="recent-transfers" className="mb-3 text-[20px] font-semibold">
            Recent transfers
          </h2>
          <Card className="overflow-hidden">
            <TransactionList transactions={data.transfers} showAccount empty="Transfers you make will appear here." />
          </Card>
        </section>
      </div>
    </div>
  );
}
