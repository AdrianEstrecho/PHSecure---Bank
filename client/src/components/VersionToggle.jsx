import { useVersion } from "../context/VersionContext.jsx";
import { cx } from "./ui.jsx";

const TONES = {
  light: { track: "bg-mist", on: "bg-forest text-white", off: "text-muted hover:text-ink" },
  dark: { track: "bg-white/10", on: "bg-lime text-ink", off: "text-white/65 hover:text-white" },
};

/** Footer switch between version 1 (the early build) and version 2 (the full site). `tone="dark"` for forest surfaces. */
export default function VersionToggle({ tone = "light", className }) {
  const { version, switchTo } = useVersion();
  const t = TONES[tone];

  return (
    <div role="group" aria-label="Site version" className={cx("inline-flex shrink-0 rounded-full p-1", t.track, className)}>
      {[1, 2].map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={version === v}
          onClick={() => switchTo(v)}
          className={cx("h-8 rounded-full px-3.5 text-[12px] font-semibold whitespace-nowrap transition-colors", version === v ? t.on : t.off)}
        >
          Version {v}
        </button>
      ))}
    </div>
  );
}
