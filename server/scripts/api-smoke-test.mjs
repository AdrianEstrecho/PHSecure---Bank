// End-to-end API smoke test: npm run test:api (with the dev server running and BREVO_API_KEY empty).
// It reads codes from the dev outbox, creates throwaway users, and nudges timestamps in the database
// to test expiry and cooldowns — point it at a development database only.
import { PrismaClient } from "@prisma/client";
import otplib from "otplib";

const { authenticator } = otplib;
const prisma = new PrismaClient();
const BASE = process.env.API_URL ?? "http://localhost:5000/api";
let failures = 0;
const check = (cond, label, extra) => {
  console.log(`${cond ? "✓" : "✗"} ${label}${!cond && extra !== undefined ? `  → ${JSON.stringify(extra)}` : ""}`);
  if (!cond) failures++;
};

class Client {
  constructor() { this.jar = new Map(); this.token = null; }
  async req(method, path, body, headers = {}) {
    const h = { "content-type": "application/json", ...headers };
    if (this.jar.size) h.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    if (this.token) h.authorization = `Bearer ${this.token}`;
    const csrf = this.jar.get("aur_csrf");
    if (csrf && !("x-csrf-token" in headers)) h["x-csrf-token"] = decodeURIComponent(csrf);
    const res = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(";");
      const idx = pair.indexOf("=");
      const k = pair.slice(0, idx).trim(), v = pair.slice(idx + 1);
      if (!v || attrs.some((a) => /expires=Thu, 01 Jan 1970/i.test(a))) this.jar.delete(k);
      else this.jar.set(k, v);
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data };
  }
  get = (p, h) => this.req("GET", p, undefined, h);
  post = (p, b, h) => this.req("POST", p, b ?? {}, h);
  patch = (p, b) => this.req("PATCH", p, b);
}

async function outbox() {
  const r = await fetch(`${BASE}/dev/outbox.json`);
  return (await r.json()).messages;
}
async function latestCode(to, subjectPart) {
  const msgs = await outbox();
  const m = msgs.find((x) => x.to === to && (!subjectPart || x.subject.includes(subjectPart)));
  if (!m) return null;
  const match = (m.text ?? "").match(/Your code: (\d{6})/) ?? (m.text ?? "").match(/(\d{6})/);
  return { code: match?.[1], message: m };
}

const email = `test${Date.now()}@example.com`;
const password = "Correct-Horse-9";
const a = new Client();

// ── Health & register ─────────────────────────────────────────
check((await a.get("/health")).data?.ok, "health");
let r = await a.post("/auth/register", { fullName: "Tess Tester", email, password: "short" });
check(r.status === 400 && r.data.error.code === "VALIDATION", "register rejects weak password", r.data);
r = await a.post("/auth/register", { fullName: "Tess Tester", email, phone: "", password });
check(r.status === 201 && r.data.verificationToken && r.data.maskedEmail === "t•••@example.com", "register", r.data);
const verificationToken = r.data.verificationToken;
r = await a.post("/auth/register", { fullName: "Tess Tester", email, password });
check(r.status === 409, "duplicate email rejected");

let c = await latestCode(email, "Verify your email");
check(c?.code && c.message.html.includes("lock your account immediately"), "verify-email mail in outbox with lock line");
check(c.message.html.includes("Local network") && c.message.html.includes("Device"), "code mail has device + location");
r = await a.post("/auth/verify-email", { verificationToken, code: c.code });
check(r.status === 200 && r.data.accessToken && r.data.user.emailVerified, "verify email → signed in", r.data);
a.token = r.data.accessToken;
check(a.jar.has("aur_rt") && a.jar.has("aur_csrf") && a.jar.has("aur_device"), "session + device cookies set", [...a.jar.keys()]);

r = await a.get("/auth/me");
check(r.status === 200 && r.data.user.maskedEmail === "t•••@example.com" && !("email" in r.data.user), "me returns masked user only", r.data);
r = await a.get("/accounts");
check(r.status === 200 && r.data.accounts.length === 2 && r.data.total === "650000.00", "starter accounts", r.data);
const [current, savings] = r.data.accounts;

