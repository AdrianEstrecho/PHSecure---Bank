import { prisma } from "../lib/prisma.js";
import { CSRF_COOKIE, REFRESH_COOKIE, csrfCookieOptions, refreshCookieOptions } from "../utils/cookies.js";
import { randomToken, safeEqual, sha256 } from "../utils/crypto.js";
import { unauthorized } from "../utils/errors.js";
import { maskEmail, maskPhone } from "../utils/mask.js";
import { describeDevice, getRequestContext } from "../utils/requestContext.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import { isTrusted } from "./device.service.js";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// A refresh token that was just rotated stays acceptable briefly, so two tabs refreshing at once don't sign the user out.
const ROTATION_GRACE_MS = 30 * 1000;

/** The shape of the signed-in user sent to the client. Email and phone only ever leave the server masked. */
export function publicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    maskedEmail: maskEmail(user.email),
    emailVerified: user.emailVerified,
    maskedPhone: maskPhone(user.phone),
    phoneVerified: user.phoneVerified,
    twoFactorOn: user.twoFactorOn,
    defaultMethod: user.defaultMethod,
    hasPassword: Boolean(user.passwordHash),
    googleLinked: Boolean(user.googleSub),
    createdAt: user.createdAt,
  };
}

function setSessionCookies(res, refreshToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.cookie(CSRF_COOKIE, randomToken(24), csrfCookieOptions);
}

export function clearSessionCookies(res) {
  const { maxAge: _r, ...refreshOpts } = refreshCookieOptions;
  const { maxAge: _c, ...csrfOpts } = csrfCookieOptions;
  res.clearCookie(REFRESH_COOKIE, refreshOpts);
  res.clearCookie(CSRF_COOKIE, csrfOpts);
}

export async function createSession(req, res, user, deviceId = null) {
  const { ip, userAgent } = getRequestContext(req);
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken({ userId: user.id, sessionId });
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      deviceId,
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  setSessionCookies(res, refreshToken);
  return { accessToken: signAccessToken(user.id, sessionId), user: publicUser(user) };
}

export async function rotateSession(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  const fail = () => {
    clearSessionCookies(res);
    return unauthorized("Your session has ended. Please sign in again.", { code: "SESSION_ENDED" });
  };

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw fail();
  }

  const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) throw fail();

  const hash = sha256(token);
  if (!safeEqual(session.tokenHash, hash)) {
    const inGrace = session.prevTokenHash && safeEqual(session.prevTokenHash, hash) && Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;
    if (inGrace) {
      // A parallel refresh already rotated the cookie; just mint an access token.
      return { accessToken: signAccessToken(session.userId, session.id), user: publicUser(session.user) };
    }
    // An old refresh token was replayed: treat the session as stolen.
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    throw fail();
  }

  const refreshToken = signRefreshToken({ userId: session.userId, sessionId: session.id });
  await prisma.session.update({
    where: { id: session.id },
    // The IP is refreshed too, so the device list shows where each device was last seen rather than where it signed in.
    data: { tokenHash: sha256(refreshToken), prevTokenHash: hash, rotatedAt: new Date(), lastUsedAt: new Date(), ip: getRequestContext(req).ip },
  });
  setSessionCookies(res, refreshToken);
  return { accessToken: signAccessToken(session.userId, session.id), user: publicUser(session.user) };
}

/** Revokes the session behind the refresh cookie, if any. Returns its userId. */
export async function revokeCurrentSession(req) {
  try {
    const payload = verifyRefreshToken(req.cookies?.[REFRESH_COOKIE]);
    await prisma.session.updateMany({ where: { id: payload.sid, revokedAt: null }, data: { revokedAt: new Date() } });
    return payload.sub;
  } catch {
    return null;
  }
}

export function revokeAllSessions(userId) {
  return prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

const activeSessions = (userId) => ({ userId, revokedAt: null, expiresAt: { gt: new Date() } });

// A browser normally holds one session, but any it left behind (say, after its cookies were cleared) are grouped with it.
const deviceKey = (session) => session.deviceId ?? session.id;

/** The user's signed-in devices for Profile → Security: this one first, then the most recently active. */
export async function listSignedInDevices(userId, currentSession) {
  const sessions = await prisma.session.findMany({ where: activeSessions(userId), orderBy: { lastUsedAt: "desc" } });
  const deviceIds = [...new Set(sessions.map((s) => s.deviceId).filter(Boolean))];
  const devices = new Map((await prisma.device.findMany({ where: { userId, id: { in: deviceIds } } })).map((d) => [d.id, d]));

  const groups = new Map();
  for (const session of sessions) {
    const key = deviceKey(session);
    // Sessions arrive newest first, so the first one seen describes the device.
    if (!groups.has(key)) {
      const device = devices.get(session.deviceId);
      groups.set(key, {
        id: key,
        label: describeDevice(session.userAgent),
        ip: session.ip,
        lastActiveAt: session.lastUsedAt,
        signedInAt: session.createdAt,
        trustedUntil: isTrusted(device) ? device.trustedUntil : null,
        current: false,
      });
    }
    if (session.id === currentSession.id) groups.get(key).current = true;
  }
  return [...groups.values()].sort((a, b) => b.current - a.current);
}

/**
 * Signs one device out and stops trusting it, so signing back in there needs 2FA again.
 * Returns the device's label, or null if it had no active session.
 */
export async function signOutDevice(userId, id) {
  const sessions = await prisma.session.findMany({
    where: { ...activeSessions(userId), OR: [{ deviceId: id }, { id }] },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, userAgent: true },
  });
  if (!sessions.length) return null;

  await prisma.$transaction([
    prisma.session.updateMany({ where: { id: { in: sessions.map((s) => s.id) } }, data: { revokedAt: new Date() } }),
    prisma.device.updateMany({ where: { userId, id }, data: { trustedUntil: null } }),
  ]);
  return describeDevice(sessions[0].userAgent);
}

/** Signs out every session but this one and stops trusting every other device. Returns how many devices were signed out. */
export async function signOutOtherDevices(userId, currentSession) {
  const others = await prisma.session.findMany({ where: { ...activeSessions(userId), id: { not: currentSession.id } }, select: { id: true, deviceId: true } });

  await prisma.$transaction([
    prisma.session.updateMany({ where: { id: { in: others.map((s) => s.id) } }, data: { revokedAt: new Date() } }),
    prisma.device.updateMany({
      where: { userId, trustedUntil: { not: null }, ...(currentSession.deviceId && { id: { not: currentSession.deviceId } }) },
      data: { trustedUntil: null },
    }),
  ]);
  return new Set(others.map(deviceKey).filter((key) => key !== deviceKey(currentSession))).size;
}
