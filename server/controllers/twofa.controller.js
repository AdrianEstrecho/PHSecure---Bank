import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logSecurityEvent } from "../services/audit.service.js";
import { issueCode, verifyCode } from "../services/code.service.js";
import { recordFailedAttempt } from "../services/lockout.service.js";
import { sendCodeEmail, sendCodeSms, sendSecurityAlert } from "../services/notify.service.js";
import { passkeyRegistrationOptions, verifyPasskeyRegistration } from "../services/passkey.service.js";
import { startTotpSetup, verifyTotp } from "../services/totp.service.js";
import { buildStatus, enabledMethodTypes } from "../services/twofa.service.js";
import { createVaultCodeSet, storeVaultCodes } from "../services/vault.service.js";
import { compareHash } from "../utils/crypto.js";
import { badRequest, conflict, forbidden, unauthorized } from "../utils/errors.js";
import { maskEmail, maskPhone } from "../utils/mask.js";
import { METHOD_NAMES, METHOD_TYPES } from "../utils/methods.js";
import { codeField, methodField, phoneField, tokenField } from "../utils/schemas.js";
import { signPurposeToken, verifyPurposeToken } from "../utils/tokens.js";

export const schemas = {
  method: z.object({ method: methodField }),
  methodCode: z.object({ method: methodField, code: codeField }),
  setupToken: z.object({ setupToken: tokenField }),
  smsSetup: z.object({ setupToken: tokenField, phone: phoneField }),
  confirm: z.object({
    setupToken: tokenField,
    code: z.string().trim().optional(),
    credential: z.looseObject({ id: z.string() }).optional(),
    deviceName: z.string().trim().min(1).max(40).optional().default("Passkey"),
  }),
  disableRequest: z.object({ method: methodField, password: z.string().min(1, "Enter your password.").max(128) }),
  code: z.object({ code: codeField }),
};

const methodRow = (userId, type) => prisma.twoFactorMethod.findUnique({ where: { userId_type: { userId, type } } });

/** Reads a setup token and checks it belongs to this user (and, optionally, this method). */
function readSetupToken(req, token, expectedMethod) {
  const payload = verifyPurposeToken("setup", token);
  if (payload.sub !== req.user.id) throw unauthorized("This setup session belongs to someone else.", { code: "SETUP_MISMATCH" });
  if (expectedMethod && payload.method !== expectedMethod) throw badRequest("This setup session is for a different method.", { code: "SETUP_MISMATCH" });
  return payload.method;
}

// Passkeys can be added repeatedly (one per device); every other method is a simple on/off.
const assertCanEnable = (row, method) => {
  if (row?.enabled && method !== "PASSKEY") throw conflict(`${METHOD_NAMES[method]} is already on.`, { code: "ALREADY_ENABLED" });
};

export async function status(req, res) {
  res.json(await buildStatus(req.user.id));
}

/** Step 1 of enabling any method: email a confirmation code. */
export async function enableRequest(req, res) {
  const user = req.user;
  const { method } = req.body;
  assertCanEnable(await methodRow(user.id, method), method);

  const delivery = await issueCode({ userId: user.id, purpose: "ENABLE_2FA", method }, (code) =>
    sendCodeEmail("verify-enable-2fa", { user, req, methodName: METHOD_NAMES[method], ...code }),
  );
  res.json({ maskedEmail: maskEmail(user.email), ...delivery });
}

/** Step 2: the emailed code is exchanged for a short-lived setup token. */
export async function enableVerifyEmail(req, res) {
  const { method, code } = req.body;
  await verifyCode({ userId: req.user.id, purpose: "ENABLE_2FA", method, code });
  res.json({ setupToken: signPurposeToken("setup", { sub: req.user.id, method }) });
}

export async function totpSetup(req, res) {
  readSetupToken(req, req.body.setupToken, "TOTP");
  assertCanEnable(await methodRow(req.user.id, "TOTP"), "TOTP");
  res.json(await startTotpSetup(req.user));
}