r = await a.get("/2fa/status");
check(r.data.twoFactorOn === false && r.data.methods.every((m) => !m.enabled) && r.data.vault.total === 0, "status: all off", r.data);

// ── Enable EMAIL ──────────────────────────────────────────────
r = await a.post("/2fa/enable/request", { method: "EMAIL" });
check(r.status === 200 && r.data.resendIn === 60, "enable EMAIL: code sent", r.data);
r = await a.post("/2fa/enable/request", { method: "EMAIL" });
check(r.status === 429 && r.data.error.code === "RESEND_COOLDOWN", "resend cooldown enforced", r.data);
c = await latestCode(email, "turn on PHSecure Mail Key");
check(Boolean(c?.code), "verify-enable-2fa email subject", c?.message?.subject);
const wrong = c.code === "000000" ? "111111" : "000000";
r = await a.post("/2fa/enable/verify-email", { method: "EMAIL", code: wrong });
check(r.status === 400 && r.data.error.details?.attemptsLeft === 4, "wrong code → 4 attempts left", r.data);
r = await a.post("/2fa/enable/verify-email", { method: "EMAIL", code: c.code });
check(r.status === 200 && r.data.setupToken, "correct code → setupToken", r.data);
r = await a.post("/2fa/enable/confirm", { setupToken: r.data.setupToken });
check(r.status === 200 && r.data.vaultCodes?.length === 10 && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(r.data.vaultCodes[0]), "EMAIL on + 10 Vault Codes", r.data);
let vaultCodes = r.data.vaultCodes;
check(r.data.status.twoFactorOn && r.data.status.defaultMethod === "EMAIL", "twoFactorOn, default EMAIL");
r = await a.post("/2fa/enable/request", { method: "EMAIL" });
check(r.status === 409, "can't re-enable EMAIL");

// ── Enable TOTP ───────────────────────────────────────────────
await a.post("/2fa/enable/request", { method: "TOTP" });
c = await latestCode(email, "PHSecure Authenticator");
r = await a.post("/2fa/enable/verify-email", { method: "TOTP", code: c.code });
const totpSetupToken = r.data.setupToken;
r = await a.post("/2fa/totp/setup", { setupToken: totpSetupToken });
check(r.status === 200 && r.data.qrCode.startsWith("data:image/png") && r.data.otpauthUrl.startsWith("otpauth://totp/"), "TOTP QR + secret", r.status);
const secret = r.data.secret.replace(/ /g, "");
r = await a.post("/2fa/enable/confirm", { setupToken: totpSetupToken, code: "123456" === authenticator.generate(secret) ? "654321" : "123456" });
check(r.status === 400 && r.data.error.code === "TOTP_INVALID", "TOTP wrong code rejected", r.data);
const totpCode = authenticator.generate(secret);
r = await a.post("/2fa/enable/confirm", { setupToken: totpSetupToken, code: totpCode });
check(r.status === 200 && r.data.vaultCodes === null, "TOTP on (no new vault codes)", r.data);
const row = await prisma.twoFactorMethod.findFirst({ where: { type: "TOTP", user: { email } } });
check(row.totpSecret.startsWith("v1:") && !row.totpSecret.includes(secret), "TOTP secret encrypted at rest");

// ── Enable SMS ────────────────────────────────────────────────
await a.post("/2fa/enable/request", { method: "SMS" });
c = await latestCode(email, "PHSecure Text Key");
r = await a.post("/2fa/enable/verify-email", { method: "SMS", code: c.code });
const smsSetupToken = r.data.setupToken;
r = await a.post("/2fa/sms/setup", { setupToken: smsSetupToken, phone: "0917 123" });
check(r.status === 400, "invalid phone rejected");
r = await a.post("/2fa/sms/setup", { setupToken: smsSetupToken, phone: "+63 917 123 4821" });
check(r.status === 200 && r.data.maskedPhone === "+63 •••• ••• 4821", "SMS code sent, phone masked", r.data);
c = await latestCode("+639171234821");
check(Boolean(c?.code), "SMS in outbox");
r = await a.post("/2fa/enable/confirm", { setupToken: smsSetupToken, code: c.code });
check(r.status === 200 && r.data.status.phoneVerified && r.data.status.methods.find((m) => m.type === "SMS").enabled, "SMS on + phone verified", r.data);

