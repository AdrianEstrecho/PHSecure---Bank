/** d•••@gmail.com */
export function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}•••@${domain}`;
}

// Two-digit calling codes; anything starting with 1 or 7 is one digit, everything else three.
const TWO_DIGIT_CODES = new Set(
  "20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98".split(" "),
);

function countryCodeLength(digits) {
  if (digits.startsWith("1") || digits.startsWith("7")) return 1;
  if (TWO_DIGIT_CODES.has(digits.slice(0, 2))) return 2;
  return 3;
}

/** +63 •••• ••• 4821 */
export function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return `+${digits.slice(0, countryCodeLength(digits))} •••• ••• ${digits.slice(-4)}`;
}

/** •••• 4821 */
export const maskAccountNumber = (number) => `•••• ${number.slice(-4)}`;