export async function smsSetup(req, res) {
  readSetupToken(req, req.body.setupToken, "SMS");
  assertCanEnable(await methodRow(req.user.id, "SMS"), "SMS");
  const { phone } = req.body;

  const delivery = await issueCode({ userId: req.user.id, purpose: "VERIFY_PHONE", method: "SMS", target: phone }, (code) =>
    sendCodeSms("VERIFY_PHONE", { to: phone, ...code }),
  );
  res.json({ maskedPhone: maskPhone(phone), ...delivery });
}

export async function passkeyOptions(req, res) {
  readSetupToken(req, req.get("x-setup-token"), "PASSKEY");
  res.json(await passkeyRegistrationOptions(req.user));
}

/** Step 3: method-specific proof, then the method is switched on. */
export async function enableConfirm(req, res) {
  const user = req.user;
  const method = readSetupToken(req, req.body.setupToken);
  const existing = await methodRow(user.id, method);
  assertCanEnable(existing, method);

  let phone = null;
  let passkey = null;
  if (method === "TOTP") {
    if (!(await verifyTotp(existing, req.body.code ?? ""))) {
      throw badRequest("That code doesn't match. Make sure your phone's clock is set automatically and enter the newest code.", { code: "TOTP_INVALID" });
    }
  } else if (method === "SMS") {
    ({ target: phone } = await verifyCode({ userId: user.id, purpose: "VERIFY_PHONE", method: "SMS", code: req.body.code ?? "" }));
  } else if (method === "PASSKEY") {
    if (!req.body.credential) throw badRequest("Passkey response missing.", { code: "VALIDATION" });
    passkey = await verifyPasskeyRegistration(user, req.body.credential);
  }

  const addingPasskey = method === "PASSKEY" && existing?.enabled;
  const firstMethod = !user.twoFactorOn;
  const vault = firstMethod ? await createVaultCodeSet() : null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    if (passkey) await tx.passkey.create({ data: { ...passkey, userId: user.id, deviceName: req.body.deviceName } });
    if (phone) await tx.user.update({ where: { id: user.id }, data: { phone, phoneVerified: true } });
    await tx.twoFactorMethod.upsert({
      where: { userId_type: { userId: user.id, type: method } },
      create: { userId: user.id, type: method, enabled: true, enabledAt: now },
      update: { enabled: true, enabledAt: addingPasskey ? existing.enabledAt : now },
    });
    await tx.user.update({ where: { id: user.id }, data: { twoFactorOn: true, defaultMethod: user.defaultMethod ?? method } });
    if (vault) await storeVaultCodes(tx, user.id, vault.hashes);
  });

  const methodName = addingPasskey ? `${METHOD_NAMES.PASSKEY} (${req.body.deviceName})` : METHOD_NAMES[method];
  await logSecurityEvent(user.id, addingPasskey ? "PASSKEY_ADDED" : "2FA_ENABLED", req, addingPasskey ? req.body.deviceName : method);
  if (phone) await logSecurityEvent(user.id, "PHONE_VERIFIED", req, maskPhone(phone));
  sendSecurityAlert("2fa-enabled", { user, req, methodName });
  if (vault) {
    await logSecurityEvent(user.id, "VAULT_CODES_GENERATED", req);
    sendSecurityAlert("vault-codes-generated", { user, req });
  }

  res.json({ method, vaultCodes: vault?.codes ?? null, status: await buildStatus(user.id) });
}

/** Turning a method off needs the current password first, then an emailed code. */
export async function disableRequest(req, res) {
  const user = req.user;
  const { method, password } = req.body;
  if (!(await methodRow(user.id, method))?.enabled) throw badRequest(`${METHOD_NAMES[method]} is already off.`, { code: "NOT_ENABLED" });

  if (!(await compareHash(password, user.passwordHash))) {
    await recordFailedAttempt(req, user, "PASSWORD_CHECK_FAILED", `Turning off ${METHOD_NAMES[method]}`);
    throw badRequest("That password isn't right.", { code: "PASSWORD_INVALID" });
  }

  const isLastMethod = (await enabledMethodTypes(user.id)).length === 1;
  const delivery = await issueCode({ userId: user.id, purpose: "DISABLE_2FA", method }, (code) =>
    sendCodeEmail("verify-disable-2fa", { user, req, methodName: METHOD_NAMES[method], isLastMethod, ...code }),
  );
  res.json({ maskedEmail: maskEmail(user.email), isLastMethod, ...delivery });
}

