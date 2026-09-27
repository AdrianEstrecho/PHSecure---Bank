import otplib from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma.js";
import { decrypt, encrypt } from "../utils/crypto.js";

const { authenticator } = otplib;
const STEP_SECONDS = 30;
// ±1 time-step of clock drift.
authenticator.options = { step: STEP_SECONDS, window: 1, digits: 6 };

const ISSUER = "PHSecure Bank";

/** Creates a fresh secret and stores it (encrypted) on a not-yet-enabled TOTP method row. */
export async function startTotpSetup(user) {
  const secret = authenticator.generateSecret(20);
  await prisma.twoFactorMethod.upsert({
    where: { userId_type: { userId: user.id, type: "TOTP" } },
    create: { userId: user.id, type: "TOTP", enabled: false, totpSecret: encrypt(secret) },
    update: { totpSecret: encrypt(secret), totpLastStep: null },
  });

  const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret);
  const qrCode = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 240, color: { dark: "#0B1426", light: "#FFFFFF" } });
  return { qrCode, otpauthUrl, secret: secret.match(/.{1,4}/g).join(" ") };
}

/**
 * Verifies a TOTP code for a method row and records its time-step, so the same code
 * can't be used twice. Returns false for a wrong or replayed code.
 */
export async function verifyTotp(method, token) {
  if (!method?.totpSecret || !/^\d{6}$/.test(token)) return false;
  const delta = authenticator.checkDelta(token, decrypt(method.totpSecret));
  if (delta === null) return false;

  const step = Math.floor(Date.now() / 1000 / STEP_SECONDS) + delta;
  const { count } = await prisma.twoFactorMethod.updateMany({
    where: { id: method.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step },
  });
  return count === 1;
}
