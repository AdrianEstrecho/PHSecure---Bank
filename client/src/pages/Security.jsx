import { ChevronRight, History, KeyRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { errorMessage } from "../api/client.js";
import { twofa } from "../api/endpoints.js";
import DisableMethodModal from "../components/DisableMethodModal.jsx";
import EnableMethodModal from "../components/EnableMethodModal.jsx";
import MethodCard from "../components/MethodCard.jsx";
import RegenerateVaultModal from "../components/RegenerateVaultModal.jsx";
import StrengthMeter from "../components/StrengthMeter.jsx";
import { Alert, Button, Card, IconCircle, PageHeader, Select, Spinner, cx } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate } from "../lib/format.js";
import { METHOD_ORDER, METHODS, securityStrength } from "../lib/methods.js";
import { useLoad } from "../lib/useLoad.js";

export default function Security() {
  const { updateUser } = useAuth();
  const { data: status, error, setData } = useLoad(twofa.status);
  const [modal, setModal] = useState(null); // { kind: "enable" | "disable" | "regenerate", method }
  const [defaultError, setDefaultError] = useState(null);
  const [savingDefault, setSavingDefault] = useState(false);

  const applyStatus = (next) => {
    setData(next);
    updateUser({ twoFactorOn: next.twoFactorOn, defaultMethod: next.defaultMethod, maskedPhone: next.maskedPhone, phoneVerified: next.phoneVerified });
  };

  async function changeDefault(method) {
    setSavingDefault(true);
    setDefaultError(null);
    try {
      applyStatus(await twofa.setDefault(method));
    } catch (err) {
      setDefaultError(errorMessage(err));
    } finally {
      setSavingDefault(false);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!status) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const enabled = status.methods.filter((m) => m.enabled);
  const on = new Set(enabled.map((m) => m.type));
  const strength = securityStrength(status);
  const close = () => setModal(null);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Profile · Security"
        title="Security"
        description="Choose how you prove it's you when you sign in. Turning a key on or off always needs a code we email you first."
      />

      {/* Summary */}
      <section aria-labelledby="twofa-heading" className="relative overflow-hidden rounded-[32px] bg-forest p-7 text-white sm:p-9">
        <div aria-hidden className="absolute -right-20 -bottom-20 size-64 rounded-full border-[34px] border-lime/10" />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="twofa-heading" className="text-[13px] font-medium text-white/65">
              Two-factor authentication
            </h2>
            <p className="mt-2 flex items-center gap-3 font-display text-[34px] leading-none font-semibold" aria-live="polite">
              <span className={cx("size-3 rounded-full", status.twoFactorOn ? "bg-lime" : "bg-danger")} aria-hidden />
              {status.twoFactorOn ? `On · ${enabled.length} key${enabled.length === 1 ? "" : "s"}` : "Off"}
            </p>
            <div className="mt-5">
              <p className="mb-2 text-[12px] text-white/55">Security strength</p>
              <StrengthMeter score={strength.score} label={strength.label} tone="dark" />
            </div>
          </div>
          {/* Each key at a glance */}
          <ul className="flex gap-2" aria-label="Keys">
            {METHOD_ORDER.map((type) => {
              const Icon = METHODS[type].icon;
              return (
                <li key={type} className="flex flex-col items-center gap-1.5">
                  <span className={cx("grid size-12 place-items-center rounded-full", on.has(type) ? "bg-lime text-ink" : "border border-white/20 text-white/45")}>
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="text-[10.5px] text-white/60">
                    {METHODS[type].kind.split(" ")[0]}
                    <span className="sr-only">: {on.has(type) ? "on" : "off"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {!status.twoFactorOn && (
        <Alert tone="info" className="mt-5">
          Your account is protected by your password alone. Turn on any key below — we'll create your Vault Codes at the same time.
        </Alert>
      )}

      <ul className="mt-5 space-y-3">
        {status.methods.map((state) => (
          <MethodCard
            key={state.type}
            state={state}
            status={status}
            onToggle={() => setModal({ kind: state.enabled ? "disable" : "enable", method: state.type })}
            onAddPasskey={() => setModal({ kind: "enable", method: "PASSKEY" })}
          />
        ))}
      </ul>

      {/* Vault Codes */}
      <Card as="section" aria-labelledby="vault-heading" className="mt-3 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <IconCircle icon={KeyRound} tone="dark" />
        <div className="flex-1">
          <h3 id="vault-heading" className="text-[17px] font-semibold">
            Vault Codes
          </h3>
          {status.vault.total ? (
            <>
              <div className="mt-3 flex gap-1" aria-hidden>
                {Array.from({ length: status.vault.total }, (_, i) => (
                  <span key={i} className={cx("h-2 flex-1 rounded-full", i < status.vault.remaining ? "bg-lime" : "bg-mist")} />
                ))}
              </div>
              <p className="mt-2 text-[13px] text-muted">
                {status.vault.remaining} of {status.vault.total} remaining · created {formatDate(status.vault.generatedAt)}
              </p>
              {status.vault.remaining <= 3 && <p className="mt-1 text-[13px] font-medium text-danger">You're running low — create a new set.</p>}
            </>
          ) : (
            <p className="mt-1 text-[14px] text-muted">Ten single-use recovery codes, created when you turn on your first key.</p>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={!status.twoFactorOn} onClick={() => setModal({ kind: "regenerate" })} className="self-start sm:self-center">
          Regenerate
        </Button>
      </Card>

      {/* Default + activity */}
      <Card className="mt-3 grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
        <div className="max-w-sm space-y-1.5">
          <label htmlFor="default-method" className="text-[13px] font-medium">
            Default method
          </label>
          <div className="flex items-center gap-3">
            <Select id="default-method" value={status.defaultMethod ?? ""} onChange={(e) => changeDefault(e.target.value)} disabled={enabled.length < 2 || savingDefault}>
              {enabled.length === 0 && <option value="">Turn on a key first</option>}
              {enabled.map((m) => (
                <option key={m.type} value={m.type}>
                  {METHODS[m.type].name}
                </option>
              ))}
            </Select>
            {savingDefault && <Spinner className="size-4" />}
          </div>
          <p className="text-[12.5px] text-muted">
            {enabled.length < 2 ? "With two or more keys on, choose which one we ask for first." : "We ask for this first; you can always pick another at sign-in."}
          </p>
          {defaultError && <p className="text-[13px] text-danger">{defaultError}</p>}
        </div>
        <Link to="/security/activity" className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-lime">
          <History className="size-4" aria-hidden /> Recent security activity <ChevronRight className="size-4" aria-hidden />
        </Link>
      </Card>

      {modal?.kind === "enable" && <EnableMethodModal method={modal.method} status={status} onClose={close} onStatus={applyStatus} />}
      {modal?.kind === "disable" && <DisableMethodModal method={modal.method} status={status} onClose={close} onStatus={applyStatus} />}
      {modal?.kind === "regenerate" && <RegenerateVaultModal status={status} onClose={close} onStatus={applyStatus} />}
    </div>
  );
}
