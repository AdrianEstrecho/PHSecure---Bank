import { prisma } from "../lib/prisma.js";
import { generateUnlockCode, hashCode } from "../utils/crypto.js";
import { HttpError } from "../utils/errors.js";
import { logSecurityEvent } from "./audit.service.js";
import { formatTime, sendSecurityAlert } from "./notify.service.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function describeWait(until) {
  const minutes = Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));
  if (minutes < 90) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return `${Math.ceil(minutes / 60)} hours`;
}

const lockedError = (lockedUntil, message) =>
  new HttpError(423, message ?? `Your account is locked for your security. Try again in ${describeWait(lockedUntil)}.`, {
    code: "ACCOUNT_LOCKED",
    details: { lockedUntil },
  });

export function assertNotLocked(user) {
  if (user.lockedUntil && user.lockedUntil > new Date()) throw lockedError(user.lockedUntil);
}

/** A one-time code that lifts a lock early. Only the hash is stored. */
export async function newUnlockCode() {
  const code = generateUnlockCode();
  return { code, hash: await hashCode(code) };
}

/** Matches users who aren't under a lock they set themselves. Spelled out, since lockedUntil can be null. */
export const notLockedByUser = (now) => ({ OR: [{ lockedByUser: false }, { lockedUntil: null }, { lockedUntil: { lte: now } }] });

/**
 * Counts a failed password or 2FA attempt. The fifth consecutive failure locks the account for 15 minutes,
 * emails the owner an unlock code, and throws a 423 in place of the caller's own error.
 */
export async function recordFailedAttempt(req, user, event, details = null) {
  const { failedAttempts } = await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: { increment: 1 } },
    select: { failedAttempts: true },
  });
  await logSecurityEvent(user.id, event, req, details);
  if (failedAttempts < MAX_FAILED_ATTEMPTS) return;

  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
  const unlock = await newUnlockCode();
  // Never replaces a lock the owner set: its unlock code was only shown on their screen, and this one is emailed.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, ...notLockedByUser(now) },
    data: { lockedUntil, lockedByUser: false, unlockCodeHash: unlock.hash, failedAttempts: 0 },
  });
  if (!count) {
    const current = await prisma.user.findUnique({ where: { id: user.id }, select: { lockedUntil: true } });
    throw lockedError(current.lockedUntil);
  }

  await logSecurityEvent(user.id, "ACCOUNT_LOCKED", req, `${MAX_FAILED_ATTEMPTS} failed attempts`);
  sendSecurityAlert("account-locked", { user, req, until: formatTime(lockedUntil), byUser: false, unlockCode: unlock.code });
  throw lockedError(lockedUntil, `Too many failed attempts. For your security your account is locked for ${LOCK_MINUTES} minutes — we've emailed you a code to unlock it sooner.`);
}

// Filters on the stored values rather than `user`, which may predate failures recorded during this request.
export function clearFailedAttempts(user) {
  return prisma.user.updateMany({
    where: { id: user.id, OR: [{ failedAttempts: { gt: 0 } }, { lockedUntil: { not: null } }] },
    data: { failedAttempts: 0, lockedUntil: null, lockedByUser: false, unlockCodeHash: null },
  });
}