// ── Passkey options ───────────────────────────────────────────
await a.post("/2fa/enable/request", { method: "PASSKEY" });
c = await latestCode(email, "PHSecure Touch");
r = await a.post("/2fa/enable/verify-email", { method: "PASSKEY", code: c.code });
r = await a.get("/2fa/passkey/options", { "x-setup-token": r.data.setupToken });
check(r.status === 200 && r.data.challenge && r.data.rp.id === "localhost" && r.data.user.name === email, "passkey registration options", r.data);
r = await a.get("/2fa/passkey/options", { "x-setup-token": totpSetupToken });
check(r.status === 400 && r.data.error.code === "SETUP_MISMATCH", "setup token bound to method", r.data);

// ── Default + refresh ─────────────────────────────────────────
r = await a.patch("/2fa/default", { method: "PASSKEY" });
check(r.status === 400, "can't default to a disabled method");
r = await a.patch("/2fa/default", { method: "TOTP" });
check(r.status === 200 && r.data.defaultMethod === "TOTP", "default → TOTP");

const oldRt = a.jar.get("aur_rt");
r = await a.post("/auth/refresh", {}, { "x-csrf-token": "nope" });
check(r.status === 403 && r.data.error.code === "CSRF_FAILED", "refresh requires CSRF header", r.data);
r = await a.post("/auth/refresh");
check(r.status === 200 && r.data.accessToken && a.jar.get("aur_rt") !== oldRt, "refresh rotates token", r.data);
a.token = r.data.accessToken;
const b = new Client();
b.jar.set("aur_rt", oldRt);
b.jar.set("aur_csrf", a.jar.get("aur_csrf"));
r = await b.post("/auth/refresh");
check(r.status === 200, "old refresh token OK within grace window (parallel tabs)");

// ── Logout → login with 2FA ───────────────────────────────────
r = await a.post("/auth/logout");
check(r.status === 204 && !a.jar.has("aur_rt"), "logout clears session");
a.token = null;
r = await a.post("/auth/refresh");
check(r.status === 401, "no session after logout");

r = await a.post("/auth/login", { email, password: "Wrong-password-1" });
check(r.status === 401 && r.data.error.code === "INVALID_CREDENTIALS", "wrong password rejected");
r = await a.post("/auth/login", { email: "nobody@example.com", password });
check(r.status === 401 && r.data.error.code === "INVALID_CREDENTIALS", "unknown email gets same error");
r = await a.post("/auth/login", { email, password });
check(r.status === 200 && r.data.requires2FA && r.data.default === "TOTP" && r.data.methods.join() === "EMAIL,TOTP,SMS" && !a.jar.has("aur_rt"), "login → 2FA challenge, no session yet", r.data);
let challengeToken = r.data.challengeToken;

r = await a.post("/auth/2fa/verify", { challengeToken, method: "TOTP", code: totpCode });
check(r.status === 400 && r.data.error.code === "TOTP_INVALID", "TOTP code reuse blocked", r.data);
r = await a.post("/auth/2fa/verify", { challengeToken, method: "VAULT", code: vaultCodes[0].toLowerCase().replace("-", "") });
check(r.status === 200 && r.data.accessToken, "Vault Code sign-in (case/dash-insensitive)", r.data);
a.token = r.data.accessToken;
r = await a.get("/2fa/status");
check(r.data.vault.remaining === 9, "vault 9 of 10 remaining", r.data.vault);
await a.post("/auth/logout");

