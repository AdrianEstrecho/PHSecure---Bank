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

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized(undefined, { code: "AUTH_INVALID" });
  if (user.tokensValidAfter && payload.iat * 1000 < user.tokensValidAfter.getTime()) {
    throw unauthorized("This session was signed out.", { code: "AUTH_REVOKED" });
  }

  req.user = user;
  next();
}
