import { prisma } from "../lib/prisma.js";
import { getRequestContext } from "../utils/requestContext.js";

/**
 * Events: ACCOUNT_CREATED, EMAIL_VERIFIED, LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_2FA_FAILED, NEW_DEVICE,
 * LOGOUT, ACCOUNT_LOCKED, ACCOUNT_LOCKED_BY_USER, 2FA_ENABLED, 2FA_DISABLED, 2FA_TURNED_OFF,
 * PASSKEY_ADDED, PHONE_VERIFIED, DEFAULT_METHOD_CHANGED, VAULT_CODES_GENERATED, VAULT_CODE_USED
 */
export async function logSecurityEvent(userId, event, req, details = null) {
  const { ip, userAgent } = getRequestContext(req);
  try {
    await prisma.securityLog.create({ data: { userId, event, details, ip, userAgent } });
  } catch (err) {
    console.error(`[audit] Failed to record ${event}:`, err.message);
  }
}
