import { passwordStrength } from "../lib/password.js";
import { cx } from "./ui.jsx";

const METER_COLORS = ["bg-danger", "bg-danger", "bg-lime", "bg-success", "bg-success"];

export default function PasswordMeter({ password }) {
  const { score, label, hint } = passwordStrength(password);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={cx("h-1 flex-1 rounded-full transition-colors", password && score >= n ? METER_COLORS[score] : "bg-mist")} />
        ))}
      </div>
      <p className="flex justify-between text-[12.5px] text-muted">
        <span>{hint}</span>
        {label && <span className="font-medium text-ink">{label}</span>}
      </p>
    </div>
  );
}
