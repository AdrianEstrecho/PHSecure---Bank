import { forbidden } from "../utils/errors.js";
import { CSRF_COOKIE } from "../utils/cookies.js";
import { safeEqual } from "../utils/crypto.js";

/** Double-submit check for routes authenticated by cookie (refresh, logout). */
export function assertCsrf(req) {
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get("x-csrf-token");
  if (!cookie || !header || !safeEqual(cookie, header)) {
    throw forbidden("Security check failed. Please refresh the page.", { code: "CSRF_FAILED" });
  }
}

export function requireCsrf(req, res, next) {
  assertCsrf(req);
  next();
}
