import { useState } from "react";
import { errorCode, errorMessage } from "../api/client.js";
import { twofa } from "../api/endpoints.js";
import EmailCodeStep from "./EmailCodeStep.jsx";
import SetupExpired, { isSetupExpired } from "./SetupExpired.jsx";
import { Button, Field, Input, Select } from "./ui.jsx";

const COUNTRIES = [
  ["Philippines", "+63"],
  ["Singapore", "+65"],
  ["Hong Kong", "+852"],
  ["Japan", "+81"],
  ["Australia", "+61"],
  ["United Arab Emirates", "+971"],
  ["United Kingdom", "+44"],
  ["United States / Canada", "+1"],
];

/** Local number → E.164 (a leading trunk 0 is dropped: 0917… → +63917…). */
const toE164 = (dial, local) => `${dial}${local.replace(/\D/g, "").replace(/^0+/, "")}`;

export default function SmsSetup({ setupToken, onConfirmed, onRestart }) {
  const [dial, setDial] = useState("+63");
  const [local, setLocal] = useState("");
  const [sent, setSent] = useState(null);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(null);
  const [sending, setSending] = useState(false);

  const phone = toE164(dial, local);
  const handle = (err) => (isSetupExpired(errorCode(err)) ? setExpired(errorMessage(err)) : setError(errorMessage(err)));

  async function sendCode(e) {
    e?.preventDefault();
    setSending(true);
    setError(null);
    try {
      setSent(await twofa.smsSetup(setupToken, phone));
    } catch (err) {
      handle(err);
    } finally {
      setSending(false);
    }
  }

  if (expired) return <SetupExpired message={expired} onRestart={onRestart} />;

  if (sent) {
    return (
      <div className="space-y-4">
        <EmailCodeStep
          channel="sms"
          destination={sent.maskedPhone}
          autoSend={false}
          initialResendIn={sent.resendIn}
          send={() => twofa.smsSetup(setupToken, phone)}
          verify={async (code) => {
            try {
              return await twofa.enableConfirm({ setupToken, code });
            } catch (err) {
              if (isSetupExpired(errorCode(err))) setExpired(errorMessage(err));
              throw err;
            }
          }}
          onVerified={onConfirmed}
          submitLabel="Turn on PHSecure Text Key"
        />
        <button type="button" onClick={() => setSent(null)} className="w-full text-center text-[13px] text-muted underline underline-offset-4 hover:text-ink">
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-5">
      <p className="text-[15px] leading-relaxed text-muted">We'll text a code to this number to confirm it's yours. Standard message rates may apply.</p>
      <Field label="Mobile number" htmlFor="sms-local" error={error}>
        <div className="flex gap-2">
          <Select value={dial} onChange={(e) => setDial(e.target.value)} aria-label="Country code" className="w-[7.5rem] shrink-0">
            {COUNTRIES.map(([name, code]) => (
              <option key={name} value={code}>
                {code} {name.split(" ")[0]}
              </option>
            ))}
          </Select>
          <Input
            id="sms-local"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="917 123 4567"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            required
          />
        </div>
      </Field>
      <Button type="submit" className="w-full" loading={sending} disabled={local.replace(/\D/g, "").length < 6}>
        Text me a code
      </Button>
    </form>
  );
}
