import PasswordInput from "./PasswordInput.jsx";
import PasswordMeter from "./PasswordMeter.jsx";
import { Field } from "./ui.jsx";

/** "New password" with its strength meter, then "Confirm new password". The parent checks that they match. */
export default function NewPasswordFields({ form, set, errors }) {
  return (
    <>
      <Field label="New password" htmlFor="new-password" error={errors.newPassword}>
        <PasswordInput id="new-password" autoComplete="new-password" value={form.newPassword} onChange={set("newPassword")} aria-invalid={Boolean(errors.newPassword) || undefined} required />
      </Field>
      <PasswordMeter password={form.newPassword} />
      <Field label="Confirm new password" htmlFor="confirm-password" error={errors.confirmPassword}>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          aria-invalid={Boolean(errors.confirmPassword) || undefined}
          required
        />
      </Field>
    </>
  );
}
