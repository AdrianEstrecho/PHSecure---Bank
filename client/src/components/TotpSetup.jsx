import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorCode, errorMessage } from "../api/client.js";
import { twofa } from "../api/endpoints.js";
import OtpInput from "./OtpInput.jsx";
import SetupExpired, { isSetupExpired } from "./SetupExpired.jsx";
import { Alert, Button, Spinner } from "./ui.jsx";

export default function TotpSetup({ setupToken, onConfirmed, onRestart }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    twofa
      .totpSetup(setupToken)
      .then(setSetup)
      .catch((err) => (isSetupExpired(errorCode(err)) ? setExpired(errorMessage(err)) : setError(errorMessage(err))));
  }, [setupToken]);

  async function submit(value = code) {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      onConfirmed(await twofa.enableConfirm({ setupToken, code: value }));
    } catch (err) {
      if (isSetupExpired(errorCode(err))) setExpired(errorMessage(err));
      else setError(errorMessage(err));
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  if (expired) return <SetupExpired message={expired} onRestart={onRestart} />;
  if (!setup) {
    return error ? (
      <Alert>{error}</Alert>
    ) : (
      <div className="flex items-center gap-3 py-6 text-muted">
        <Spinner /> Preparing your key…
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      <section className="space-y-3">
        <h3 className="font-sans text-[14px] font-semibold">1. Scan this QR code with your authenticator app</h3>
        <div className="flex justify-center">
          <div className="relative rounded-xl border border-line bg-white p-3">
            <img src={setup.qrCode} alt="QR code for linking your authenticator app" className="size-44" />
            {/* Gold corner marks frame the code like a document seal. */}
            <span aria-hidden className="absolute -top-px -left-px size-4 border-t-2 border-l-2 border-lime" />
            <span aria-hidden className="absolute -right-px -bottom-px size-4 border-r-2 border-b-2 border-lime" />
          </div>
        </div>
        <details className="group rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13.5px]">
          <summary className="cursor-pointer font-medium text-ink marker:text-forest">Can't scan? Enter a setup key instead</summary>
          <div className="mt-3 flex items-center justify-between gap-3">
            <code className="font-mono text-[14px] text-ink">{setup.secret}</code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(setup.secret.replace(/ /g, ""));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 rounded-md p-2 text-muted hover:bg-mist hover:text-ink"
              aria-label="Copy setup key"
            >
              {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            </button>
          </div>
          <p className="mt-2 text-muted">Choose "time-based" if your app asks.</p>
        </details>
      </section>

      <section className="space-y-3">
        <h3 className="font-sans text-[14px] font-semibold">2. Enter the 6-digit code your app shows</h3>
        <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={verifying} invalid={Boolean(error)} label="Authenticator code" />
        {error && <Alert>{error}</Alert>}
      </section>

      <Button type="submit" className="w-full" loading={verifying} disabled={code.length !== 6}>
        Turn on PHSecure Authenticator
      </Button>
    </form>
  );
}
