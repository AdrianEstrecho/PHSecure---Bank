import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../utils/errors.js";
import { verifyAccessToken } from "../utils/tokens.js";

export async function requireAuth(req, res, next) {
  const header = req.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw unauthorized(undefined, { code: "AUTH_REQUIRED" });

  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    throw unauthorized(expired ? "Your session expired." : undefined, { code: expired ? "TOKEN_EXPIRED" : "AUTH_INVALID" });
  }

  // Tokens issued before access tokens named their session: the client refreshes for one that does.
  if (!payload.sid) throw unauthorized("Your session expired.", { code: "TOKEN_EXPIRED" });

  // Checking the session, not just the token, makes signing a device out take effect on its next request.
  const session = await prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
  if (!session || session.userId !== payload.sub) throw unauthorized(undefined, { code: "AUTH_INVALID" });
  const { user, ...currentSession } = session;
  const tokenRevoked = user.tokensValidAfter && payload.iat * 1000 < user.tokensValidAfter.getTime();
  if (currentSession.revokedAt || currentSession.expiresAt < new Date() || tokenRevoked) {
    throw unauthorized("This session was signed out.", { code: "AUTH_REVOKED" });
  }

  req.user = user;
  req.currentSession = currentSession;
  next();
}
