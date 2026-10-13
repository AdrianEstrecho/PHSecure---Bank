import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import CodeForm from "./CodeForm.jsx";
import Layout from "./Layout.jsx";
import { AuthBox, Button, Field, GoogleLink, Input, Message, TextLink } from "./ui.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState(null);

  const finish = (session) => {
    signIn(session);
    navigate("/dashboard", { replace: true });
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await auth.login(email, password, { emailCodeOnly: true });
      if (result.requiresEmailVerification) setVerification(result);
      else navigate("/login/verify", { state: { challenge: result } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (verification) {
    return (
      <Layout>
        <AuthBox
          title="Confirm your email"
          intro={
            <>
              Your email isn't confirmed yet. Enter the code we sent to <strong className="text-ink">{verification.maskedEmail}</strong>.
            </>
          }
        >
          <CodeForm
            autoSend={false}
            initialResendIn={verification.resendIn ?? 60}
            send={() => auth.resendVerification(verification.verificationToken)}
            verify={(code) => auth.verifyEmail(verification.verificationToken, code)}
            onVerified={finish}
            submitLabel="Confirm and sign in"
          />
        </AuthBox>
      </Layout>
    );
  }

  return (
    <Layout>
      <AuthBox title="Sign in" intro="Use your email and password. We'll then email you a code to finish signing in.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <Message>{error}</Message>}
          <Button type="submit" className="w-full" loading={busy}>
            Sign in
          </Button>
        </form>
        <GoogleLink />
        <p className="mt-6 text-[13.5px] text-muted">
          No account yet?{" "}
          <TextLink as={Link} to="/register">
            Register
          </TextLink>
        </p>
      </AuthBox>
    </Layout>
  );
}
