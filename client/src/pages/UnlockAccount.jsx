import { LockKeyholeOpen } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { errorMessage, fieldErrors } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import { Alert, Button, Field, Input } from "../components/ui.jsx";

// Normalise to XXXX-XXXX-XXXX as the user types or pastes.
const formatCode = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12)
    .replace(/(.{4})(?=.)/g, "$1-");

/**
 * Lifts a lock early with its one-time unlock code: from the lock email after failed attempts, or from the
 * screen shown when the owner locked the account. Reached from the sign-in screens and the lock emails.
 */
export default function UnlockAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      await auth.unlock(email, code);
      navigate("/login", { replace: true, state: { email: email.trim(), notice: "Your account is unlocked. Sign in to continue." } });
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <LockKeyholeOpen className="size-8 text-forest" strokeWidth={1.4} aria-hidden />
      <h1 className="mt-4 text-[30px] leading-tight font-semibold">Unlock your account</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        Enter your email and your one-time unlock code. If your account locked after too many attempts, the code is in the email we sent you. If you locked it yourself, it's the code we
        showed you then.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email) || undefined} required />
        </Field>
        <Field label="Unlock code" htmlFor="unlock-code" error={errors.code}>
          <Input
            id="unlock-code"
            value={code}
            onChange={(e) => setCode(formatCode(e.target.value))}
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="font-mono text-[18px] tracking-[0.12em]"
            aria-invalid={Boolean(errors.code) || undefined}
          />
        </Field>
        {formError && <Alert>{formError}</Alert>}
        <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!email.trim() || code.length !== 14}>
          Unlock account
        </Button>
      </form>

      <p className="mt-8 text-center text-[14px] text-muted">
        No code? Your account unlocks on its own when the lock ends.{" "}
        <Link to="/login" className="font-medium text-ink underline decoration-lime underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
