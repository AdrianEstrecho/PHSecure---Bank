import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { logSecurityEvent } from "../services/audit.service.js";
import { assertNotLocked, recordFailedAttempt } from "../services/lockout.service.js";
import { sendSecurityAlert } from "../services/notify.service.js";
import { listSignedInDevices, signOutDevice as revokeDevice, signOutOtherDevices as revokeOtherDevices } from "../services/session.service.js";
import { compareHash, hashPassword } from "../utils/crypto.js";
import { badRequest, notFound } from "../utils/errors.js";
import { describeDevice } from "../utils/requestContext.js";
import { passwordField } from "../utils/schemas.js";

export const schemas = {
  changePassword: z.object({
    currentPassword: z.string().min(1, "Enter your current password.").max(128),
    newPassword: passwordField,
  }),
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Shaped like a validation error, so the form can show the message under the field it's about.
const fieldError = (path, message, code) => badRequest(message, { code, details: [{ path, message }] });

export async function listLogs(req, res) {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 100);
  const logs = await prisma.securityLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({
    logs: logs.map((l) => ({ id: l.id, event: l.event, details: l.details, ip: l.ip, device: describeDevice(l.userAgent), createdAt: l.createdAt })),
  });
}

/** Needs the current password; every other device is signed out, since whoever knew the old one may be using them. */
export async function changePassword(req, res) {
  const user = req.user;
  const { currentPassword, newPassword } = req.body;
  if (!user.passwordHash) throw badRequest("You sign in with Google, so this account has no password to change.", { code: "NO_PASSWORD" });
  assertNotLocked(user);

  if (!(await compareHash(currentPassword, user.passwordHash))) {
    await recordFailedAttempt(req, user, "PASSWORD_CHECK_FAILED", "Changing your password");
    throw fieldError("currentPassword", "That password isn't right.", "PASSWORD_INVALID");
  }
  if (newPassword === currentPassword) {
    throw fieldError("newPassword", "Choose a password that's different from your current one.", "PASSWORD_UNCHANGED");
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  const signedOut = await revokeOtherDevices(user.id, req.currentSession);
  await logSecurityEvent(user.id, "PASSWORD_CHANGED", req, signedOut ? `${plural(signedOut, "other device")} signed out` : null);
  sendSecurityAlert("password-changed", { user, req, signedOut });
  res.json({ signedOut });
}

export async function listDevices(req, res) {
  res.json({ devices: await listSignedInDevices(req.user.id, req.currentSession) });
}

export async function signOutDevice(req, res) {
  const { id } = req.params;
  if ([req.currentSession.id, req.currentSession.deviceId].includes(id)) {
    throw badRequest("This is the device you're using. Use Sign out at the top of the page instead.", { code: "CURRENT_DEVICE" });
  }

  const label = await revokeDevice(req.user.id, id);
  if (!label) throw notFound("That device is already signed out.", { code: "DEVICE_NOT_FOUND" });
  await logSecurityEvent(req.user.id, "DEVICE_SIGNED_OUT", req, label);
  res.json({ devices: await listSignedInDevices(req.user.id, req.currentSession) });
}

export async function signOutOtherDevices(req, res) {
  const signedOut = await revokeOtherDevices(req.user.id, req.currentSession);
  if (signedOut) await logSecurityEvent(req.user.id, "OTHER_DEVICES_SIGNED_OUT", req, plural(signedOut, "device"));
  res.json({ signedOut, devices: await listSignedInDevices(req.user.id, req.currentSession) });
}
