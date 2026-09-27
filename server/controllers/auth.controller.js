import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { assertCsrf } from "../middleware/csrf.js";
import { logSecurityEvent } from "../services/audit.service.js";
import { openStarterAccounts } from "../services/account.service.js";
import { WRONG_CODE_ERRORS, issueCode, verifyCode } from "../services/code.service.js";
import { findDevice, isTrusted, recognizeDevice } from "../services/device.service.js";
import { assertNotLocked, clearFailedAttempts, recordFailedAttempt } from "../services/lockout.service.js";
import { formatTime, sendCodeEmail, sendCodeSms, sendSecurityAlert } from "../services/notify.service.js";
import { passkeyAuthenticationOptions, verifyPasskeyAuthentication } from "../services/passkey.service.js";
import { clearSessionCookies, createSession, publicUser, revokeAllSessions, revokeCurrentSession, rotateSession } from "../services/session.service.js";
import { verifyTotp } from "../services/totp.service.js";
import { enabledMethodTypes } from "../services/twofa.service.js";
import { consumeVaultCode } from "../services/vault.service.js";
import { REFRESH_COOKIE } from "../utils/cookies.js";
import { DUMMY_PASSWORD_HASH, compareHash, hashPassword } from "../utils/crypto.js";
import { HttpError, badRequest, conflict, unauthorized } from "../utils/errors.js";
import { maskEmail, maskPhone } from "../utils/mask.js";
import { METHOD_NAMES } from "../utils/methods.js";
import { codeField, emailField, passwordField, phoneField, tokenField } from "../utils/schemas.js";
import { signPurposeToken, verifyPurposeToken } from "../utils/tokens.js";

const USER_LOCK_HOURS = 24;

export const schemas = {
  register: z.object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
    email: emailField,
    phone: z.preprocess((v) => (v === "" || v === null ? undefined : v), phoneField.optional()),
    password: passwordField,
  }),
  verifyEmail: z.object({ verificationToken: tokenField, code: codeField }),
  resendVerification: z.object({ verificationToken: tokenField }),
  login: z.object({ email: emailField, password: z.string().min(1, "Enter your password.").max(128) }),
  send2fa: z.object({ challengeToken: tokenField, method: z.enum(["EMAIL", "SMS"]) }),
  passkeyOptions: z.object({ challengeToken: tokenField }),
  verify2fa: z
    .object({
      challengeToken: tokenField,
      method: z.enum(["EMAIL", "SMS", "TOTP", "PASSKEY", "VAULT"]),
      code: z.string().trim().max(20).optional(),
      credential: z.looseObject({ id: z.string() }).optional(),
      trustDevice: z.boolean().optional().default(false),
    })
    .superRefine((v, ctx) => {
      if (["EMAIL", "SMS", "TOTP"].includes(v.method) && !/^\d{6}$/.test(v.code ?? "")) {
        ctx.addIssue({ code: "custom", path: ["code"], message: "Enter the 6-digit code." });
      }
      if (v.method === "VAULT" && !v.code) ctx.addIssue({ code: "custom", path: ["code"], message: "Enter one of your Vault Codes." });
      if (v.method === "PASSKEY" && !v.credential) ctx.addIssue({ code: "custom", path: ["credential"], message: "Passkey response missing." });
    }),
  lock: z.object({ token: tokenField }),
};

const invalidCredentials = () => unauthorized("That email and password don't match our records.", { code: "INVALID_CREDENTIALS" });

function sendEmailVerification(req, user) {
  return issueCode({ userId: user.id, purpose: "VERIFY_EMAIL" }, (code) => sendCodeEmail("verify-email", { user, req, ...code }));
}

async function verificationUser(token) {
  const { sub } = verifyPurposeToken("verify-email", token);
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) throw unauthorized();
  if (user.emailVerified) throw conflict("This email is already verified. Please sign in.", { code: "ALREADY_VERIFIED" });
  return user;
}

