const COMMON = ["password", "123456", "qwerty", "letmein", "phsecure", "welcome", "iloveyou", "admin"];

/** Rough 0–4 strength estimate for the register form's meter. The server enforces the real minimum. */
export function passwordStrength(password) {
  if (!password) return { score: 0, label: "", hint: "Use at least 10 characters with a letter and a number." };
  const lower = password.toLowerCase();
  if (COMMON.some((w) => lower.includes(w))) return { score: 1, label: "Weak", hint: "Avoid common words and patterns." };

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (classes >= 3) score++;
  if (classes === 4 && password.length >= 12) score++;
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) score = Math.min(score, 1);

  const labels = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
  const hint =
    password.length < 10
      ? `${10 - password.length} more character${password.length === 9 ? "" : "s"} needed.`
      : score < 3
        ? "Mix upper and lower case, numbers and symbols."
        : "Good choice.";
  return { score, label: labels[score], hint };
}
