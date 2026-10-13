import { LoaderCircle } from "lucide-react";
import { GoogleLogo } from "../components/GoogleButton.jsx";
import { cx } from "../components/ui.jsx";

// Version 1 is the early build: plain bordered boxes, square-ish corners, one accent colour, no illustrations.

export const buttonClass = (variant = "primary", className) =>
  cx(
    "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-[14px] font-medium whitespace-nowrap transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" ? "bg-forest text-white hover:bg-forest-2" : "border border-line bg-surface text-ink hover:bg-canvas",
    className,
  );

export function Button({ variant, loading = false, className, children, disabled, type = "button", ...props }) {
  return (
    <button type={type} className={buttonClass(variant, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12.5px] text-muted">{hint}</p>
      )}
    </div>
  );
}

// 16px on phones: iOS Safari zooms the page into any field set smaller.
export const Input = ({ className, ...props }) => (
  <input
    className={cx(
      "h-10 w-full rounded-md border border-line bg-surface px-3 text-[16px] text-ink sm:text-[14px]",
      "focus:border-forest focus:ring-2 focus:ring-forest/15 focus:outline-none aria-invalid:border-danger",
      className,
    )}
    {...props}
  />
);

export const Message = ({ className, children }) => (
  <p role="alert" className={cx("rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[13.5px] leading-snug text-danger", className)}>
    {children}
  </p>
);

export const Box = ({ className, children }) => <div className={cx("rounded-md border border-line bg-surface", className)}>{children}</div>;

/** The centred box every sign-in and registration step sits in. */
export function AuthBox({ title, intro, children }) {
  return (
    <Box className="mx-auto w-full max-w-sm p-6 sm:p-8">
      <h1 className="text-[22px] leading-tight font-bold">{title}</h1>
      {intro && <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </Box>
  );
}

/** Full-page link, not a fetch: the server sends the browser to Google and back to /login/google. */
export function GoogleLink() {
  return (
    <>
      <p className="my-5 text-center text-[12.5px] text-muted">or</p>
      <a href="/api/auth/google" className={buttonClass("secondary", "w-full")}>
        <GoogleLogo className="size-4" /> Continue with Google
      </a>
    </>
  );
}

export const TextLink =({ as: Tag = "a", className, ...props }) => <Tag className={cx("font-medium text-forest underline underline-offset-2 hover:no-underline", className)} {...props} />;
