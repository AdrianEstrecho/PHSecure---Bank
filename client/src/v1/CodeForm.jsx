import { useEffect, useRef, useState } from "react";
import { errorCode, errorDetails, errorMessage } from "../api/client.js";
import { formatSeconds, useCountdown } from "../lib/useCountdown.js";
import { Button, Field, Input, Message } from "./ui.jsx";

/**
 * Version 1's code entry: one plain field and a resend link.
 * `send()` emails a code (on mount when autoSend, and for resends); `verify(code)` checks it; `onVerified` gets its result.
 */
export default function CodeForm({ send, verify, onVerified, autoSend = true, initialResendIn = 60, submitLabel = "Verify" }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [resendIn, restart] = useCountdown(autoSend ? 0 : initialResendIn);
  const started = useRef(false);

  async function requestCode() {
    setSending(true);
    setError(null);
    try {
      const result = await send();
      restart(result?.resendIn ?? 60);
    } catch (err) {
      // A cooldown means a code is already on its way, so it shows as the wait rather than an error.
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

  async function submit(e) {
    e.preventDefault();
    setVerifying(true);
    setError(null);
    try {
      onVerified(await verify(code));
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Verification code" htmlFor="code">
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="font-mono tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal"
          aria-invalid={Boolean(error) || undefined}
          autoFocus
        />
      </Field>
      {error && <Message>{error}</Message>}
      <Button type="submit" className="w-full" loading={verifying} disabled={code.length !== 6}>
        {submitLabel}
      </Button>
      <p className="text-[13px] text-muted">
        {sending ? (
          "Sending a code…"
        ) : resendIn > 0 ? (
          <>
            You can ask for a new code in <span className="tabular">{formatSeconds(resendIn)}</span>.
          </>
        ) : (
          <button type="button" onClick={requestCode} className="font-medium text-forest underline underline-offset-2 hover:no-underline">
            Send a new code
          </button>
        )}
      </p>
    </form>
  );
}
