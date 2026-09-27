import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { ChevronRight, Fingerprint, KeyRound } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { errorCode, errorMessage } from "../api/client.js";
import { auth } from "../api/endpoints.js";
import AuthShell from "../components/AuthShell.jsx";
import EmailCodeStep from "../components/EmailCodeStep.jsx";
import OtpInput from "../components/OtpInput.jsx";
import { passkeyErrorMessage } from "../components/PasskeySetup.jsx";
import { Alert, Button, Eyebrow, Field, Input } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { METHODS, VAULT } from "../lib/methods.js";

const TITLES = {
  EMAIL: "Check your email",
  SMS: "Check your phone",
  TOTP: "Open your authenticator",
  PASSKEY: "Use your passkey",
  VAULT: "Use a Vault Code",
};

// Errors after which this challenge can't continue.
const TERMINAL = new Set(["ACCOUNT_LOCKED", "LOGIN_CHALLENGE_EXPIRED"]);

function TotpForm({ verify }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(value = code) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    const message = await verify({ code: value });
    if (message) {
      setError(message);
      setCode("");
    }
    setBusy(false);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <p className="text-[15px] leading-relaxed text-muted">Enter the 6-digit code your app shows for PHSecure Bank.</p>
      <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={busy} invalid={Boolean(error)} label="Authenticator code" />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" className="w-full" loading={busy} disabled={code.length !== 6}>
        Verify code
      </Button>
    </form>
  );
}

function VaultForm({ verify }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Normalise to XXXX-XXXX as the user types.
  const format = (value) => {
    const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const message = await verify({ code });
    if (message) setError(message);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-[15px] leading-relaxed text-muted">Enter one of the ten codes you saved when you turned on two-factor authentication. Each code works once.</p>
      <Field label="Vault Code" htmlFor="vault-code" error={error}>
        <Input
          id="vault-code"
          value={code}
          onChange={(e) => setCode(format(e.target.value))}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-[18px] tracking-[0.12em]"
          aria-invalid={Boolean(error) || undefined}
        />
      </Field>
      <Button type="submit" className="w-full" loading={busy} disabled={code.length !== 9}>
        Use Vault Code
      </Button>
    </form>
  );
}

function PasskeyForm({ challengeToken, verify }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const optionsJSON = await auth.passkeyOptions(challengeToken);
      const credential = await startAuthentication({ optionsJSON });
      const message = await verify({ credential });
      if (message) setError(message);
    } catch (err) {
      setError(passkeyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!browserSupportsWebAuthn()) return <Alert>This browser can't use passkeys. Choose another method below.</Alert>;

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-muted">Confirm with Face ID, Touch ID, Windows Hello or your security key.</p>
      {error && <Alert>{error}</Alert>}
      <Button className="w-full" size="lg" loading={busy} onClick={start}>
        <Fingerprint className="size-5" aria-hidden /> Use my passkey
      </Button>
    </div>
  );
}

export default function TwoFactorChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const challenge = location.state?.challenge;
  const [method, setMethod] = useState(challenge?.default);
  const [showOthers, setShowOthers] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [fatal, setFatal] = useState(null);

  if (!challenge) return <Navigate to="/login" replace />;
  const { challengeToken, methods, maskedEmail, maskedPhone } = challenge;

  const complete = (session) => {
    signIn(session);
    navigate(location.state?.from ?? "/dashboard", { replace: true });
  };

  const stopIfTerminal = (err) => {
    if (TERMINAL.has(errorCode(err))) setFatal(errorMessage(err));
    throw err;
  };

  /** Resolves with an error message for the form to show, or signs in. */
  async function verify(payload) {
    try {
      complete(await auth.verify2fa({ challengeToken, method, trustDevice, ...payload }).catch(stopIfTerminal));
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  const choose = (next) => {
    setMethod(next);
    setShowOthers(false);
  };

  if (fatal) {
    return (
      <AuthShell>
        <h1 className="text-[30px] leading-tight font-semibold">Sign-in stopped</h1>
        <Alert className="mt-6">{fatal}</Alert>
        <Link to="/login" className="mt-6 inline-block font-medium text-ink underline decoration-lime underline-offset-4">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  const others = [...methods.filter((m) => m !== method), ...(method === "VAULT" ? [] : ["VAULT"])];

  return (
    <AuthShell>
      <Eyebrow className="mb-2">Two-factor authentication</Eyebrow>
      <h1 className="text-[30px] leading-tight font-semibold">{TITLES[method]}</h1>
      <p className="mt-1 text-[14px] text-muted">{method === "VAULT" ? VAULT.name : METHODS[method].name}</p>

      <div className="mt-6">
        {(method === "EMAIL" || method === "SMS") && (
          <EmailCodeStep
            key={method}
            channel={method === "SMS" ? "sms" : "email"}
            destination={method === "SMS" ? maskedPhone : maskedEmail}
            send={() => auth.send2fa(challengeToken, method).catch(stopIfTerminal)}
            verify={(code) => auth.verify2fa({ challengeToken, method, code, trustDevice }).catch(stopIfTerminal)}
            onVerified={complete}
          />
        )}
        {method === "TOTP" && <TotpForm verify={verify} />}
        {method === "PASSKEY" && <PasskeyForm challengeToken={challengeToken} verify={verify} />}
        {method === "VAULT" && <VaultForm verify={verify} />}
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} className="mt-0.5 size-4 accent-forest" />
        <span className="text-[14px] leading-snug">
          <span className="font-medium text-ink">Trust this device for 30 days</span>
          <span className="block text-[13px] text-muted">Skip this step on this browser. Only choose this on a device you don't share.</span>
        </span>
      </label>

      <div className="mt-6 border-t border-line pt-5">
        <button
          type="button"
          onClick={() => setShowOthers((v) => !v)}
          aria-expanded={showOthers}
          className="text-[14px] font-medium text-ink underline decoration-lime underline-offset-4 hover:decoration-2"
        >
          Try another method
        </button>
        {showOthers && (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {others.map((type) => {
              const meta = type === "VAULT" ? { ...VAULT, kind: "Recovery code" } : METHODS[type];
              const Icon = type === "VAULT" ? KeyRound : meta.icon;
              return (
                <li key={type}>
                  <button type="button" onClick={() => choose(type)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-canvas">
                    <Icon className="size-5 text-forest" strokeWidth={1.6} aria-hidden />
                    <span className="flex-1">
                      <span className="block text-[14.5px] font-medium text-ink">{type === "VAULT" ? "Use a Vault Code" : meta.name}</span>
                      <span className="block text-[12.5px] text-muted">
                        {type === "EMAIL" ? maskedEmail : type === "SMS" ? maskedPhone : meta.kind}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AuthShell>
  );
}
