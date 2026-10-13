import BankCard from "./BankCard.jsx";
import Logo from "./Logo.jsx";
import { HeadlinePill } from "./ui.jsx";
import VersionToggle from "./VersionToggle.jsx";

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
            made for <HeadlinePill tone="dark" />
            <br />
            digital users
          </p>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-white/65">
            Every sign-in is finished with a key only you hold — an email code, an authenticator app, your phone, or your fingerprint.
          </p>
        </div>
      </aside>

      <main className="flex flex-col bg-surface">
        {/* Below lg the side panel shrinks to a brand band, and the form starts at the top so the keyboard doesn't shove it around. */}
        <div className="relative overflow-hidden rounded-b-[32px] bg-forest px-5 pt-6 pb-7 sm:px-8 lg:hidden">
          <div aria-hidden className="absolute -top-24 -left-20 size-64 rounded-full bg-lime/20 blur-[90px]" />
          <div aria-hidden className="absolute -right-3 -bottom-16 h-[150px] w-[150px]">
            <BankCard theme="mist" vertical className="absolute top-2 left-0 w-[76px] -rotate-[14deg]" />
            <BankCard theme="forest" vertical className="absolute top-0 left-[54px] w-[84px] rotate-[8deg] ring-1 ring-white/10" />
          </div>
          <Logo tone="dark" className="relative" />
          <p className="relative mt-6 max-w-[13.5rem] font-display text-[22px] leading-[1.18] font-semibold tracking-[-0.025em] text-white sm:max-w-none">
            Digital banking made for <HeadlinePill tone="dark" /> digital users
          </p>
        </div>
        <div className="flex flex-1 flex-col px-5 pt-8 pb-10 sm:px-8 lg:justify-center lg:py-16">
          <div className="mx-auto w-full max-w-[420px]">{children}</div>
        </div>
        <footer className="flex justify-center px-5 pb-6 sm:px-8">
          <VersionToggle />
        </footer>
      </main>
    </div>
  );
}
