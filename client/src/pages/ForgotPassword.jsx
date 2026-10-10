import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { errorCode, errorMessage, fieldErrors } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import EmailCodeStep from "../components/EmailCodeStep.jsx";
import NewPasswordFields from "../components/NewPasswordFields.jsx";
import { Alert, Button, Eyebrow, Field, Input } from "../components/ui.jsx";

const backToSignIn = (
  <p className="mt-8 text-center text-[14px] text-muted">
    Remembered it?{" "}
    <Link to="/login" className="font-medium text-ink underline decoration-lime underline-offset-4">
      Sign in
    </Link>
  </p>
);

/** Email → emailed code → new password, then back to sign-in (where 2FA still applies). */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [resendIn, setResendIn] = useState(60);
  const [resetToken, setResetToken] = useState(null);
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function startAgain() {
    setResetToken(null);
    setForm({ newPassword: "", confirmPassword: "" });
    setErrors({});
    setFormError(null);
    setExpired(false);
    setStep("email");
  }

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      setResendIn((await auth.forgotPassword(email)).resendIn);
      setStep("code");
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    if (form.newPassword !== form.confirmPassword) {
      setErrors({ confirmPassword: "The new passwords don't match." });
      return;
    }

    setBusy(true);
    try {
      await auth.resetPassword(resetToken, form.newPassword);
      navigate("/login", { replace: true, state: { email: email.trim(), notice: "Your password has been reset. Sign in with your new password." } });
    } catch (err) {
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setFormError(errorMessage(err));
      setExpired(errorCode(err) === "PASSWORD_RESET_EXPIRED");
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <AuthShell>
        <Eyebrow className="mb-2">Step 2 of 3</Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold">Check your email</h1>
        <div className="mt-6">
          <EmailCodeStep
            destination={email.trim()}
            autoSend={false}
            initialResendIn={resendIn}
            sentText={(to) => <>If {to} has a PHSecure account, we've sent it a 6-digit code.</>}
            send={() => auth.forgotPassword(email)}
            verify={(code) => auth.verifyResetCode(email, code)}
            onVerified={(result) => {
              setResetToken(result.resetToken);
              setStep("password");
            }}
            submitLabel="Continue"
          />
        </div>
        <p className="mt-8 text-center text-[14px] text-muted">
          Wrong address?{" "}
          <button type="button" onClick={startAgain} className="font-medium text-ink underline decoration-lime underline-offset-4">
            Use a different email
          </button>
        </p>
      </AuthShell>
    );
  }

  if (step === "password") {
    return (
      <AuthShell>
        <Eyebrow className="mb-2">Step 3 of 3</Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold">Choose a new password</h1>
        <p className="mt-2 text-[15px] text-muted">This signs you out on every device. If you use two-factor authentication, you'll still need it to sign in.</p>

        <form onSubmit={savePassword} className="mt-8 space-y-5" noValidate>
          <NewPasswordFields form={form} set={set} errors={errors} />
          {formError && (
            <Alert>
              {formError}
              {expired && (
                <>
                  {" "}
                  <button type="button" onClick={startAgain} className="font-semibold underline underline-offset-2">
                    Start again
                  </button>
                </>
              )}
            </Alert>
          )}
          <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!form.newPassword || !form.confirmPassword}>
            Reset password
          </Button>
        </form>
        {backToSignIn}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Eyebrow className="mb-2">Step 1 of 3</Eyebrow>
      <h1 className="text-[30px] leading-tight font-semibold">Forgot your password?</h1>
      <p className="mt-2 text-[15px] text-muted">Enter the email you bank with and we'll send you a code to set a new one.</p>

      <form onSubmit={sendCode} className="mt-8 space-y-5" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email) || undefined} required />
        </Field>
        {formError && <Alert>{formError}</Alert>}
        <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!email.trim()}>
          Send code
        </Button>
      </form>
      {backToSignIn}
    </AuthShell>
  );
}