/** Finishes any successful sign-in: device recognition, audit, new-device alert, session. */
async function completeLogin(req, res, user, { verifiedWith, trustDevice = false, alertNewDevice = true }) {
  const { device, isNew } = await recognizeDevice(req, res, user.id, { trust: trustDevice });
  await clearFailedAttempts(user);
  await logSecurityEvent(user.id, "LOGIN_SUCCESS", req, verifiedWith);
  if (isNew && alertNewDevice) {
    await logSecurityEvent(user.id, "NEW_DEVICE", req, device.label);
    sendSecurityAlert("new-device-alert", { user, req, verifiedWith });
  }
  return createSession(req, res, user, device.id);
}

export async function register(req, res) {
  const { fullName, email, phone, password } = req.body;
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw conflict("An account with this email already exists. Try signing in instead.", { code: "EMAIL_TAKEN" });
  }

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { fullName, email, phone: phone ?? null, passwordHash } });
      await openStarterAccounts(created.id, tx);
      return created;
    });
  } catch (err) {
    if (err.code === "P2002") throw conflict("An account with this email already exists. Try signing in instead.", { code: "EMAIL_TAKEN" });
    throw err;
  }
  await logSecurityEvent(user.id, "ACCOUNT_CREATED", req);

  // The account exists either way; if the email fails the user can resend from the next screen.
  const delivery = await sendEmailVerification(req, user).catch(() => ({ sent: false, resendIn: 0 }));
  res.status(201).json({
    verificationToken: signPurposeToken("verify-email", { sub: user.id }),
    maskedEmail: maskEmail(user.email),
    sent: delivery.sent ?? true,
    ...delivery,
  });
}

export async function verifyEmail(req, res) {
  const user = await verificationUser(req.body.verificationToken);
  await verifyCode({ userId: user.id, purpose: "VERIFY_EMAIL", code: req.body.code });
  const verified = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  await logSecurityEvent(user.id, "EMAIL_VERIFIED", req);
  res.json(await completeLogin(req, res, verified, { verifiedWith: "Email verification", alertNewDevice: false }));
}

export async function resendVerification(req, res) {
  const user = await verificationUser(req.body.verificationToken);
  res.json({ sent: true, ...(await sendEmailVerification(req, user)) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    await compareHash(password, DUMMY_PASSWORD_HASH);
    throw invalidCredentials();
  }
  assertNotLocked(user);

  if (!(await compareHash(password, user.passwordHash))) {
    await recordFailedAttempt(req, user, "LOGIN_FAILED", "Wrong password");
    throw invalidCredentials();
  }

  if (!user.emailVerified) {
    const delivery = await sendEmailVerification(req, user).catch((err) => {
      if (err.code === "RESEND_COOLDOWN") return { sent: true, resendIn: err.details.retryAfter };
      throw err;
    });
    return res.json({
      requiresEmailVerification: true,
      verificationToken: signPurposeToken("verify-email", { sub: user.id }),
      maskedEmail: maskEmail(user.email),
      ...delivery,
    });
  }

  const methods = user.twoFactorOn ? await enabledMethodTypes(user.id) : [];
  const device = await findDevice(req, user.id);
  if (!methods.length || isTrusted(device)) {
    return res.json(await completeLogin(req, res, user, { verifiedWith: methods.length ? "Trusted device" : "Password" }));
  }

  res.json({
    requires2FA: true,
    challengeToken: signPurposeToken("login-challenge", { sub: user.id }),
    methods,
    default: methods.includes(user.defaultMethod) ? user.defaultMethod : methods[0],
    maskedEmail: maskEmail(user.email),
    maskedPhone: maskPhone(user.phone),
  });
}

async function challengeUser(challengeToken) {
  const { sub } = verifyPurposeToken("login-challenge", challengeToken);
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) throw unauthorized();
  assertNotLocked(user);
  return user;
}

async function enabledMethod(userId, type) {
  const row = await prisma.twoFactorMethod.findUnique({ where: { userId_type: { userId, type } } });
  if (!row?.enabled) throw badRequest(`${METHOD_NAMES[type]} isn't set up on this account.`, { code: "METHOD_NOT_ENABLED" });
  return row;
}

