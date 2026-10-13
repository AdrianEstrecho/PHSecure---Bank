import { useState } from "react";
import { Link } from "react-router";
import { errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import CodeForm from "./CodeForm.jsx";
import { NeedsVersion2, useFinishSignIn } from "./finishSignIn.jsx";
import Layout from "./Layout.jsx";
import { AuthBox, Button, Field, GoogleLink, Input, Message, TextLink } from "./ui.jsx";

export default function Login() {
  const finish = useFinishSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [verification, setVerification] = useState(null);
  const [needsVersion2, setNeedsVersion2] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNeedsVersion2(false);
    try {
      const result = await auth.login(email, password);
      if (result.requiresEmailVerification) setVerification(result);
      else setNeedsVersion2(!finish(result));
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
      <AuthBox title="Sign in" intro="Use your email and password. If you've turned on email verification, we'll then email you a code.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <Message>{error}</Message>}
          {needsVersion2 && <NeedsVersion2 />}
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
