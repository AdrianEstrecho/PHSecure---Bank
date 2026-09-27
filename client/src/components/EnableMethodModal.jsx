import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { twofa } from "../api/endpoints.js";
import { METHODS } from "../lib/methods.js";
import EmailCodeStep from "./EmailCodeStep.jsx";
import Modal from "./Modal.jsx";
import PasskeySetup from "./PasskeySetup.jsx";
import SmsSetup from "./SmsSetup.jsx";
import TotpSetup from "./TotpSetup.jsx";
import { Button } from "./ui.jsx";
import VaultCodesPanel from "./VaultCodesModal.jsx";

const SETUP_TITLES = { TOTP: "Link your authenticator app", SMS: "Add your mobile number", PASSKEY: "Create a passkey" };

/**
 * Turning a method on: email code → method-specific setup → (first method only) Vault Codes → done.
 * The Security page's toggle only flips when `onStatus` delivers the server's new state.
 */
export default function EnableMethodModal({ method, status, onClose, onStatus }) {
  const meta = METHODS[method];
  // Captured once: after confirming, the refreshed status would otherwise flip this for a first passkey.
  const [adding] = useState(() => method === "PASSKEY" && Boolean(status.methods.find((m) => m.type === "PASSKEY")?.enabled));
  const [step, setStep] = useState("email");
  const [setupToken, setSetupToken] = useState(null);
  const [vaultCodes, setVaultCodes] = useState(null);
  const [attempt, setAttempt] = useState(0);

  function handleConfirmed(result) {
    onStatus(result.status);
    if (result.vaultCodes) {
      setVaultCodes(result.vaultCodes);
      setStep("vault");
    } else {
      setStep("done");
    }
  }

  // Mail Key needs no further setup, so it's confirmed inside the code step (errors surface there too).
  async function verifyEmailCode(code) {
    const { setupToken: token } = await twofa.enableVerifyEmail(method, code);
    if (method === "EMAIL") return { confirmed: await twofa.enableConfirm({ setupToken: token }) };
    return { setupToken: token };
  }

  function handleEmailVerified({ setupToken: token, confirmed }) {
    if (confirmed) return handleConfirmed(confirmed);
    setSetupToken(token);
    setStep("setup");
  }

  const restart = () => {
    setAttempt((n) => n + 1);
    setStep("email");
  };

  const titles = {
    email: "Confirm it's you",
    setup: SETUP_TITLES[method],
    vault: "Save your Vault Codes",
    done: adding ? "Passkey added" : `${meta.name} is on`,
  };

  return (
    <Modal
      eyebrow={adding ? "Add a passkey" : `Turn on ${meta.name}`}
      title={titles[step]}
      onClose={onClose}
      dismissible={step !== "vault"}
    >
      {step === "email" && (
        <EmailCodeStep
          key={attempt}
          destination={status.maskedEmail}
          intro={`Before we ${adding ? "add a passkey" : `turn on ${meta.name}`}, confirm this change with the code we email you.`}
          send={() => twofa.enableRequest(method)}
          verify={verifyEmailCode}
          onVerified={handleEmailVerified}
          submitLabel="Continue"
        />
      )}
      {step === "setup" && method === "TOTP" && <TotpSetup setupToken={setupToken} onConfirmed={handleConfirmed} onRestart={restart} />}
      {step === "setup" && method === "SMS" && <SmsSetup setupToken={setupToken} onConfirmed={handleConfirmed} onRestart={restart} />}
      {step === "setup" && method === "PASSKEY" && <PasskeySetup setupToken={setupToken} onConfirmed={handleConfirmed} onRestart={restart} adding={adding} />}
      {step === "vault" && <VaultCodesPanel codes={vaultCodes} onDone={() => setStep("done")} />}
      {step === "done" && (
        <div className="space-y-5">
          <div className="flex gap-3 rounded-xl border border-success/25 bg-success/[0.06] p-4">
            <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
            <p className="text-[14.5px] leading-relaxed text-ink">
              {adding
                ? "You can now sign in with this passkey too."
                : `We'll ask for ${meta.name} when you sign in${status.methods.filter((m) => m.enabled).length > 1 ? " — or you can choose another of your methods" : ""}. We've emailed you a confirmation.`}
            </p>
          </div>
          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
