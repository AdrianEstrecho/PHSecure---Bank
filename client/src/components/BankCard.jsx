import { cx } from "./ui.jsx";

// Card artwork in the brand style: a huge geometric letterform in lime, here the "p" of PHSecure.
const THEMES = {
  forest: { bg: "bg-forest", mark: "#C6F135", text: "text-white", sub: "text-white/60", chip: "from-[#ece6c9] to-[#b8b091]" },
  light: { bg: "bg-[#f3f1e8]", mark: "#C6F135", text: "text-ink", sub: "text-muted", chip: "from-[#ddd7bc] to-[#a9a184]" },
  mist: { bg: "bg-[#dfe2dc]", mark: "#0E3B2A", text: "text-ink", sub: "text-muted", chip: "from-[#f4f2e8] to-[#c4c0ac]" },
};

function Contactless({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M8.5 7.5a6.5 6.5 0 0 1 0 9M12 5a10 10 0 0 1 0 14M15.5 2.5a13.5 13.5 0 0 1 0 19" />
    </svg>
  );
}

/** The "p": a thick ring plus a descending stem, kept clear of the wordmark, contactless icon and holder name. */
function Mark({ color, vertical }) {
  return vertical ? (
    <svg viewBox="0 0 126 200" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <circle cx="76" cy="96" r="36" fill="none" stroke={color} strokeWidth="24" />
      <rect x="16" y="60" width="24" height="108" rx="12" fill={color} />
    </svg>
  ) : (
    <svg viewBox="0 0 200 126" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <circle cx="146" cy="76" r="38" fill="none" stroke={color} strokeWidth="24" />
      <rect x="84" y="38" width="24" height="112" rx="12" fill={color} />
    </svg>
  );
}

/**
 * Illustrative debit card (never a real card). `vertical` gives the portrait orientation used in card fans.
 * The outer box takes the caller's positioning classes; the inner box is the art frame, sized in container units.
 */
export default function BankCard({ theme = "forest", vertical = false, holder, last4, className, style }) {
  const t = THEMES[theme];
  return (
    <div aria-hidden className={cx("rounded-[22px]", vertical ? "aspect-[0.63]" : "aspect-[1.586]", className)} style={style}>
      <div className={cx("@container relative size-full overflow-hidden rounded-[22px] shadow-lift", t.bg)}>
        <Mark color={t.mark} vertical={vertical} />
        <div className="relative flex h-full flex-col justify-between p-[8cqw]">
          <div className="flex items-start justify-between">
            <span className={cx("font-display leading-none font-bold tracking-[-0.03em]", vertical ? "text-[9cqw]" : "text-[6.5cqw]", t.text)}>PHSecure</span>
            <Contactless className={cx(vertical ? "size-[11cqw]" : "size-[7cqw]", t.text)} />
          </div>
          <span className={cx("rounded-[1.6cqw] bg-gradient-to-br", vertical ? "-mt-[40%] h-[13cqw] w-[18cqw]" : "h-[11cqw] w-[15cqw]", t.chip)} />
          <div className="flex items-end justify-between">
            <div className="leading-tight">
              {holder && <p className={cx("font-medium", vertical ? "text-[6.5cqw]" : "text-[4.2cqw]", t.text)}>{holder}</p>}
              <p className={cx("font-mono tracking-[0.12em]", vertical ? "text-[5.5cqw]" : "text-[3.6cqw]", t.sub)}>•••• {last4 ?? "2026"}</p>
            </div>
            <span className={cx("caps", vertical ? "text-[5.5cqw]" : "text-[3.6cqw]", t.text)}>Debit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