export async function send2fa(req, res) {
  const user = await challengeUser(req.body.challengeToken);
  const { method } = req.body;
  await enabledMethod(user.id, method);

  const scope = { userId: user.id, purpose: "LOGIN", method };
  const delivery =
    method === "EMAIL"
      ? await issueCode(scope, (code) => sendCodeEmail("login-otp", { user, req, ...code }))
      : await issueCode(scope, (code) => sendCodeSms("LOGIN", { to: user.phone, ...code }));

  res.json({ sent: true, destination: method === "EMAIL" ? maskEmail(user.email) : maskPhone(user.phone), ...delivery });
}

export async function passkeyLoginOptions(req, res) {
  const user = await challengeUser(req.body.challengeToken);
  await enabledMethod(user.id, "PASSKEY");
  res.json(await passkeyAuthenticationOptions(user));
}

// Wrong answers — not expired or missing codes — count toward the account lockout.
const FAILED_2FA_CODES = new Set([...WRONG_CODE_ERRORS, "TOTP_INVALID", "PASSKEY_FAILED", "VAULT_INVALID"]);

export async function verify2fa(req, res) {
  const user = await challengeUser(req.body.challengeToken);
  const { method, code, credential, trustDevice } = req.body;

  try {
    if (method === "EMAIL" || method === "SMS") {
      await enabledMethod(user.id, method);
      await verifyCode({ userId: user.id, purpose: "LOGIN", method, code });
    } else if (method === "TOTP") {
      const row = await enabledMethod(user.id, "TOTP");
      if (!(await verifyTotp(row, code))) {
        throw badRequest("That code isn't right, or it was already used. Wait for a new code in your app and try again.", { code: "TOTP_INVALID" });
      }
    } else if (method === "PASSKEY") {
      await enabledMethod(user.id, "PASSKEY");
      if (!(await verifyPasskeyAuthentication(user, credential))) {
        throw badRequest("We couldn't verify your passkey. Please try again.", { code: "PASSKEY_FAILED" });
      }
    } else {
      const remaining = await consumeVaultCode(user.id, code);
      if (remaining === null) throw badRequest("That Vault Code isn't valid or has already been used.", { code: "VAULT_INVALID" });
      await logSecurityEvent(user.id, "VAULT_CODE_USED", req, `${remaining} remaining`);
      sendSecurityAlert("vault-code-used", { user, req, remaining });
    }
  } catch (err) {
    if (err instanceof HttpError && FAILED_2FA_CODES.has(err.code)) {
      await recordFailedAttempt(req, user, "LOGIN_2FA_FAILED", METHOD_NAMES[method] ?? "Vault Code");
    }
    throw err;
  }

  if (method !== "VAULT") {
    await prisma.twoFactorMethod.update({ where: { userId_type: { userId: user.id, type: method } }, data: { lastUsedAt: new Date() } });
  }
  res.json(await completeLogin(req, res, user, { verifiedWith: METHOD_NAMES[method] ?? "Vault Code", trustDevice }));
}

export async function refresh(req, res) {
  if (!req.cookies?.[REFRESH_COOKIE]) throw unauthorized("No active session.", { code: "NO_SESSION" });
  assertCsrf(req);
  res.json(await rotateSession(req, res));
}

export async function logout(req, res) {
  if (req.cookies?.[REFRESH_COOKIE]) {
    assertCsrf(req);
    const userId = await revokeCurrentSession(req);
    if (userId) await logSecurityEvent(userId, "LOGOUT", req);
  }
  clearSessionCookies(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

/** "If this wasn't you, lock your account" — reached from the link in every security email. */
export async function lockAccount(req, res) {
  const { sub } = verifyPurposeToken("lock", req.body.token);
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) throw unauthorized();

  const now = new Date();
  const lockedUntil = new Date(now.getTime() + USER_LOCK_HOURS * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lockedUntil, failedAttempts: 0, tokensValidAfter: now } }),
    prisma.device.updateMany({ where: { userId: user.id }, data: { trustedUntil: null } }),
  ]);
  await revokeAllSessions(user.id);
  await logSecurityEvent(user.id, "ACCOUNT_LOCKED_BY_USER", req);
  sendSecurityAlert("account-locked", { user, req, byUser: true, until: formatTime(lockedUntil), withLockLink: false });
  res.json({ locked: true, lockedUntil });
}
