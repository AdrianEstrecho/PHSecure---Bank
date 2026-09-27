import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  ChartLine,
  CreditCard,
  Fingerprint,
  Globe,
  KeyRound,
  Lock,
  MailCheck,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import BankCard from "../components/BankCard.jsx";
import Logo from "../components/Logo.jsx";
import { ButtonLink, Eyebrow, HeadlinePill, Marquee, cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { METHOD_ORDER, METHODS } from "../lib/methods.js";

const NAV = [
  ["Features", "#features"],
  ["Transfers", "#transfers"],
  ["Cards", "#cards"],
  ["Security", "#security"],
];

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

// Deterministic, illustrative 6-digit code for a 30-second window.
const sampleCode = (step, salt = 0) => String((Math.imul(step + salt, 2654435761) >>> 0) % 1000000).padStart(6, "0");

/* ─────────────────────────── Hero: the sign-in console ─────────────────────────── */

/** Six boxes that fill themselves in, then confirm — the moment every sign-in ends with. */
function TypedCode({ code }) {
  const [typed, setTyped] = useState(() => (prefersReducedMotion() ? 6 : 0));
  useEffect(() => {
    if (typed >= 6) return;
    const id = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 700 : 240);
    return () => clearTimeout(id);
  }, [typed]);

  return (
    <div>
      <div className="flex gap-1.5 sm:gap-2">
        {code.split("").map((digit, i) => (
          <span
            key={i}
            className={cx(
              "grid h-12 flex-1 place-items-center rounded-xl border font-mono text-[20px] transition-colors sm:h-14",
              i < typed ? "border-lime bg-lime/10 text-white" : "border-white/15 text-transparent",
              i === 2 && "mr-1.5 sm:mr-2",
            )}
          >
            {digit}
          </span>
        ))}
      </div>
      <p className={cx("mt-4 flex items-center gap-2 text-[13px] transition-opacity", typed >= 6 ? "text-lime opacity-100" : "opacity-0")}>
        <Check className="size-4" aria-hidden /> Verified — you're in
      </p>
    </div>
  );
}

function ConsolePanel({ type }) {
  const now = useNow();
  const step = Math.floor(now / 30000);
  const left = 30 - (Math.floor(now / 1000) % 30);

  if (type === "EMAIL") {
    return (
      <>
        <div className="rounded-2xl bg-white/[0.07] p-4">
          <p className="text-[11.5px] text-white/50">From PHSecure Security</p>
          <p className="mt-1 text-[14px] font-semibold">Your PHSecure sign-in code</p>
          <p className="mt-1 text-[13px] text-white/60">Use this code to finish signing in. It expires in 5 minutes.</p>
        </div>
        <div className="mt-5">
          <TypedCode code="482913" />
        </div>
      </>
    );
  }
  if (type === "SMS") {
    return (
      <>
        <p className="max-w-[16rem] rounded-2xl rounded-bl-md bg-white/[0.08] px-4 py-3 text-[13.5px] leading-snug">
          PHSecure: 591204 is your sign-in code. It expires in 5 min. Never share it.
        </p>
        <div className="mt-5">
          <TypedCode code="591204" />
        </div>
      </>
    );
  }
  if (type === "TOTP") {
    const code = sampleCode(step);
    const circumference = 2 * Math.PI * 20;
    return (
      <div className="flex items-center justify-between gap-6 rounded-2xl bg-white/[0.07] p-5 sm:p-6">
        <div>
          <p className="text-[12px] text-white/55">PHSecure Bank</p>
          <p className="mt-2 font-mono text-[34px] leading-none tracking-[0.14em] text-lime tabular sm:text-[40px]">
            {code.slice(0, 3)} {code.slice(3)}
          </p>
          <p className="mt-3 text-[12.5px] text-white/55">A new code every 30 seconds</p>
        </div>
        <svg viewBox="0 0 48 48" className="size-14 shrink-0 -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - left / 30)}
            className="text-lime transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
          <text x="24" y="28" textAnchor="middle" transform="rotate(90 24 24)" className="fill-white font-sans text-[12px] font-semibold">
            {left}
          </text>
        </svg>
      </div>
    );
  }
  return <PasskeyPanel />;
}

