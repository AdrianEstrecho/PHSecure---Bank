import { LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import { Alert, Button } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDateTime } from "../lib/format.js";

/** Reached from "If this wasn't you, lock your account immediately" in security emails. */
export default function LockAccount() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { signOut, status } = useAuth();
  const [lockedUntil, setLockedUntil] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function lock() {
    setBusy(true);
    setError(null);
    try {
      const result = await auth.lock(token);
      setLockedUntil(result.lockedUntil);
      if (status === "authenticated") await signOut();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <LockKeyhole className="size-8 text-danger" strokeWidth={1.4} aria-hidden />
      {lockedUntil ? (
        <>
          <h1 className="mt-4 text-[30px] leading-tight font-semibold">Your account is locked</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Every device has been signed out and no one can sign in until <strong className="text-ink">{formatDateTime(lockedUntil)}</strong>. We've emailed you a
            confirmation. If you need access sooner, call your private banker.
          </p>
          <Link to="/" className="mt-8 inline-block font-medium text-ink underline decoration-lime underline-offset-4">
            Return to PHSecure
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-[30px] leading-tight font-semibold">Lock your account?</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Use this if you got a security email about something you didn't do. We'll sign out every device and block sign-in for 24 hours.
          </p>
          {!token && <Alert className="mt-6">This link is incomplete. Open it again from the security email.</Alert>}
          {error && <Alert className="mt-6">{error}</Alert>}
          <Button variant="danger" size="lg" className="mt-8 w-full" loading={busy} disabled={!token} onClick={lock}>
            Lock my account
          </Button>
          <Link to="/" className="mt-5 block text-center text-[14px] text-muted hover:text-ink">
            It was me — cancel
          </Link>
        </>
      )}
    </AuthShell>
  );
}