r = await a.post("/auth/login", { email, password });
challengeToken = r.data.challengeToken;
r = await a.post("/auth/2fa/verify", { challengeToken, method: "VAULT", code: vaultCodes[0] });
check(r.status === 400 && r.data.error.code === "VAULT_INVALID", "Vault Code single-use", r.data);
r = await a.post("/auth/2fa/send", { challengeToken, method: "EMAIL" });
check(r.status === 200 && r.data.destination === "t•••@example.com", "login email code sent", r.data);
c = await latestCode(email, "sign-in code");
r = await a.post("/auth/2fa/verify", { challengeToken, method: "EMAIL", code: c.code, trustDevice: true });
check(r.status === 200, "EMAIL sign-in + trust device", r.data);
await a.post("/auth/logout");
r = await a.post("/auth/login", { email, password });
check(r.status === 200 && r.data.accessToken && !r.data.requires2FA, "trusted device skips 2FA", r.data);
a.token = r.data.accessToken;

// ── New device: SMS + TOTP next step + new-device alert ───────
const d = new Client();
r = await d.post("/auth/login", { email, password });
check(r.data.requires2FA, "new device needs 2FA");
challengeToken = r.data.challengeToken;
r = await d.post("/auth/2fa/send", { challengeToken, method: "SMS" });
check(r.status === 200 && r.data.destination === "+63 •••• ••• 4821", "login SMS sent", r.data);
const nextCode = authenticator.clone({ epoch: Date.now() + 30000 }).generate(secret);
r = await d.post("/auth/2fa/verify", { challengeToken, method: "TOTP", code: nextCode });
check(r.status === 200, "TOTP sign-in (±1 window, next step)", r.data);
const alert = (await outbox()).find((m) => m.to === email && m.subject === "New sign-in to your account");
check(Boolean(alert), "new-device alert emailed");

// ── Expired + locked codes ────────────────────────────────────
await a.post("/2fa/disable/request", { method: "SMS", password });
await prisma.verificationCode.updateMany({ where: { purpose: "DISABLE_2FA", usedAt: null, user: { email } }, data: { expiresAt: new Date(Date.now() - 1000) } });
c = await latestCode(email, "turn off PHSecure Text Key");
r = await a.post("/2fa/disable/confirm", { method: "SMS", code: c.code });
check(r.status === 400 && r.data.error.code === "CODE_EXPIRED", "expired code rejected", r.data);

await prisma.verificationCode.updateMany({ where: { purpose: "DISABLE_2FA", user: { email } }, data: { createdAt: new Date(Date.now() - 61000) } });
r = await a.post("/2fa/disable/request", { method: "SMS", password: "not-my-password1" });
check(r.status === 400 && r.data.error.code === "PASSWORD_INVALID", "disable needs correct password", r.data);
r = await a.post("/2fa/disable/request", { method: "SMS", password });
check(r.status === 200 && r.data.isLastMethod === false, "disable SMS: code sent", r.data);
c = await latestCode(email, "turn off PHSecure Text Key");
for (let i = 0; i < 5; i++) r = await a.post("/2fa/disable/confirm", { method: "SMS", code: c.code === "000000" ? "999999" : "000000" });
check(r.status === 400 && r.data.error.code === "CODE_LOCKED", "5 wrong tries invalidates the code", r.data);
r = await a.post("/2fa/disable/confirm", { method: "SMS", code: c.code });
check(r.status === 400, "correct code no longer works after lockout", r.data);

await prisma.verificationCode.updateMany({ where: { purpose: "DISABLE_2FA", user: { email } }, data: { createdAt: new Date(Date.now() - 61000) } });
await a.post("/2fa/disable/request", { method: "SMS", password });
c = await latestCode(email, "turn off PHSecure Text Key");
r = await a.post("/2fa/disable/confirm", { method: "SMS", code: c.code });
check(r.status === 200 && !r.data.fullyOff && !r.data.status.methods.find((m) => m.type === "SMS").enabled, "SMS turned off", r.data);
check((await outbox()).some((m) => m.to === email && m.subject === "A security method was turned off"), "2fa-disabled-alert emailed");

