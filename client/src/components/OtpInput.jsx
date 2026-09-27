import { useRef } from "react";
import { cx } from "./ui.jsx";

/**
 * Six boxes, one digit each. Supports typing, backspace, arrow keys, paste and SMS/email autofill.
 * `value` is a gap-free digit string; `onComplete` fires when the last digit lands.
 */
export default function OtpInput({ value, onChange, onComplete, length = 6, disabled = false, invalid = false, label = "6-digit code" }) {
  const refs = useRef([]);
  // Focus moves synchronously, before React re-renders with the new value, so handlers read this ref instead of `value`.
  const current = useRef(value);
  current.current = value;
  const focusBox = (i) => refs.current[Math.max(0, Math.min(i, length - 1))]?.focus();

  const update = (next) => {
    current.current = next;
    onChange(next);
  };

  const commit = (next) => {
    const clean = next.replace(/\D/g, "").slice(0, length);
    update(clean);
    focusBox(clean.length);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (i, e) => {
    const typed = e.target.value.replace(/\D/g, "");
    if (!typed) return;
    // More than one digit means autofill or a paste into a single box.
    commit(typed.length > 1 ? value.slice(0, i) + typed : value.slice(0, i) + typed.slice(-1) + value.slice(i + 1));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) update(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) {
        update(value.slice(0, i - 1) + value.slice(i));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(Math.min(i + 1, value.length));
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    commit(pasted);
  };

  return (
    <div role="group" aria-label={label} className="flex items-center justify-center gap-2 sm:gap-2.5">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          // Boxes fill left to right; clicking ahead jumps back to the next empty one.
          onFocus={(e) => (i > current.current.length ? focusBox(current.current.length) : e.target.select())}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          className={cx(
            "h-14 w-full max-w-12 min-w-0 rounded-xl border bg-white text-center font-mono text-[24px] text-ink tabular transition-colors",
            "focus:border-ink focus:ring-2 focus:ring-lime/45 focus:outline-none disabled:opacity-60",
            invalid ? "border-danger" : value[i] ? "border-ink/60" : "border-line",
            i === length / 2 && "ml-2 sm:ml-3",
          )}
        />
      ))}
    </div>
  );
}
