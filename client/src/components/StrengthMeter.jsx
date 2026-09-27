import { cx } from "./ui.jsx";

/** Ten-segment meter from the spec ("███████░░░ Strong"). `score` is 0–10. */
export default function StrengthMeter({ score, label, tone = "light" }) {
  const filled = tone === "dark" ? "bg-lime" : score >= 7 ? "bg-forest" : "bg-lime-2";
  const empty = tone === "dark" ? "bg-white/15" : "bg-mist";
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={score} aria-label={`Security strength: ${label}`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={cx("h-2 w-3.5 rounded-full transition-colors duration-500 sm:w-4", i < score ? filled : empty)} style={{ transitionDelay: `${i * 40}ms` }} />
        ))}
      </div>
      <span className={cx("text-[13px] font-semibold", tone === "dark" ? "text-white" : "text-ink")}>{label}</span>
    </div>
  );
}
