import { cx } from "./ui.jsx";

/** Wordmark over a sweeping bar. `overlay` floats it above the current page (the sign-in and sign-out transitions). */
export default function FullScreenLoader({ message, overlay = false }) {
  return (
    <div role="status" className={cx("grid min-h-dvh place-items-center bg-canvas", overlay && "fixed inset-0 z-[60] animate-fade")}>
      <div className="flex flex-col items-center gap-5">
        <span className="font-display text-[28px] font-bold tracking-[-0.04em] text-forest">PHSecure</span>
        <span aria-hidden className="block h-1 w-36 overflow-hidden rounded-full bg-mist">
          <span className="block h-full w-2/5 animate-loading-bar rounded-full bg-forest motion-reduce:animate-none" />
        </span>
        <p className={message ? "text-[14px] text-muted" : "sr-only"}>{message ?? "Loading…"}</p>
      </div>
    </div>
  );
}
