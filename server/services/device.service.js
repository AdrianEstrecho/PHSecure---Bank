import { prisma } from "../lib/prisma.js";
import { DEVICE_COOKIE, deviceCookieOptions } from "../utils/cookies.js";
import { randomToken, sha256 } from "../utils/crypto.js";
import { getRequestContext } from "../utils/requestContext.js";

const TRUST_DAYS = 30;

// cookie-parser yields `false` for a signed cookie whose signature doesn't match.
const readDeviceCookie = (req) => req.signedCookies?.[DEVICE_COOKIE] || null;

export async function findDevice(req, userId) {
  const cookie = readDeviceCookie(req);
  if (!cookie) return null;
  return prisma.device.findUnique({ where: { userId_cookieHash: { userId, cookieHash: sha256(cookie) } } });
}

export const isTrusted = (device) => Boolean(device?.trustedUntil && device.trustedUntil > new Date());

/**
 * Records this browser as a known device for the user (setting the device cookie if needed).
 * Returns { device, isNew } — isNew drives the new-device alert.
 */
export async function recognizeDevice(req, res, userId, { trust = false } = {}) {
  let cookie = readDeviceCookie(req);
  if (!cookie) {
    cookie = randomToken(24);
    res.cookie(DEVICE_COOKIE, cookie, deviceCookieOptions);
  }

  const { device: label, userAgent } = getRequestContext(req);
  const cookieHash = sha256(cookie);
  const trustedUntil = trust ? new Date(Date.now() + TRUST_DAYS * 24 * 60 * 60 * 1000) : undefined;

  const existing = await prisma.device.findUnique({ where: { userId_cookieHash: { userId, cookieHash } } });
  if (existing) {
    const device = await prisma.device.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), label, userAgent, ...(trustedUntil && { trustedUntil }) },
    });
    return { device, isNew: false };
  }

  const device = await prisma.device.create({ data: { userId, cookieHash, label, userAgent, trustedUntil } });
  return { device, isNew: true };
}
