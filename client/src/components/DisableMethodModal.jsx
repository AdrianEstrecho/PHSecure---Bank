import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../api/client.js";
import { twofa } from "../api/endpoints.js";
import { METHODS } from "../lib/methods.js";
import EmailCodeStep from "./EmailCodeStep.jsx";
import Modal from "./Modal.jsx";
import { Alert, Button, Field, Input } from "./ui.jsx";

/** Turning a method off: current password → emailed code → done. */
export default function DisableMethodModal({ method, status, onClose, onStatus }) {
  const meta = METHODS[method];
  const isLast = status.methods.filter((m) => m.enabled).length === 1;
  const [step, setStep] = useState("password");
  const [password, setPassword] = useState("");
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fullyOff, setFullyOff] = useState(false);

  async function submitPassword(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setRequest(await twofa.disableRequest(method, password));
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal eyebrow={`Turn off ${meta.name}`} title={step === "done" ? `${meta.name} is off` : "Confirm it's you"} onClose={onClose}>
      {step === "password" && (
        <form onSubmit={submitPassword} className="space-y-5">
          {isLast ? (
            <div className="flex gap-3 rounded-xl border border-danger/25 bg-danger/[0.05] p-4 text-[14px] leading-relaxed text-ink">
              <TriangleAlert className="size-5 shrink-0 text-danger" aria-hidden />
              <p>
                This is your only security method. Turning it off <strong className="font-semibold">turns two-factor authentication off</strong> and deletes your Vault
                Codes — your password alone will protect your account.
              </p>
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed text-muted">Enter your password, then the code we email you, to turn off {meta.name}.</p>
          )}
          <Field label="Current password" htmlFor="disable-password" error={error}>
            <Input
              id="disable-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(error) || undefined}
              required
            />
          </Field>
          <Button type="submit" variant={isLast ? "danger" : "primary"} className="w-full" loading={busy} disabled={!password}>
            Continue
          </Button>
        </form>
      )}

      {step === "code" && (
        <EmailCodeStep
          destination={request.maskedEmail}
          autoSend={false}
          initialResendIn={request.resendIn}
          send={() => twofa.disableRequest(method, password)}
          verify={(code) => twofa.disableConfirm(method, code)}
          onVerified={(result) => {
            onStatus(result.status);
            setFullyOff(result.fullyOff);
            setPassword("");
            setStep("done");
          }}
          submitLabel={`Turn off ${meta.name}`}
        />
      )}

      {step === "done" && (
        <div className="space-y-5">
          {fullyOff ? (
            <Alert>Two-factor authentication is now off. Turn on any method to protect your account again.</Alert>
          ) : (
            <p className="text-[15px] leading-relaxed text-muted">We've emailed you to confirm this change. Your other methods still protect your account.</p>
          )}
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
