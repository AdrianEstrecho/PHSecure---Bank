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
