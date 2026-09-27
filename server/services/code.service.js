import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { compareHash, generateNumericCode, hashCode } from "../utils/crypto.js";
import { HttpError, badRequest, tooMany } from "../utils/errors.js";

// Login codes are short-lived; codes that gate a settings change allow a little longer.
const EXPIRY_MINUTES = {
  LOGIN: 5,
  ENABLE_2FA: 10,
  DISABLE_2FA: 10,
  VERIFY_EMAIL: 10,
  VERIFY_PHONE: 10,
  REGENERATE_BACKUP: 10,
};

export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;
const HOUR = 60 * 60 * 1000;

/**
 * Generates a code, stores only its hash, and hands the plaintext to `deliver` (email or SMS).
 * Cooldown and older-code invalidation are scoped to (user, purpose, method); the hourly cap to (user, purpose).
 */
export async function issueCode({ userId, purpose, method = null, target = null }, deliver) {
  const now = Date.now();

  const latest = await prisma.verificationCode.findFirst({
    where: { userId, purpose, method },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const sinceLast = latest ? now - latest.createdAt.getTime() : Infinity;
  if (sinceLast < RESEND_COOLDOWN_SECONDS * 1000) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - sinceLast) / 1000);
    throw tooMany(`Please wait ${retryAfter}s before requesting another code.`, { code: "RESEND_COOLDOWN", details: { retryAfter } });
  }

  const recent = await prisma.verificationCode.findMany({
    where: { userId, purpose, createdAt: { gte: new Date(now - HOUR) } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (recent.length >= config.CODE_REQUESTS_PER_HOUR) {
    const retryAfter = Math.ceil((recent[0].createdAt.getTime() + HOUR - now) / 1000);
    throw tooMany(`You've requested too many codes. Try again in ${Math.ceil(retryAfter / 60)} minutes.`, {
      code: "CODE_LIMIT",
      details: { retryAfter },
    });
  }

  const code = generateNumericCode();
  const expiresInMinutes = EXPIRY_MINUTES[purpose];
  const expiresAt = new Date(now + expiresInMinutes * 60 * 1000);
  const record = await prisma.verificationCode.create({
    data: { userId, purpose, method, target, codeHash: await hashCode(code), expiresAt },
  });

  try {
    await deliver({ code, expiresAt, expiresInMinutes });
  } catch (err) {
    await prisma.verificationCode.delete({ where: { id: record.id } });
    console.error(`[code] Delivery failed for ${purpose}:`, err.message);
    throw new HttpError(502, "We couldn't send your code. Please try again in a moment.", { code: "DELIVERY_FAILED" });
  }

  // Only one live code per flow: a resend retires the previous one.
  await prisma.verificationCode.updateMany({
    where: { userId, purpose, method, usedAt: null, id: { not: record.id } },
    data: { usedAt: new Date() },
  });

  return { expiresInMinutes, resendIn: RESEND_COOLDOWN_SECONDS };
}

/** Error codes that represent a wrong guess (and so count toward the account lockout at sign-in). */
export const WRONG_CODE_ERRORS = new Set(["CODE_INVALID", "CODE_LOCKED"]);

/** Checks a submitted code; consumes it on success. Returns the stored record (e.g. for its `target`). */
export async function verifyCode({ userId, purpose, method = null, code }) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, purpose, method, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw badRequest("There's no active code. Please request a new one.", { code: "CODE_MISSING" });
  if (record.expiresAt < new Date()) throw badRequest("This code has expired. Please request a new one.", { code: "CODE_EXPIRED" });

  // Claim an attempt atomically so parallel guesses can't exceed the limit.
  const claimed = await prisma.verificationCode.updateMany({
    where: { id: record.id, usedAt: null, attempts: { lt: MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (!claimed.count) throw badRequest("Too many incorrect attempts. Please request a new code.", { code: "CODE_LOCKED" });

  const matches = /^\d{6}$/.test(code) && (await compareHash(code, record.codeHash));
  if (!matches) {
    const attemptsLeft = MAX_ATTEMPTS - (record.attempts + 1);
    if (attemptsLeft <= 0) {
      await prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      throw badRequest("Too many incorrect attempts. This code no longer works — please request a new one.", { code: "CODE_LOCKED" });
    }
    throw badRequest(`That code isn't right. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`, {
      code: "CODE_INVALID",
      details: { attemptsLeft },
    });
  }

  const consumed = await prisma.verificationCode.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!consumed.count) throw badRequest("This code was already used. Please request a new one.", { code: "CODE_MISSING" });
  return record;
}