function PasskeyPanel() {
  const [done, setDone] = useState(() => prefersReducedMotion());
  useEffect(() => {
    const id = setTimeout(() => setDone(true), 1800);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="flex items-center gap-6 rounded-2xl bg-white/[0.07] p-5 sm:p-6">
      <span className="relative grid size-20 shrink-0 place-items-center">
        {!done && <span className="absolute inset-0 animate-ping rounded-full bg-lime/25" />}
        <span className={cx("relative grid size-20 place-items-center rounded-full transition-colors", done ? "bg-lime text-ink" : "bg-white/10 text-lime")}>
          {done ? <Check className="size-9" /> : <Fingerprint className="size-10" strokeWidth={1.4} />}
        </span>
      </span>
      <div>
        <p className="text-[15px] font-semibold">{done ? "Verified — you're in" : "Touch the sensor"}</p>
        <p className="mt-1 text-[13px] leading-snug text-white/60">Face ID, Touch ID, Windows Hello or a security key. Nothing to type.</p>
      </div>
    </div>
  );
}

function SignInConsole() {
  const [active, setActive] = useState("EMAIL");
  const [pinned, setPinned] = useState(false);

  // Walk through the keys on its own until the visitor picks one.
  useEffect(() => {
    if (pinned || prefersReducedMotion()) return;
    const id = setInterval(() => setActive((a) => METHOD_ORDER[(METHOD_ORDER.indexOf(a) + 1) % METHOD_ORDER.length]), 5200);
    return () => clearInterval(id);
  }, [pinned]);

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[48px] bg-lime/30 blur-3xl" />
      <div className="overflow-hidden rounded-[32px] bg-forest text-white shadow-lift">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <p className="flex items-center gap-2 text-[13px] font-medium">
            <Lock className="size-3.5 text-lime" aria-hidden /> Two-step sign-in
          </p>
          <p className="caps text-[10.5px] text-white/45">Step 2 of 2</p>
        </div>

        <div role="tablist" aria-label="Sign-in keys" className="grid grid-cols-4 gap-1 px-3 pt-3">
          {METHOD_ORDER.map((type) => {
            const Icon = METHODS[type].icon;
            const selected = active === type;
            return (
              <button
                key={type}
                role="tab"
                id={`console-tab-${type}`}
                aria-selected={selected}
                aria-controls="console-panel"
                onClick={() => {
                  setActive(type);
                  setPinned(true);
                }}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] font-medium transition-colors sm:text-[12px]",
                  selected ? "bg-lime text-ink" : "text-white/65 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                <Icon className="size-4.5" strokeWidth={1.8} aria-hidden />
                {METHODS[type].kind}
              </button>
            );
          })}
        </div>

        <div id="console-panel" role="tabpanel" aria-labelledby={`console-tab-${active}`} className="min-h-[236px] px-6 pt-6 pb-7">
          <p className="mb-4 font-display text-[18px] font-semibold">{METHODS[active].name}</p>
          <ConsolePanel key={active} type={active} />
        </div>
      </div>
    </div>
  );
}

