import { config } from "../config.js";
import { getRequestContext } from "../utils/requestContext.js";
import { signPurposeToken } from "../utils/tokens.js";
import { sendTemplate } from "./email.service.js";
import { sendSms } from "./sms.service.js";

// dateStyle/timeStyle can't be combined with timeZoneName, so the parts are spelled out.
const CLOCK = { hour: "numeric", minute: "2-digit", timeZone: config.APP_TIMEZONE, timeZoneName: "short" };

export const formatTime = (date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", ...CLOCK }).format(date);

const formatClock = (date) => new Intl.DateTimeFormat("en-US", CLOCK).format(date);

export const lockUrlFor = (user) => `${config.clientUrl}/lock?token=${signPurposeToken("lock", { sub: user.id })}`;

function emailContext(req) {
  const { device, location, ip } = getRequestContext(req);
  return { device, location, ip, time: formatTime(new Date()) };
}

/** Sends a code email; throws if delivery fails so the caller can roll the code back. */
export function sendCodeEmail(templateName, { user, req, code, expiresAt, expiresInMinutes, ...data }) {
  return sendTemplate(templateName, {
    to: user.email,
    name: user.fullName,
    firstName: user.fullName.split(" ")[0],
    context: emailContext(req),
    lockUrl: lockUrlFor(user),
    code,
    expiresInMinutes,
    expiresAtLabel: formatClock(expiresAt),
    ...data,
  });
}

/** Security alerts must never break the action that triggered them, so failures are only logged. */
export function sendSecurityAlert(templateName, { user, req, withLockLink = true, ...data }) {
  return sendTemplate(templateName, {
    to: user.email,
    name: user.fullName,
    firstName: user.fullName.split(" ")[0],
    context: emailContext(req),
    lockUrl: withLockLink ? lockUrlFor(user) : null,
    ...data,
  }).catch((err) => console.error(`[email] Failed to send "${templateName}" alert:`, err.message));
}

const SMS_TEXT = {
  LOGIN: (code, minutes) => `PHSecure: ${code} is your sign-in code. It expires in ${minutes} min. Never share it — we will never call to ask for it.`,
  VERIFY_PHONE: (code, minutes) => `PHSecure: ${code} is your code to add this phone to your account. It expires in ${minutes} min. Never share it.`,
};

export function sendCodeSms(purpose, { to, code, expiresInMinutes }) {
  return sendSms({ to, content: SMS_TEXT[purpose](code, expiresInMinutes) });
}
