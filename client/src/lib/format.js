const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

export const formatMoney = (value) => currency.format(Number(value));

/** Splits ₱1,234.56 into { whole: "₱1,234", cents: ".56" } so the cents can be typeset smaller. */
export function splitMoney(value) {
  const formatted = formatMoney(value);
  const dot = formatted.lastIndexOf(".");
  return { whole: formatted.slice(0, dot), cents: formatted.slice(dot) };
}

export const formatDate = (value) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));

export const formatDateTime = (value) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function timeAgo(value) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}


