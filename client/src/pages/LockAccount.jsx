import { Check, Copy, Download, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import { Alert, Button } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { downloadText } from "../lib/download.js";
import { formatDateTime } from "../lib/format.js";

/** The one-time code that lifts this lock early. The server never shows or emails it again. */
function UnlockCode({ code, lockedUntil }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const download = () =>
    downloadText("phsecure-unlock-code.txt", [
      "PHSecure Bank — Unlock Code",
      `Created ${formatDateTime(new Date())}`,
      "",
      code,
      "",
      `Your account is locked until ${formatDateTime(lockedUntil)}. To unlock it sooner, enter this code with your email at ${window.location.origin}/unlock.`,
      "It works once. Keep this file somewhere only you can reach.",
    ]);

  return (
    <div className="mt-8 space-y-4">
      <p className="text-[15px] leading-relaxed text-muted">
        Need access before then? This one-time code unlocks your account early — enter it with your email when you next sign in.{" "}
        <strong className="font-semibold text-ink">This is the only time we'll show it.</strong> We never email it, in case someone else can read your email.
      </p>

      <p className="rounded-xl border border-dashed border-ink/30 bg-white px-5 py-4 text-center font-mono text-[20px] tracking-[0.12em] text-ink tabular" aria-label="Unlock code">
        {code}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={download}>
          <Download className="size-4" aria-hidden /> Download
        </Button>
        <Button variant="outline" onClick={copy}>
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>
    </div>
  );
}

/** Reached from "If this wasn't you, lock your account immediately" in security emails. */
export default function LockAccount() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { signOut, status } = useAuth();
  const [locked, setLocked] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function lock() {
    setBusy(true);
    setError(null);
    try {
      setLocked(await auth.lock(token));
      if (status === "authenticated") await signOut();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const until = locked && <strong className="text-ink">{formatDateTime(locked.lockedUntil)}</strong>;

  return (
    <AuthShell>
      <LockKeyhole className="size-8 text-danger" strokeWidth={1.4} aria-hidden />
      {locked ? (
        <>
          <h1 className="mt-4 text-[30px] leading-tight font-semibold">Your account is locked</h1>
          {locked.alreadyLocked ? (
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Your account was already locked, and no one can sign in until {until}. To unlock it sooner, use the unlock code we showed you when you locked it.
            </p>
          ) : (
            <>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">
                Every device has been signed out and no one can sign in until {until}. We've emailed you a confirmation.
              </p>
              <UnlockCode code={locked.unlockCode} lockedUntil={locked.lockedUntil} />
            </>
          )}
          <Link to="/" className="mt-8 inline-block font-medium text-ink underline decoration-lime underline-offset-4">
            Return to PHSecure
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-[30px] leading-tight font-semibold">Lock your account?</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Use this if you got a security email about something you didn't do. We'll sign out every device and block sign-in for 24 hours, and give you a one-time code to unlock it
            sooner.
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
