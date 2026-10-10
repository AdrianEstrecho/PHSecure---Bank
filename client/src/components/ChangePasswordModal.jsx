import { useState } from "react";
import { errorDetails, errorMessage } from "../api/client.js";
import { security } from "../api/endpoints.js";
import Modal from "./Modal.jsx";
import PasswordInput from "./PasswordInput.jsx";
import PasswordMeter from "./PasswordMeter.jsx";
import { Alert, Button, Field } from "./ui.jsx";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Current password, then the new one twice. Once it's changed, every other device is signed out. */
export default function ChangePasswordModal({ onClose, onChanged }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(null); // number of other devices signed out, once changed

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const invalid = (key) => Boolean(errors[key]) || undefined;

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    if (form.newPassword !== form.confirmPassword) {
      setErrors({ confirmPassword: "The new passwords don't match." });
      return;
    }

    setBusy(true);
    try {
      const result = await security.changePassword(form.currentPassword, form.newPassword);
      setForm(EMPTY);
      setSignedOut(result.signedOut);
      onChanged(result);
    } catch (err) {
      const issues = Array.isArray(errorDetails(err)) ? errorDetails(err) : [];
      if (issues.length) setErrors(Object.fromEntries(issues.map((i) => [i.path, i.message])));
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (signedOut !== null) {
    return (
      // Keyed so the dialog remounts and moves focus to Done; the button that had it is gone.
      <Modal key="done" eyebrow="Password" title="Password changed" onClose={onClose}>
        <div className="space-y-5">
          <p className="text-[15px] leading-relaxed text-muted">
            You're still signed in here.{" "}
            {signedOut
              ? `We signed out ${signedOut === 1 ? "your other device" : `your ${signedOut} other devices`} — they'll need the new password to sign back in.`
              : "Use your new password the next time you sign in."}{" "}
            We've emailed you to confirm the change.
          </p>
          <Button className="w-full" onClick={onClose} data-autofocus>
            Done
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal eyebrow="Password" title="Change your password" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <p className="text-[15px] leading-relaxed text-muted">Changing your password signs you out on every other device.</p>
        <Field label="Current password" htmlFor="current-password" error={errors.currentPassword}>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={set("currentPassword")}
            aria-invalid={invalid("currentPassword")}
            required
          />
        </Field>
        <Field label="New password" htmlFor="new-password" error={errors.newPassword}>
          <PasswordInput id="new-password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} aria-invalid={invalid("newPassword")} required />
        </Field>
        <PasswordMeter password={form.newPassword} />
        <Field label="Confirm new password" htmlFor="confirm-password" error={errors.confirmPassword}>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            aria-invalid={invalid("confirmPassword")}
            required
          />
        </Field>

        {formError && <Alert>{formError}</Alert>}

        <Button type="submit" className="w-full" loading={busy} disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}>
          Change password
        </Button>
      </form>
    </Modal>
  );
}
