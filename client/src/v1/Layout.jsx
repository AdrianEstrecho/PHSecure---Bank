import { Link } from "react-router";
import VersionToggle from "../components/VersionToggle.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, buttonClass } from "./ui.jsx";

/** Version 1's page frame: a plain top bar, the page, and a footer with the version switch. */
export default function Layout({ children }) {
  const { status, user, signOut } = useAuth();
  const signedIn = status === "authenticated";

  return (
    <div className="v1 flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to={signedIn ? "/dashboard" : "/"} className="text-[17px] font-bold whitespace-nowrap text-forest">
            PHSecure Bank
          </Link>
          {signedIn ? (
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden truncate text-[13.5px] text-muted sm:block">{user.fullName}</span>
              <Button variant="secondary" onClick={signOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <nav aria-label="Account" className="flex items-center gap-2">
              <Link to="/login" className={buttonClass("secondary")}>
                Sign in
              </Link>
              {/* Too wide for a small phone beside the name; the sign-in page links to it. */}
              <span className="hidden sm:block">
                <Link to="/register" className={buttonClass("primary")}>
                  Register
                </Link>
              </span>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 text-[12.5px] text-muted sm:px-6">
          <VersionToggle />
          <p>PHSecure Bank · Version 1, the early build: email verification is the only sign-in check.</p>
        </div>
      </footer>
    </div>
  );
}
