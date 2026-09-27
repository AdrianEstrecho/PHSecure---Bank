import { Link } from "react-router";
import { cx } from "./ui.jsx";

/** "PHSecure" wordmark closed by a lime full stop. `tone="dark"` for forest surfaces. */
export default function Logo({ tone = "light", to = "/", className }) {
  return (
    <Link
      to={to}
      aria-label="PHSecure Bank — home"
      className={cx("font-display text-[26px] leading-none font-bold tracking-[-0.04em]", tone === "dark" ? "text-white" : "text-forest", className)}
    >
      <span aria-hidden>
        PHSecure
        <span className="ml-[0.06em] inline-block size-[0.2em] rounded-full bg-lime" />
      </span>
    </Link>
  );
}
