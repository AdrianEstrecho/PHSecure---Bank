import { useState } from "react";
import { errorMessage, fieldErrors } from "../api/client.js";
import { security } from "../api/endpoints.js";
import Modal from "./Modal.jsx";
import NewPasswordFields from "./NewPasswordFields.jsx";
import PasswordInput from "./PasswordInput.jsx";
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
      const fields = fieldErrors(err);
      if (fields) setErrors(fields);
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
            aria-invalid={Boolean(errors.currentPassword) || undefined}
            required
          />
        </Field>
        <NewPasswordFields form={form} set={set} errors={errors} />

        {formError && <Alert>{formError}</Alert>}

        <Button type="submit" className="w-full" loading={busy} disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}>
          Change password
        </Button>
      </form>
    </Modal>
  );
}