export async function disableConfirm(req, res) {
  const user = req.user;
  const { method, code } = req.body;
  await verifyCode({ userId: user.id, purpose: "DISABLE_2FA", method, code });

  const fullyOff = await prisma.$transaction(async (tx) => {
    await tx.twoFactorMethod.update({
      where: { userId_type: { userId: user.id, type: method } },
      data: { enabled: false, enabledAt: null, lastUsedAt: null, totpSecret: null, totpLastStep: null },
    });
    if (method === "PASSKEY") await tx.passkey.deleteMany({ where: { userId: user.id } });

    const rows = await tx.twoFactorMethod.findMany({ where: { userId: user.id, enabled: true }, select: { type: true } });
    const remaining = METHOD_TYPES.filter((t) => rows.some((r) => r.type === t));
    if (!remaining.length) {
      // With 2FA fully off, Vault Codes and trusted devices no longer mean anything.
      await tx.user.update({ where: { id: user.id }, data: { twoFactorOn: false, defaultMethod: null } });
      await tx.backupCode.deleteMany({ where: { userId: user.id } });
      await tx.device.updateMany({ where: { userId: user.id }, data: { trustedUntil: null } });
      return true;
    }
    if (!remaining.includes(user.defaultMethod)) {
      await tx.user.update({ where: { id: user.id }, data: { defaultMethod: remaining[0] } });
    }
    return false;
  });

  await logSecurityEvent(user.id, "2FA_DISABLED", req, method);
  if (fullyOff) await logSecurityEvent(user.id, "2FA_TURNED_OFF", req);
  sendSecurityAlert("2fa-disabled-alert", { user, req, methodName: METHOD_NAMES[method], fullyOff });

  res.json({ method, fullyOff, status: await buildStatus(user.id) });
}

export async function setDefault(req, res) {
  const { method } = req.body;
  if (!(await methodRow(req.user.id, method))?.enabled) throw badRequest("Turn this method on before making it your default.", { code: "NOT_ENABLED" });
  await prisma.user.update({ where: { id: req.user.id }, data: { defaultMethod: method } });
  await logSecurityEvent(req.user.id, "DEFAULT_METHOD_CHANGED", req, method);
  res.json(await buildStatus(req.user.id));
}

export async function regenerateRequest(req, res) {
  const user = req.user;
  if (!user.twoFactorOn) throw forbidden("Turn on a security method first — Vault Codes are created with it.", { code: "2FA_OFF" });
  const delivery = await issueCode({ userId: user.id, purpose: "REGENERATE_BACKUP" }, (code) =>
    sendCodeEmail("vault-regenerate-code", { user, req, ...code }),
  );
  res.json({ maskedEmail: maskEmail(user.email), ...delivery });
}

export async function regenerate(req, res) {
  const user = req.user;
  if (!user.twoFactorOn) throw forbidden("Turn on a security method first — Vault Codes are created with it.", { code: "2FA_OFF" });
  await verifyCode({ userId: user.id, purpose: "REGENERATE_BACKUP", code: req.body.code });

  const vault = await createVaultCodeSet();
  await prisma.$transaction((tx) => storeVaultCodes(tx, user.id, vault.hashes));
  await logSecurityEvent(user.id, "VAULT_CODES_GENERATED", req, "Regenerated");
  sendSecurityAlert("vault-codes-generated", { user, req });

  res.json({ vaultCodes: vault.codes, status: await buildStatus(user.id) });
}
