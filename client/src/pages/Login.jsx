import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import EmailCodeStep from "../components/EmailCodeStep.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import { Alert, Button, Field, Input } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const from = location.state?.from ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await auth.login(email, password);
      if (result.requires2FA) navigate("/login/verify", { state: { challenge: result, from } });
      else if (result.requiresEmailVerification) setVerification(result);
      else {
        signIn(result);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (verification) {
    return (
      <AuthShell>
        <h1 className="text-[30px] leading-tight font-semibold">Confirm your email first</h1>
        <div className="mt-6">
          <EmailCodeStep
            destination={verification.maskedEmail}
            intro="Your email address isn't confirmed yet."
            autoSend={false}
            initialResendIn={verification.resendIn ?? 60}
            send={() => auth.resendVerification(verification.verificationToken)}
            verify={(code) => auth.verifyEmail(verification.verificationToken, code)}
            onVerified={(session) => {
              signIn(session);
              navigate(from, { replace: true });
            }}
            submitLabel="Confirm and sign in"
          />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-[32px] leading-tight font-semibold">Welcome back</h1>
      <p className="mt-2 text-[15px] text-muted">Sign in to your PHSecure account.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          Sign in
        </Button>
      </form>
      <GoogleButton />

      <p className="mt-8 text-center text-[14px] text-muted">
        New to PHSecure?{" "}
        <Link to="/register" className="font-medium text-ink underline decoration-lime underline-offset-4">
          Open an account
        </Link>
      </p>

      {import.meta.env.DEV && (
        <p className="mt-10 rounded-lg border border-dashed border-line px-4 py-3 text-center text-[12.5px] text-muted">
          Development demo: <span className="font-mono text-ink">demo@example.com</span> / <span className="font-mono text-ink">PHSecure-2026</span>
        </p>
      )}
    </AuthShell>
  );
}
