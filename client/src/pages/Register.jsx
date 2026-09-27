import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { errorDetails, errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import EmailCodeStep from "../components/EmailCodeStep.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { Alert, Button, Eyebrow, Field, Input, cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { passwordStrength } from "../lib/password.js";

const METER_COLORS = ["bg-danger", "bg-danger", "bg-lime", "bg-success", "bg-success"];

function PasswordMeter({ password }) {
  const { score, label, hint } = passwordStrength(password);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cx("h-1 flex-1 rounded-full transition-colors", password && score >= n ? METER_COLORS[score] : "bg-mist")} />
        ))}
      </div>
      <p className="flex justify-between text-[12.5px] text-muted">
        <span>{hint}</span>
        {label && <span className="font-medium text-ink">{label}</span>}
      </p>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError(null);
    try {
      setPending(await auth.register(form));
    } catch (err) {
      const issues = Array.isArray(errorDetails(err)) ? errorDetails(err) : [];
      if (issues.length) setErrors(Object.fromEntries(issues.map((i) => [i.path, i.message])));
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <AuthShell>
        <Eyebrow className="mb-2">Step 2 of 2</Eyebrow>
        <h1 className="text-[30px] leading-tight font-semibold">Confirm your email</h1>
        <div className="mt-6">
          {pending.sent === false && <Alert className="mb-5">We couldn't send your code just now. Use "Send a new code" below.</Alert>}
          <EmailCodeStep
            destination={pending.maskedEmail}
            autoSend={false}
            initialResendIn={pending.sent === false ? 0 : (pending.resendIn ?? 60)}
            send={() => auth.resendVerification(pending.verificationToken)}
            verify={(code) => auth.verifyEmail(pending.verificationToken, code)}
            onVerified={(session) => {
              signIn(session);
              navigate("/dashboard", { replace: true });
            }}
            submitLabel="Confirm and open my account"
          />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Eyebrow className="mb-2">Step 1 of 2</Eyebrow>
      <h1 className="text-[30px] leading-tight font-semibold">Open your account</h1>
      <p className="mt-2 text-[15px] text-muted">You'll get a Private Current account and a Reserve Savings account.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} aria-invalid={Boolean(errors.fullName) || undefined} required />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={Boolean(errors.email) || undefined} required />
        </Field>
        <Field label="Mobile number" htmlFor="phone" optional error={errors.phone} hint="Include your country code, e.g. +63 917 123 4567.">
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+63" value={form.phone} onChange={set("phone")} aria-invalid={Boolean(errors.phone) || undefined} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set("password")} aria-invalid={Boolean(errors.password) || undefined} required />
        </Field>
        <PasswordMeter password={form.password} />

        {formError && <Alert>{formError}</Alert>}

        <Button type="submit" className="w-full" size="lg" loading={busy}>
          Create account
        </Button>
      </form>
      <GoogleButton />

      <p className="mt-8 text-center text-[14px] text-muted">
        Already a client?{" "}
        <Link to="/login" className="font-medium text-ink underline decoration-lime underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