// ── Vault regenerate ──────────────────────────────────────────
r = await a.post("/2fa/backup/regenerate/request");
c = await latestCode(email, "Confirm new Vault Codes");
r = await a.post("/2fa/backup/regenerate", { code: c.code });
check(r.status === 200 && r.data.vaultCodes.length === 10 && r.data.status.vault.remaining === 10, "Vault Codes regenerated", r.data);
vaultCodes = r.data.vaultCodes;

// ── Disable all → 2FA fully off ───────────────────────────────
for (const method of ["TOTP", "EMAIL"]) {
  await a.post("/2fa/disable/request", { method, password });
  c = await latestCode(email, `turn off`);
  r = await a.post("/2fa/disable/confirm", { method, code: c.code });
}
check(r.status === 200 && r.data.fullyOff && r.data.status.twoFactorOn === false && r.data.status.vault.total === 0, "last method off → 2FA fully off, vault cleared", r.data);

// ── Transfers ─────────────────────────────────────────────────
r = await a.post("/transfers", { kind: "internal", fromAccountId: current.id, toAccountId: savings.id, amount: "2500.50" });
check(r.status === 201, "internal transfer", r.data);
r = await a.post("/transfers", { kind: "external", fromAccountId: current.id, payeeName: "Marco Diaz", payeeBank: "Harbor Bank", payeeAccount: "1234567890", amount: "999999999" });
check(r.status === 400, "insufficient funds / limit rejected", r.data);
r = await a.get("/accounts");
check(r.data.accounts[0].balance === "147499.50" && r.data.accounts[1].balance === "502500.50" && r.data.total === "650000.00", "balances updated", r.data);
r = await a.get("/accounts/transactions?limit=5");
check(r.data.transactions.length === 4 && r.data.transactions[0].category === "Transfer", "transactions listed", r.data);

// ── Security log ──────────────────────────────────────────────
r = await a.get("/security/logs");
const events = new Set(r.data.logs.map((l) => l.event));
for (const e of ["ACCOUNT_CREATED", "EMAIL_VERIFIED", "2FA_ENABLED", "2FA_DISABLED", "2FA_TURNED_OFF", "LOGIN_SUCCESS", "LOGIN_FAILED", "VAULT_CODE_USED", "VAULT_CODES_GENERATED", "NEW_DEVICE", "DEFAULT_METHOD_CHANGED", "PHONE_VERIFIED", "LOGOUT"]) {
  check(events.has(e), `log has ${e}`);
}

// ── Lockout after 5 failed passwords ──────────────────────────
const dbUser = await prisma.user.findUnique({ where: { email } });
check(dbUser.failedAttempts === 1, "failed attempts reset on sign-in (1 = later disable-password failure)", dbUser.failedAttempts);
console.log("  (waiting 61s for the per-IP login limiter window to reset)");
await new Promise((res) => setTimeout(res, 61000));
const l = new Client();
for (let i = 0; i < 4; i++) await l.post("/auth/login", { email, password: "Bad-password-1" });
r = await l.post("/auth/login", { email, password: "Bad-password-1" });
check(r.status === 423 && r.data.error.code === "ACCOUNT_LOCKED", "5th failure locks account", r.data);
r = await l.post("/auth/login", { email, password });
check(r.status === 423, "correct password refused while locked");
check((await outbox()).some((m) => m.to === email && m.subject.includes("locked")), "lock alert emailed");
await prisma.user.update({ where: { email }, data: { lockedUntil: null } });

// ── "Lock my account" link ────────────────────────────────────
const lockMail = (await outbox()).find((m) => m.to === email && m.html?.includes("/lock?token="));
const lockToken = lockMail.html.match(/\/lock\?token=([\w.-]+)/)[1];
r = await a.post("/auth/lock", { token: lockToken });
check(r.status === 200 && r.data.locked, "lock link locks account", r.data);
r = await a.get("/auth/me");
check(r.status === 401 && r.data.error.code === "AUTH_REVOKED", "existing access token revoked", r.data);
r = await a.post("/auth/refresh");
check(r.status === 401, "refresh session revoked");

await prisma.$disconnect();
console.log(`\n${failures ? `✗ ${failures} failure(s)` : "✓ all checks passed"}`);
process.exit(failures ? 1 : 0);
