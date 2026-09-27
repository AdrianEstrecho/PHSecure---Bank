import { LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";
import Modal from "./Modal.jsx";
import { Button, cx } from "./ui.jsx";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/accounts", label: "Accounts" },
  { to: "/transfers", label: "Transfers" },
  { to: "/profile", label: "Profile", end: true },
  { to: "/security", label: "Security" },
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const { pathname } = useLocation();

  // From the phone menu too: the menu closes so the confirmation isn't stacked on top of it.
  const askToSignOut = () => {
    setOpen(false);
    setConfirmingSignOut(true);
  };

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-8 px-4 sm:px-8">
          <Logo to="/dashboard" />
          <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-canvas p-1 lg:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx("rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors", isActive ? "bg-forest text-white" : "text-muted hover:text-ink")
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <span aria-hidden className="grid size-10 place-items-center rounded-full bg-lime text-[13px] font-semibold text-ink">
              {initials(user?.fullName)}
            </span>
            <p className="leading-tight">
              <span className="block text-[13.5px] font-semibold text-ink">{user?.fullName}</span>
              <span className="block text-[12px] text-muted">{user?.maskedEmail}</span>
            </p>
            <button
              type="button"
              onClick={askToSignOut}
              className="ml-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-medium text-ink transition-colors hover:border-ink"
            >
              <LogOut className="size-3.5" aria-hidden /> Sign out
            </button>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="-mr-2 ml-auto rounded-full p-2 text-ink lg:hidden" aria-label="Open menu" aria-expanded={open}>
            <Menu className="size-6" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 flex animate-rise flex-col overflow-hidden bg-forest px-6 pt-5 pb-8 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div aria-hidden className="absolute -right-24 -bottom-24 size-72 rounded-full border-[40px] border-lime/15" />
          <div className="relative flex items-center justify-between">
            <Logo tone="dark" to="/dashboard" />
            <button type="button" onClick={() => setOpen(false)} className="-mr-2 rounded-full p-2 text-white" aria-label="Close menu">
              <X className="size-6" />
            </button>
          </div>
          <nav aria-label="Main" className="relative mt-10 flex-1">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cx("block py-3 font-display text-[32px] leading-tight font-semibold", isActive ? "text-lime" : "text-white")}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="relative flex items-center gap-3 border-t border-white/15 pt-5">
            <span aria-hidden className="grid size-11 place-items-center rounded-full bg-lime text-[14px] font-semibold text-ink">
              {initials(user?.fullName)}
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-white">{user?.fullName}</p>
              <p className="text-[13px] text-white/55">{user?.maskedEmail}</p>
            </div>
            <button type="button" onClick={askToSignOut} className="rounded-full border border-white/25 px-4 py-2 text-[13px] font-medium text-white">
              Sign out
            </button>
          </div>
        </div>
      )}

      {confirmingSignOut && (
        <Modal title="Sign out of PHSecure?" onClose={() => setConfirmingSignOut(false)}>
          <p className="text-[15px] leading-relaxed text-muted">You'll need to sign in again to see your accounts.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setConfirmingSignOut(false)} data-autofocus>
              Stay signed in
            </Button>
            <Button
              onClick={() => {
                setConfirmingSignOut(false);
                signOut();
              }}
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </div>
        </Modal>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8 lg:py-12">
        <Outlet />
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-8 text-[12px] text-muted sm:px-8">PHSecure Bank · A demonstration app — no real money is held.</footer>
    </div>
  );
}
