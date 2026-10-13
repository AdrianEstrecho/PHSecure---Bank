import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { errorMessage, fieldErrors } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import CodeForm from "./CodeForm.jsx";
import Layout from "./Layout.jsx";
import { AuthBox, Button, Field, GoogleLink, Input, Message, TextLink } from "./ui.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
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
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <Layout>
        <AuthBox
          title="Confirm your email"
          intro={
            <>
              Enter the 6-digit code we sent to <strong className="text-ink">{pending.maskedEmail}</strong> to open your account.
            </>
          }
        >
          {pending.sent === false && <Message className="mb-4">We couldn't send your code just now. Use "Send a new code" below.</Message>}
          <CodeForm
            autoSend={false}
            initialResendIn={pending.sent === false ? 0 : (pending.resendIn ?? 60)}
            send={() => auth.resendVerification(pending.verificationToken)}
            verify={(code) => auth.verifyEmail(pending.verificationToken, code)}
            onVerified={(session) => {
              signIn(session);
              navigate("/dashboard", { replace: true });
            }}
            submitLabel="Confirm email"
          />
        </AuthBox>
      </Layout>
    );
  }

  return (
    <Layout>
      <AuthBox title="Create an account" intro="We'll email you a code to confirm your address.">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
            <Input id="fullName" autoComplete="name" value={form.fullName} onChange={set("fullName")} aria-invalid={Boolean(errors.fullName) || undefined} required />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={Boolean(errors.email) || undefined} required />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password} hint="At least 10 characters, with a letter and a number.">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              aria-invalid={Boolean(errors.password) || undefined}
              required
            />
          </Field>
          {formError && <Message>{formError}</Message>}
          <Button type="submit" className="w-full" loading={busy}>
            Create account
          </Button>
        </form>
        <GoogleLink />
        <p className="mt-6 text-[13.5px] text-muted">
          Already have an account?{" "}
          <TextLink as={Link} to="/login">
            Sign in
          </TextLink>
        </p>
      </AuthBox>
    </Layout>
  );
}