function Hero({ signedIn }) {
  return (
    <section className="relative overflow-hidden">
      {/* Dot grid, fading out towards the bottom */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle,rgb(15_26_20/0.09)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] bg-[length:22px_22px]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-16 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
        <div className="animate-rise">
          <Eyebrow>Banking with a sign-in only you can finish</Eyebrow>
          <h1 className="mt-5 text-[44px] leading-[1.04] font-semibold sm:text-[60px] lg:text-[64px]">
            Digital Banking Made For <HeadlinePill /> Digital Users
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-muted">
            PHSecure is an all-in-one mobile banking app packed with all the tools, tips and tricks you need to take control of your finances.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink to={signedIn ? "/dashboard" : "/register"} variant="lime" size="lg">
              {signedIn ? "Go to dashboard" : "Open an Account"}
            </ButtonLink>
            <ButtonLink to={signedIn ? "/transfers" : "/register"} variant="outline" size="lg">
              Send Money Now <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
        <SignInConsole />
      </div>

      <dl className="relative mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-4 pb-16 sm:px-8 lg:grid-cols-4">
        {[
          ["7.5M", "Total daily transactions"],
          ["2.4%", "Average cashback on card spend"],
          ["5,000+", "Reviews", true],
          ["4", "Ways to prove it's you"],
        ].map(([value, label, stars], i) => (
          <div key={label} className={cx("border-line pr-4", i % 2 && "border-l pl-6", i >= 2 && "lg:border-l lg:pl-6", i === 0 && "lg:pl-0")}>
            <dd className="flex items-center gap-2 font-display text-[36px] leading-none font-semibold tracking-[-0.03em]">
              {value}
              {stars && (
                <span className="flex text-forest" aria-label="rated 5 out of 5">
                  {Array.from({ length: 5 }, (_, s) => (
                    <Star key={s} className="size-3.5 fill-lime" strokeWidth={1.5} aria-hidden />
                  ))}
                </span>
              )}
            </dd>
            <dt className="mt-2 text-[13px] text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ─────────────────────────── Crossing ribbons ─────────────────────────── */

function Ribbons() {
  return (
    <div className="relative h-[150px] overflow-hidden sm:h-[170px]">
      <Marquee tone="lime" reverse items={["Passkeys", "Authenticator Apps", "Vault Codes", "Instant Transfers"]} className="absolute top-9 -left-[5%] w-[110%] rotate-[2.5deg]" />
      <Marquee items={["Instant Online Debit", "Digital Banking", "Cash Back & Perks", "Two-Factor Security"]} className="absolute top-9 -left-[5%] w-[110%] -rotate-[2deg] shadow-lift" />
    </div>
  );
}

/* ─────────────────────────── Features: step explorer ─────────────────────────── */

function PhoneTransactions() {
  return (
    <div className="w-[260px] rounded-[36px] border-[8px] border-forest bg-surface px-4 pt-3 pb-5 shadow-lift">
      <div className="flex justify-between text-[10px] font-semibold">
        <span>12:30</span>
        <span className="h-3 w-12 rounded-full bg-ink" />
        <span>5G</span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-display text-[15px] font-semibold">Transactions</p>
        <SlidersHorizontal className="size-3.5 text-muted" />
      </div>
      {[
        ["Salary — paid early", "+₱85,000.00", true],
        ["Cashback reward", "+₱420.00", true],
        ["Grocery — Harvest & Co.", "−₱2,930.45", false],
      ].map(([name, amount, credit]) => (
        <div key={name} className="mt-2.5 flex items-center gap-2.5 rounded-2xl bg-canvas px-3 py-2.5">
          <span className={cx("grid size-7 place-items-center rounded-full", credit ? "bg-lime" : "bg-mist")}>
            {credit ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
          </span>
          <span className="flex-1 text-[11px] font-medium">{name}</span>
          <span className={cx("text-[11px] font-semibold tabular", credit ? "text-success" : "text-ink")}>{amount}</span>
        </div>
      ))}
    </div>
  );
}

function SpendingChart() {
  return (
    <div className="w-full max-w-[380px] rounded-[26px] bg-surface p-5 shadow-lift">
      <div className="grid grid-cols-2 rounded-full bg-canvas p-1 text-[12px] font-semibold">
        <span className="flex items-center justify-center gap-1.5 py-1.5 text-muted">
          Income <ArrowDownLeft className="size-3.5" />
        </span>
        <span className="flex items-center justify-center gap-1.5 rounded-full bg-forest py-1.5 text-white">
          Expenses <ArrowUpRight className="size-3.5" />
        </span>
      </div>
      <div className="mt-6 flex h-36 items-end gap-2.5 border-b border-line">
        {[46, 70, 38, 92, 58, 80, 34].map((h, i) => (
          <span key={i} className={cx("w-full rounded-t-lg", i === 3 ? "bg-lime" : "bg-mist")} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-lime-soft px-4 py-3">
        <span className="text-[12px] font-medium text-forest">Dining out · on your watchlist</span>
        <span className="text-[12px] font-semibold tabular">₱6,480</span>
      </div>
    </div>
  );
}

function SendAnywhere() {
  return (
    <div className="w-full max-w-[320px] space-y-3">
      {[
        ["PHP", "USD", "To Marco · Harbor Bank", "₱10,000.00"],
        ["PHP", "SGD", "To Mei · Straits Bank", "₱4,500.00"],
      ].map(([from, to, who, amount], i) => (
        <div key={who} className={cx("flex items-center gap-3 rounded-[22px] bg-surface p-4 shadow-lift", i && "ml-8")}>
          <span className="flex -space-x-1.5">
            <span className="grid size-10 place-items-center rounded-full bg-forest text-[10px] font-semibold text-lime ring-2 ring-surface">{from}</span>
            <span className="relative grid size-10 place-items-center rounded-full bg-lime text-[10px] font-semibold ring-2 ring-surface">{to}</span>
          </span>
          <span className="flex-1 text-[12px] font-medium">{who}</span>
          <span className="text-[12px] font-semibold tabular">{amount}</span>
        </div>
      ))}
    </div>
  );
}

function CardsVisual() {
  return (
    <div className="relative h-[260px] w-full max-w-[380px]">
      <BankCard theme="light" className="absolute top-0 left-0 w-[78%] -rotate-[8deg]" />
      <BankCard theme="forest" holder="Isabel Navarro" last4="4821" className="absolute right-0 bottom-0 w-[78%] rotate-[5deg]" />
    </div>
  );
}

const FEATURE_STEPS = [
  {
    icon: Wallet,
    title: "Get paid up within two days early.",
    body: "Use your PHSecure debit card to earn automatic cash back rewards at select retailers, including grocery stores, apparel shops, restaurants and more.",
    visual: PhoneTransactions,
  },
  {
    icon: ChartLine,
    title: "Track the spending money that matters to you",
    body: "That's the beauty of the Watchlist. You decide which spending categories need a little extra attention — whether you're cutting back on dining out or saving for something special.",
    visual: SpendingChart,
  },
  {
    icon: Globe,
    title: "Send money here to anywhere",
    body: "Pay anyone with a bank account, at home or abroad, straight from the app — the fee is shown before you confirm.",
    visual: SendAnywhere,
  },
  {
    icon: CreditCard,
    title: "Virtual and physical debit cards",
    body: "Spend online or in store with your PHSecure debit card, and see every payment in your passbook the moment it happens.",
    visual: CardsVisual,
  },
];

function Features() {
  const [active, setActive] = useState(0);
  const Visual = FEATURE_STEPS[active].visual;

  return (
    <section id="features" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="max-w-xl">
          <Eyebrow>Our Features</Eyebrow>
          <h2 className="mt-3 text-[34px] leading-[1.1] font-semibold sm:text-[46px]">4 Quick Steps To Use Our PHSecure Services</h2>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          {/* Real sequence — numbered. */}
          <ol className="space-y-3">
            {FEATURE_STEPS.map(({ icon: Icon, title, body, visual: StepVisual }, i) => {
              const selected = active === i;
              return (
                <li key={title}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    aria-expanded={selected}
                    className={cx(
                      "flex w-full gap-5 rounded-[26px] p-5 text-left transition-colors sm:p-6",
                      selected ? "bg-surface shadow-soft" : "hover:bg-surface/60",
                    )}
                  >
                    <span className={cx("font-display text-[15px] font-semibold tabular transition-colors", selected ? "text-forest" : "text-muted/60")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-3">
                        <span className={cx("grid size-9 place-items-center rounded-full transition-colors", selected ? "bg-lime text-ink" : "bg-mist text-muted")}>
                          <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                        </span>
                        <span className="font-display text-[18px] leading-snug font-semibold sm:text-[19px]">{title}</span>
                      </span>
                      {selected && <span className="mt-3 block text-[14.5px] leading-relaxed text-muted">{body}</span>}
                    </span>
                  </button>
                  {/* On phones the visual sits under the open step. */}
                  {selected && (
                    <div aria-hidden className="mt-3 flex h-[340px] items-center justify-center overflow-hidden rounded-[28px] bg-mist px-6 lg:hidden">
                      <StepVisual />
                    </div>
                  )}
                </li>
              );
            })}
            <li className="pt-3">
              <Link
                to="/register"
                className="group flex items-center justify-between rounded-[26px] bg-forest px-6 py-5 text-white transition-colors hover:bg-forest-2"
              >
                <span className="font-display text-[17px] font-semibold">Explore our other product features</span>
                <span className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-[13px] font-semibold text-ink">
                  View More <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          </ol>

          <div aria-hidden className="sticky top-28 hidden h-[520px] items-center justify-center overflow-hidden rounded-[36px] bg-mist lg:flex">
            <div className="absolute -right-16 -bottom-16 size-64 rounded-full border-[36px] border-lime/60" />
            <div className="absolute top-8 left-8 font-display text-[120px] leading-none font-bold text-surface/80 tabular">{String(active + 1).padStart(2, "0")}</div>
            <div key={active} className="relative flex w-full animate-rise justify-center px-10">
              <Visual />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Transfers: route + timeline ─────────────────────────── */

const ROUTE = [
  ["PHP", "left-[4%] top-[70%]", true],
  ["JPY", "left-[24%] top-[30%]"],
  ["SGD", "left-[46%] top-[16%]"],
  ["USD", "left-[68%] top-[26%]"],
  ["EUR", "left-[86%] top-[56%]"],
];

const SEND_STEPS = [
  ["Register for free", "Sign up with your email and add a second key — an authenticator app, a text message or a passkey."],
  ["Choose an amount to send", "Pick the account and the amount. The fee and the rate are shown before you confirm."],
  ["Add recipient's bank details", "Their name, bank and account number is all it takes."],
  ["Verify your identity", "Confirm with one of your sign-in keys so nobody else can move your money."],
  ["Pay for your transfer", "It's on its way — and in your passbook straight away."],
];

function Transfers({ signedIn }) {
  return (
    <section id="transfers" className="relative scroll-mt-24 overflow-hidden bg-forest py-24 text-white">
      <div aria-hidden className="absolute -top-48 right-0 size-[520px] rounded-full bg-lime/10 blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Eyebrow tone="dark">Transfers</Eyebrow>
            <h2 className="mt-3 text-[34px] leading-[1.1] font-semibold sm:text-[46px]">Meet Money Without Borders</h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-white/70">
              Send pesos to a friend down the street or dollars to a supplier overseas — from the same app, with the same two-step security.
            </p>
            <ButtonLink to={signedIn ? "/transfers" : "/register"} variant="lime" className="mt-8">
              Send Money Now
            </ButtonLink>
          </div>

          {/* A route across currencies, with the converter resting on it */}
          <div aria-hidden className="relative h-[340px] sm:h-[380px]">
            <svg viewBox="0 0 500 300" preserveAspectRatio="none" className="absolute inset-0 size-full">
              <path d="M30 230 C 110 60, 230 20, 330 70 S 460 170, 470 190" fill="none" stroke="#C6F135" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
            </svg>
            {ROUTE.map(([code, pos, home]) => (
              <span
                key={code}
                className={cx(
                  "absolute grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[11px] font-semibold",
                  home ? "bg-lime text-ink ring-8 ring-lime/20" : "border border-white/20 bg-forest-2 text-white",
                  pos,
                )}
              >
                {code}
              </span>
            ))}
            <div className="absolute right-0 bottom-0 w-[250px] rounded-[26px] bg-surface p-5 text-ink shadow-lift sm:right-[8%]">
              <p className="text-[11px] text-muted">You send</p>
              <p className="mt-1 flex items-center justify-between font-display text-[22px] font-semibold tabular">
                10,000 <span className="rounded-full bg-forest px-2.5 py-1 font-sans text-[11px] text-lime">PHP</span>
              </p>
              <p className="mt-3 text-[11px] text-muted">Recipient gets</p>
              <p className="mt-1 flex items-center justify-between font-display text-[22px] font-semibold tabular">
                171.20 <span className="rounded-full bg-lime px-2.5 py-1 font-sans text-[11px]">USD</span>
              </p>
              <p className="mt-3 text-center text-[10px] text-muted">Illustrative rate</p>
            </div>
          </div>
        </div>

        <div className="mt-24">
          <h3 className="text-[26px] font-semibold sm:text-[32px]">Save When You Send Worldwide</h3>
          {/* Five real steps in order, joined by a track */}
          <ol className="relative mt-10 grid gap-8 lg:grid-cols-5 lg:gap-6">
            <span aria-hidden className="absolute top-6 right-[10%] left-[10%] hidden h-px bg-white/15 lg:block" />
            {SEND_STEPS.map(([title, body], i) => (
              <li key={title} className="relative flex gap-5 lg:block">
                <span className={cx("grid size-12 shrink-0 place-items-center rounded-full font-display text-[14px] font-semibold", i === 0 ? "bg-lime text-ink" : "border border-white/20 bg-forest text-white")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="lg:mt-5">
                  <p className="text-[15.5px] font-semibold">{title}</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Cards: anatomy ─────────────────────────── */

const CALLOUTS = [
  ["7.5M+", "Daily transactions", "left"],
  ["+2%", "Instant cashback on card spend", "left"],
  ["Tap", "Contactless in under a second", "right"],
  ["Live", "Every payment in your passbook instantly", "right"],
];

function Cards() {
  const side = (s) => CALLOUTS.filter((c) => c[2] === s);
  const Callout = ([value, label, s]) => (
    <div key={label} className={cx("flex items-center gap-4", s === "left" ? "lg:flex-row-reverse lg:text-right" : "")}>
      <span aria-hidden className="hidden h-px w-14 bg-forest/30 lg:block" />
      <div>
        <p className="font-display text-[30px] leading-none font-semibold tracking-[-0.03em]">{value}</p>
        <p className="mt-1.5 text-[13.5px] text-muted">{label}</p>
      </div>
    </div>
  );

  return (
    <section id="cards" className="scroll-mt-24 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Cards</Eyebrow>
          <h2 className="mt-3 text-[34px] leading-[1.1] font-semibold text-balance sm:text-[46px]">
            Make Your <HeadlinePill /> Money Move Faster
          </h2>
        </div>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1fr_1.4fr_1fr]">
          <div className="order-2 grid grid-cols-2 gap-8 lg:order-1 lg:grid-cols-1 lg:gap-14">{side("left").map(Callout)}</div>
          <div className="relative order-1 px-4 lg:order-2">
            <div aria-hidden className="absolute inset-x-10 bottom-0 h-16 rounded-full bg-lime/50 blur-3xl" />
            <BankCard
              theme="forest"
              holder="Isabel Navarro"
              last4="4821"
              className="relative mx-auto max-w-[420px] transition-transform duration-500 [transform:perspective(1100px)_rotateX(16deg)_rotateZ(-7deg)] hover:[transform:perspective(1100px)_rotateX(0deg)_rotateZ(0deg)]"
            />
          </div>
          <div className="order-3 grid grid-cols-2 gap-8 lg:grid-cols-1 lg:gap-14">{side("right").map(Callout)}</div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Security: what turning on a key looks like ─────────────────────────── */

function Security() {
  return (
    <section id="security" className="scroll-mt-24 pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="grid gap-14 rounded-[40px] bg-surface p-7 shadow-soft sm:p-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow>Security</Eyebrow>
            <h2 className="mt-3 text-[32px] leading-[1.1] font-semibold sm:text-[42px]">Four keys. One account only you can open.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">Choose any mix of keys from your Security page. Every change is confirmed by email first — and we tell you when it happens.</p>
            <ul className="mt-8 space-y-2">
              {METHOD_ORDER.map((type) => {
                const Icon = METHODS[type].icon;
                return (
                  <li key={type} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                    <Icon className="size-4.5 text-forest" strokeWidth={1.8} aria-hidden />
                    <span className="flex-1 text-[14.5px] font-semibold">{METHODS[type].name}</span>
                    <span className="text-[12.5px] text-muted">{METHODS[type].kind}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* The actual flow, in order */}
          <ol aria-label="Turning on a key" className="relative space-y-4">
            <span aria-hidden className="absolute top-8 bottom-8 left-[27px] w-px border-l-2 border-dashed border-line" />
            <li className="relative flex gap-5">
              <span className="z-10 grid size-14 shrink-0 place-items-center rounded-full bg-lime font-display font-semibold">1</span>
              <div className="flex-1 rounded-[24px] bg-canvas p-5">
                <p className="font-semibold">Flip the switch</p>
                <div aria-hidden className="mt-3 flex items-center justify-between rounded-2xl bg-surface px-4 py-3">
                  <span className="text-[13.5px] font-medium">PHSecure Authenticator</span>
                  <span className="relative inline-flex h-7 w-12 rounded-full bg-forest">
                    <span className="absolute top-1 size-5 translate-x-6 rounded-full bg-lime" />
                  </span>
                </div>
              </div>
            </li>
            <li className="relative flex gap-5">
              <span className="z-10 grid size-14 shrink-0 place-items-center rounded-full bg-forest font-display font-semibold text-lime">2</span>
              <div className="flex-1 rounded-[24px] bg-canvas p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <MailCheck className="size-4 text-forest" aria-hidden /> Confirm with the code we email you
                </p>
                <div aria-hidden className="mt-3 flex gap-1.5">
                  {"482913".split("").map((d, i) => (
                    <span key={i} className={cx("grid h-11 flex-1 place-items-center rounded-xl border border-forest/30 bg-surface font-mono text-[17px]", i === 2 && "mr-1.5")}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </li>
            <li className="relative flex gap-5">
              <span className="z-10 grid size-14 shrink-0 place-items-center rounded-full bg-forest font-display font-semibold text-lime">3</span>
              <div className="flex-1 rounded-[24px] bg-canvas p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <KeyRound className="size-4 text-forest" aria-hidden /> Save your ten Vault Codes
                </p>
                <p aria-hidden className="mt-3 grid grid-cols-2 gap-2 font-mono text-[13px] sm:grid-cols-4">
                  {["SDG2-WDDX", "Z7T4-3G22", "D72H-78GW", "B5U7-HK5Q"].map((c) => (
                    <span key={c} className="rounded-lg bg-surface px-2 py-1.5 text-center">
                      {c}
                    </span>
                  ))}
                </p>
              </div>
            </li>
          </ol>
        </div>

        <ul className="mt-6 flex flex-wrap justify-center gap-3">
          {[
            [ShieldCheck, "Codes are stored hashed, never in plain text"],
            [BellRing, "An email for every security change"],
            [Lock, "Lock your account from any alert"],
          ].map(([Icon, text]) => (
            <li key={text} className="flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-[13px] font-medium shadow-soft">
              <Icon className="size-4 text-forest" aria-hidden /> {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function Landing() {
  const { status } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <div className="overflow-x-clip">
      <header className="sticky top-3 z-40 px-3 sm:px-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 rounded-full border border-line/70 bg-surface/85 pr-2 pl-6 shadow-soft backdrop-blur-md">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center gap-7 md:flex">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="text-[13.5px] font-medium text-muted transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <ButtonLink to="/dashboard" size="sm">
                Go to dashboard
              </ButtonLink>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-2 text-[13.5px] font-medium text-ink hover:bg-mist">
                  Sign in
                </Link>
                <ButtonLink to="/register" size="sm">
                  Open an Account
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <Hero signedIn={signedIn} />
      <Ribbons />
      <Features />
      <Transfers signedIn={signedIn} />
      <Cards />
      <Security />

      <footer id="contact" className="overflow-hidden bg-forest text-white">
        <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <h2 className="max-w-lg text-[36px] leading-[1.08] font-semibold sm:text-[50px]">{signedIn ? "Welcome back." : "Open your account in minutes."}</h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">
                A Private Current account and a Reserve Savings account, ready as soon as you confirm your email.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={signedIn ? "/dashboard" : "/register"} variant="lime" size="lg">
                  {signedIn ? "Go to dashboard" : "Open an Account"}
                </ButtonLink>
                {!signedIn && (
                  <ButtonLink to="/login" variant="on-dark" size="lg">
                    Sign in
                  </ButtonLink>
                )}
              </div>
            </div>
            <nav aria-label="Explore" className="grid grid-cols-2 gap-2.5 text-[14px] lg:justify-self-end">
              {NAV.map(([label, href]) => (
                <a key={href} href={href} className="text-white/75 hover:text-lime">
                  {label}
                </a>
              ))}
            </nav>
          </div>
          {/* Oversized wordmark, cropped by the page's end */}
          <p aria-hidden className="mt-16 -mb-[0.2em] font-display text-[20vw] leading-[0.8] font-bold tracking-[-0.06em] text-lime select-none lg:text-[220px]">
            PHSecure
          </p>
        </div>
        <div className="relative bg-forest">
          <p className="mx-auto max-w-6xl border-t border-white/10 px-4 py-6 text-[12.5px] text-white/50 sm:px-8">
            © 2026 PHSecure Bank. A demonstration app — not a real bank, and it holds no real money.
          </p>
        </div>
      </footer>
    </div>
  );
}
