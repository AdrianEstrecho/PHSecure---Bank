import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { errorCode, errorMessage } from "../api/client.js";
import { twofa } from "../api/endpoints.js";
import SetupExpired, { isSetupExpired } from "./SetupExpired.jsx";
import { Alert, Button, Field, Input } from "./ui.jsx";

function guessDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "This device";
}

/** Friendly text for the errors browsers raise during a WebAuthn ceremony. */
export function passkeyErrorMessage(err) {
  if (err?.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || err?.name === "InvalidStateError") {
    return "This device already holds a passkey for your account.";
  }
  if (err?.name === "NotAllowedError" || err?.code === "ERROR_CEREMONY_ABORTED") {
    return "The passkey request was cancelled or timed out. Try again when you're ready.";
  }
  return errorMessage(err, err?.message ?? "Your browser couldn't complete the passkey request.");
}

export default function PasskeySetup({ setupToken, onConfirmed, onRestart, adding = false }) {
  const [deviceName, setDeviceName] = useState(guessDeviceName);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(null);
  const [busy, setBusy] = useState(false);
  const supported = browserSupportsWebAuthn();

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const optionsJSON = await twofa.passkeyOptions(setupToken);
      const credential = await startRegistration({ optionsJSON });
      onConfirmed(await twofa.enableConfirm({ setupToken, credential, deviceName: deviceName.trim() || "Passkey" }));
    } catch (err) {
      if (isSetupExpired(errorCode(err))) setExpired(errorMessage(err));
      else setError(passkeyErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (expired) return <SetupExpired message={expired} onRestart={onRestart} />;
  if (!supported) return <Alert>This browser can't create passkeys. Try a recent version of Safari, Chrome, Edge or Firefox.</Alert>;

  return (
    <form onSubmit={create} className="space-y-5">
      <div className="flex gap-4 rounded-xl border border-line bg-canvas/60 p-4">
        <Fingerprint className="size-8 shrink-0 text-forest" aria-hidden strokeWidth={1.4} />
        <p className="text-[14px] leading-relaxed text-muted">
          Your device will ask for Face ID, Touch ID, Windows Hello, your screen lock or a security key. Your fingerprint and face never leave the device — we only store a
          public key.
        </p>
      </div>
      <Field label="Name this passkey" htmlFor="passkey-name" hint="So you can tell your passkeys apart later.">
        <Input id="passkey-name" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} maxLength={40} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" className="w-full" loading={busy}>
        {adding ? "Add passkey" : "Create passkey"}
      </Button>
    </form>
  );
}
