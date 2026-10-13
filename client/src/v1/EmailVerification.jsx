import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { twofa } from "../api/endpoints.js";
import { cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLoad } from "../lib/useLoad.js";
import CodeForm from "./CodeForm.jsx";
import { Box, Button, Field, Input, Message } from "./ui.jsx";

// Turning it on: an emailed code. Version 1 has no Vault Codes, so none are made.
async function turnOn(code) {
  const { setupToken } = await twofa.enableVerifyEmail("EMAIL", code);
  return twofa.enableConfirm({ setupToken, createVaultCodes: false });
}

/**
 * Version 1's one security setting: an emailed code at every sign-in, on or off. It's the same switch as version 2's
 * PHSecure Mail Key. Turning it on takes an emailed code; turning it off takes the password (if the account has
 * one) and then an emailed code.
 */
export default function EmailVerification() {
  const { user, updateUser } = useAuth();
  const { data: status, error, setData } = useLoad(twofa.status);
  const [step, setStep] = useState(null); // null | "on" | "password" | "off"
  const [password, setPassword] = useState("");
  const [request, setRequest] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  if (error) return <Message className="mt-6">{error}</Message>;
  if (!status) return null;

  const on = status.methods.find((m) => m.type === "EMAIL").enabled;
  // Keys added in version 2 (authenticator app, text message, passkey) can't be used here.
  const otherKeys = status.twoFactorOn && !on;

  const finished = (message) => (result) => {
    setData(result.status);
    updateUser({ twoFactorOn: result.status.twoFactorOn, defaultMethod: result.status.defaultMethod });
    setNotice(message);
    setPassword("");
    setRequest(null);
    setStep(null);
  };

  const cancel = () => {
    setPassword("");
    setRequest(null);
    setPasswordError(null);
    setStep(null);
  };

  function start() {
    setNotice(null);
    // Accounts opened with Google have no password, so the emailed code alone confirms it's them.
    setStep(on ? (user.hasPassword ? "password" : "off") : "on");
  }

  async function submitPassword(e) {
    e.preventDefault();
    setBusy(true);
    setPasswordError(null);
    try {
      setRequest(await twofa.disableRequest("EMAIL", password));
      setStep("off");
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const sentTo = (
    <>
      Enter the code we emailed to <strong className="text-ink">{status.maskedEmail}</strong> to confirm it's you.
    </>
  );

  return (
    <Box className="mt-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-60">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            Email verification
            <span className={cx("rounded px-1.5 py-0.5 text-[11px] font-semibold", on ? "bg-success/10 text-success" : "bg-mist text-muted")}>{on ? "On" : "Off"}</span>
          </h2>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">
            {on
              ? `Each time you sign in, we email a 6-digit code to ${status.maskedEmail}.`
              : "Turn it on and we'll email you a 6-digit code each time you sign in, so your password alone isn't enough."}
          </p>
          {otherKeys && <p className="mt-1 text-[13px] text-muted">Your account also has sign-in keys from Version 2, so until this is on you'll need Version 2 to sign in.</p>}
        </div>
        {!step && (
          <Button variant={on ? "secondary" : "primary"} onClick={start}>
            {on ? "Turn off" : "Set up"}
          </Button>
        )}
      </div>

      {notice && !step && (
        <p role="status" className="mt-4 text-[13.5px] font-medium text-success">
          {notice}
        </p>
      )}

      {step && (
        <div className="mt-5 max-w-sm border-t border-line pt-5">
          {step === "on" && (
            <>
              <p className="mb-4 text-[14px] text-muted">{sentTo}</p>
              <CodeForm send={() => twofa.enableRequest("EMAIL")} verify={turnOn} onVerified={finished("Email verification is on.")} submitLabel="Turn on" />
            </>
          )}

          {step === "password" && (
            <form onSubmit={submitPassword} className="space-y-4">
              <Field label="Current password" htmlFor="v1-disable-password" error={passwordError}>
                <Input
                  id="v1-disable-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(passwordError) || undefined}
                  required
                />
              </Field>
              <Button type="submit" className="w-full" loading={busy} disabled={!password}>
                Continue
              </Button>
            </form>
          )}

          {step === "off" && (
            <>
              <p className="mb-4 text-[14px] text-muted">{sentTo}</p>
              <CodeForm
                autoSend={!request}
                initialResendIn={request?.resendIn ?? 60}
                send={() => twofa.disableRequest("EMAIL", password)}
                verify={(code) => twofa.disableConfirm("EMAIL", code)}
                onVerified={finished("Email verification is off.")}
                submitLabel="Turn off"
              />
            </>
          )}

          <button type="button" onClick={cancel} className="mt-4 text-[13.5px] font-medium text-muted underline underline-offset-2 hover:text-ink">
            Cancel
          </button>
        </div>
      )}
    </Box>
  );
}
