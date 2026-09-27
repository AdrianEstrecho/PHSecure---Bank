import { useState } from "react";
import { twofa } from "../api/endpoints.js";
import EmailCodeStep from "./EmailCodeStep.jsx";
import Modal from "./Modal.jsx";
import { Button } from "./ui.jsx";
import VaultCodesPanel from "./VaultCodesModal.jsx";

export default function RegenerateVaultModal({ status, onClose, onStatus }) {
  const [step, setStep] = useState("confirm");
  const [codes, setCodes] = useState(null);

  return (
    <Modal
      eyebrow="Vault Codes"
      title={step === "vault" ? "Save your new Vault Codes" : step === "confirm" ? "Create new Vault Codes?" : "Confirm it's you"}
      onClose={onClose}
      dismissible={step !== "vault"}
    >
      {step === "confirm" && (
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-muted">
            You'll get 10 new codes. Your {status.vault.remaining} remaining code{status.vault.remaining === 1 ? "" : "s"} will stop working as soon as you confirm.
          </p>
          <Button className="w-full" onClick={() => setStep("code")}>
            Email me a code
          </Button>
        </div>
      )}
      {step === "code" && (
        <EmailCodeStep
          destination={status.maskedEmail}
          send={twofa.regenerateRequest}
          verify={twofa.regenerate}
          onVerified={(result) => {
            onStatus(result.status);
            setCodes(result.vaultCodes);
            setStep("vault");
          }}
          submitLabel="Create new codes"
        />
      )}
      {step === "vault" && <VaultCodesPanel codes={codes} onDone={onClose} />}
    </Modal>
  );
}
