import { useEffect, useRef, useState } from "react";
import { errorCode, errorDetails, errorMessage } from "../api/client.js";
import { formatSeconds, useCountdown } from "../lib/useCountdown.js";
import OtpInput from "./OtpInput.jsx";
import { Alert, Button, Spinner } from "./ui.jsx";

/**
 * "We sent a code to d•••@gmail.com" + six boxes + resend timer.
 * `send()` requests a code (on mount when autoSend, and for resends); `verify(code)` checks it;
 * `onVerified(result)` receives whatever verify resolved with.
 */
export default function EmailCodeStep({ destination, channel = "email", intro, send, verify, onVerified, autoSend = true, initialResendIn = 60, submitLabel = "Verify code" }) {
  const [sending, setSending] = useState(autoSend);
  const [sentTo, setSentTo] = useState(destination);
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [shake, setShake] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, restart] = useCountdown(autoSend ? 0 : initialResendIn);
  const started = useRef(false);

  async function requestCode() {
    setSending(true);
    setError(null);
    try {
      const result = await send();
      setSentTo(result?.maskedEmail ?? result?.maskedPhone ?? result?.destination ?? sentTo);
      restart(result?.resendIn ?? 60);
    } catch (err) {
      // A cooldown means a code is already on its way — show the timer, not an error.
      if (errorCode(err) === "RESEND_COOLDOWN") restart(errorDetails(err).retryAfter ?? 60);
      else setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (autoSend && !started.current) {
      started.current = true;
      requestCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(value = code) {
    if (value.length !== 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      onVerified(await verify(value));
    } catch (err) {
      setError(errorMessage(err));
      setShake((n) => n + 1);
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  if (sending && !sentTo) {
    return (
      <div className="flex items-center gap-3 py-6 text-[15px] text-muted">
        <Spinner /> Sending your code…
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <p className="text-[15px] leading-relaxed text-muted">
        {intro && <>{intro} </>}
        {sending ? "Sending a code to " : `We ${channel === "sms" ? "texted" : "sent"} a 6-digit code to `}
        <strong className="font-semibold whitespace-nowrap text-ink">{sentTo}</strong>.
      </p>

      <div key={shake} className={shake ? "animate-shake" : undefined}>
        <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={verifying} invalid={Boolean(error)} />
      </div>

      {error && <Alert>{error}</Alert>}

      <Button type="submit" className="w-full" loading={verifying} disabled={code.length !== 6}>
        {submitLabel}
      </Button>

      <p className="text-center text-[13px] text-muted">
        {resendIn > 0 ? (
          <>Didn't get it? You can request a new code in <span className="tabular">{formatSeconds(resendIn)}</span>.</>
        ) : (
          <>
            Didn't get it?{" "}
            <button type="button" onClick={requestCode} disabled={sending} className="font-medium text-ink underline decoration-lime underline-offset-4 hover:decoration-2">
              {sending ? "Sending…" : "Send a new code"}
            </button>
          </>
        )}
      </p>
    </form>
  );
}
