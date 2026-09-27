import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { unauthorized } from "./errors.js";

const ISSUER = "phsecure";

export function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET, { expiresIn: "15m", audience: "access", issuer: ISSUER });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET, { audience: "access", issuer: ISSUER });
}

export function signRefreshToken({ userId, sessionId }) {
  return jwt.sign({ sub: userId, sid: sessionId }, config.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
    audience: "refresh",
    issuer: ISSUER,
    jwtid: crypto.randomUUID(),
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET, { audience: "refresh", issuer: ISSUER });
}

// Short-lived, single-purpose tokens. The audience keeps one kind from being replayed as another.
const PURPOSES = {
  setup: { expiresIn: "5m", expired: "Your setup session expired. Please start again." },
  "login-challenge": { expiresIn: "10m", expired: "Your sign-in session expired. Please sign in again." },
  "verify-email": { expiresIn: "30m", expired: "This verification session expired. Please sign in again." },
  lock: { expiresIn: "7d", expired: "This lock link has expired. Sign in to secure your account." },
};

export function signPurposeToken(purpose, payload) {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, { expiresIn: PURPOSES[purpose].expiresIn, audience: purpose, issuer: ISSUER });
}

export function verifyPurposeToken(purpose, token) {
  try {
    return jwt.verify(String(token ?? ""), config.JWT_ACCESS_SECRET, { audience: purpose, issuer: ISSUER });
  } catch {
    throw unauthorized(PURPOSES[purpose].expired, { code: `${purpose.toUpperCase().replace("-", "_")}_EXPIRED` });
  }
}
