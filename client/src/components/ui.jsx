import { CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
import { Link } from "react-router";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const BUTTON_VARIANTS = {
  primary: "bg-forest text-white hover:bg-forest-2",
  lime: "bg-lime text-ink hover:bg-lime-2",
  outline: "border border-ink/80 text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink hover:bg-mist",
  danger: "bg-danger text-white hover:bg-[#ad3129]",
  "on-dark": "border border-white/30 text-white hover:border-lime hover:text-lime",
};
const BUTTON_SIZES = { md: "h-11 px-6 text-sm", sm: "h-9 px-4 text-[13px]", lg: "h-[52px] px-7 text-[15px]" };

export const buttonClass = (variant = "primary", size = "md", className) =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-45",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );

export function Button({ variant, size, loading = false, className, children, disabled, type = "button", ...props }) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export const Spinner = ({ className }) => <LoaderCircle className={cx("size-5 animate-spin text-forest", className)} aria-label="Loading" />;

export function Field({ label, htmlFor, hint, error, children, optional }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="text-[12px] font-normal text-muted">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-[13px] text-muted">{hint}</p>
      )}
    </div>
  );
}

export const inputClass = cx(
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink transition-colors",
  "placeholder:text-muted/60 focus:border-forest focus:ring-4 focus:ring-lime/40 focus:outline-none",
  "aria-invalid:border-danger aria-invalid:ring-danger/10",
);

export const Input = ({ className, ...props }) => <input className={cx(inputClass, className)} {...props} />;

export const Select = ({ className, ...props }) => <select className={cx(inputClass, "appearance-auto pr-3", className)} {...props} />;

const ALERT_TONES = {
  danger: { classes: "bg-danger/[0.07] text-danger", Icon: CircleAlert },
  success: { classes: "bg-success/[0.09] text-success", Icon: CircleCheck },
  info: { classes: "bg-lime-soft text-forest", Icon: Info },
};

export function Alert({ tone = "danger", children, className }) {
  const { classes, Icon } = ALERT_TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-2.5 rounded-2xl px-4 py-3 text-[13.5px] leading-snug", classes, className)}>
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export const Card = ({ className, children, as: Tag = "div", ...props }) => (
  <Tag className={cx("rounded-[28px] bg-surface shadow-soft", className)} {...props}>
    {children}
  </Tag>
);

const BADGE_TONES = {
  success: "bg-success/10 text-success",
  lime: "bg-lime text-ink",
  muted: "bg-mist text-muted",
  danger: "bg-danger/10 text-danger",
};

export const Badge = ({ tone = "muted", className, children }) => (
  <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold", BADGE_TONES[tone], className)}>{children}</span>
);

/** Small label with a lime dot, as used above section titles. */
export const Eyebrow = ({ className, children, tone = "light" }) => (
  <p className={cx("inline-flex items-center gap-2 text-[13px] font-medium", tone === "dark" ? "text-white/70" : "text-muted", className)}>
    <span aria-hidden className="size-1.5 rounded-full bg-lime ring-2 ring-lime/30" />
    {children}
  </p>
);

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="text-[32px] leading-[1.1] font-semibold sm:text-[40px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}

/** Round lime (or soft) icon badge — the reference's feature-card motif. */
export function IconCircle({ icon: Icon, tone = "lime", size = "md", className }) {
  const tones = { lime: "bg-lime text-ink", soft: "bg-lime-soft text-forest", mist: "bg-mist text-muted", dark: "bg-forest text-lime" };
  const sizes = { sm: "size-9 [&>svg]:size-4", md: "size-12 [&>svg]:size-5", lg: "size-14 [&>svg]:size-6" };
  return (
    <span aria-hidden className={cx("grid shrink-0 place-items-center rounded-full", tones[tone], sizes[size], className)}>
      <Icon strokeWidth={1.8} />
    </span>
  );
}

/** Four-point sparkle (✦), the brand's punctuation mark. */
export const Sparkle = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={cx("shrink-0", className)} fill="currentColor">
    <path d="M12 0c.6 6.5 5.5 11.4 12 12-6.5.6-11.4 5.5-12 12-.6-6.5-5.5-11.4-12-12C6.5 11.4 11.4 6.5 12 0Z" />
  </svg>
);

/** Inline pill set into a headline, e.g. "Made For (✦) Digital Users". */
export const HeadlinePill = ({ className }) => (
  <span aria-hidden className={cx("mx-1 inline-flex h-[0.78em] w-[1.6em] translate-y-[0.06em] items-center justify-center rounded-full border-[3px] border-lime align-baseline", className)}>
    <Sparkle className="size-[0.36em] text-ink" />
  </span>
);

/** Scrolling ticker band: "Instant Online Debit ✦ Digital Banking ✦ …". */
export function Marquee({ items, tone = "forest", reverse = false, className }) {
  const tones = { forest: "bg-forest text-white [&_svg]:text-lime", lime: "bg-lime text-ink [&_svg]:text-forest" };
  const row = (hidden) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((item) => (
        <span key={item} className="flex items-center gap-8 font-display text-[20px] font-medium whitespace-nowrap sm:text-[24px]">
          {item}
          <Sparkle className="size-4" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={cx("overflow-hidden py-4 sm:py-5", tones[tone], className)}>
      {/* Two identical rows slide by half their width, so the loop is seamless. */}
      <div className={cx("flex w-max animate-marquee motion-reduce:animate-none", reverse && "[animation-direction:reverse]")}>
        {row(false)}
        {row(true)}
        {row(true)}
        {row(true)}
      </div>
    </div>
  );
}

/**
 * ON/OFF pill switch, as in the spec's "[ ON ●]". Reflects saved state only;
 * the parent decides what a click does (usually: open a verification flow).
 */
export function Toggle({ checked, onClick, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "relative inline-flex h-8 w-[68px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-forest" : "bg-mist ring-1 ring-line ring-inset",
      )}
    >
      <span aria-hidden className={cx("caps absolute text-[10px] transition-opacity", checked ? "left-3 text-lime" : "right-2.5 text-muted")}>
        {checked ? "On" : "Off"}
      </span>
      <span
        aria-hidden
        className={cx("absolute top-1 size-6 rounded-full shadow-sm transition-transform duration-200", checked ? "translate-x-[40px] bg-lime" : "translate-x-1 bg-surface")}
      />
    </button>
  );
}

export { cx };
