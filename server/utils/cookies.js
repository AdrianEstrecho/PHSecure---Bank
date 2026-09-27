import { config } from "../config.js";

export const REFRESH_COOKIE = "aur_rt";
export const CSRF_COOKIE = "aur_csrf";
export const DEVICE_COOKIE = "aur_device";

const DAY = 24 * 60 * 60 * 1000;

const base = { sameSite: "strict", secure: config.isProd };

export const refreshCookieOptions = { ...base, httpOnly: true, path: "/api/auth", maxAge: 7 * DAY };
// Readable by the SPA so it can echo the value back in X-CSRF-Token (double-submit).
export const csrfCookieOptions = { ...base, httpOnly: false, path: "/", maxAge: 7 * DAY };
export const deviceCookieOptions = { ...base, httpOnly: true, signed: true, path: "/api/auth", maxAge: 365 * DAY };

// Google sign-in: state + PKCE verifier on the way out, then a nonce binding the handoff token to this browser.
export const GOOGLE_STATE_COOKIE = "aur_g_state";
export const GOOGLE_HANDOFF_COOKIE = "aur_g_handoff";
// Lax, not Strict: the state cookie has to ride along on Google's cross-site redirect back to the callback.
export const googleCookieOptions = { sameSite: "lax", secure: config.isProd, httpOnly: true, signed: true, path: "/api/auth/google", maxAge: 10 * 60 * 1000 };
