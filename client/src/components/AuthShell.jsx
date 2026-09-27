import BankCard from "./BankCard.jsx";
import Logo from "./Logo.jsx";
import { HeadlinePill } from "./ui.jsx";

/** Split layout for sign-in, registration and 2FA: forest panel with the card fan, form on the right. */
export default function AuthShell({ children }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-forest p-12 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -top-32 -left-32 size-[380px] rounded-full bg-lime/20 blur-[110px]" />
        <Logo tone="dark" className="relative" />

        <div aria-hidden className="relative mx-auto h-[330px] w-[340px]">
          <div className="absolute bottom-0 left-1/2 h-[160px] w-[330px] -translate-x-1/2 rounded-t-full bg-white/[0.06]" />
          <BankCard theme="light" vertical className="absolute top-[64px] left-[2%] w-[130px] -rotate-[22deg]" />
          <BankCard theme="mist" vertical className="absolute top-[36px] left-[21%] w-[134px] -rotate-[10deg]" />
          <BankCard theme="forest" vertical className="absolute top-0 left-[42%] w-[150px] rotate-[7deg] ring-1 ring-white/10" />
        </div>

        <div className="relative">
          <p className="font-display text-[34px] leading-[1.12] font-semibold tracking-[-0.025em] text-white">
            Digital banking
            <br />
            made for <HeadlinePill />
            <br />
            digital users
          </p>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white/65">
            Every sign-in is finished with a key only you hold — an email code, an authenticator app, your phone, or your fingerprint.
          </p>
        </div>
      </aside>

      <main className="flex flex-col bg-surface px-4 py-6 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
