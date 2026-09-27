import { prisma } from "../lib/prisma.js";
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

/**
 * Counts a failed password or 2FA attempt. The fifth consecutive failure locks the account
 * for 15 minutes, emails the owner, and throws a 423 in place of the caller's own error.
 */
export async function recordFailedAttempt(req, user, event, details = null) {
  const { failedAttempts } = await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: { increment: 1 } },
    select: { failedAttempts: true },
  });
  await logSecurityEvent(user.id, event, req, details);
  if (failedAttempts < MAX_FAILED_ATTEMPTS) return;

  const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  await prisma.user.update({ where: { id: user.id }, data: { lockedUntil, failedAttempts: 0 } });
  await logSecurityEvent(user.id, "ACCOUNT_LOCKED", req, `${MAX_FAILED_ATTEMPTS} failed attempts`);
  sendSecurityAlert("account-locked", { user, req, until: formatTime(lockedUntil), byUser: false });
  throw lockedError(lockedUntil, `Too many failed attempts. For your security your account is locked for ${LOCK_MINUTES} minutes — we've emailed you.`);
}

// Filters on the stored values rather than `user`, which may predate failures recorded during this request.
export function clearFailedAttempts(user) {
  return prisma.user.updateMany({
    where: { id: user.id, OR: [{ failedAttempts: { gt: 0 } }, { lockedUntil: { not: null } }] },
    data: { failedAttempts: 0, lockedUntil: null },
  });
}
