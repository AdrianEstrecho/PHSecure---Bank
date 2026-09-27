import rateLimit from "express-rate-limit";

const limiter = (windowMs, limit, message, keyGenerator) =>
  rateLimit({
    windowMs,
    limit,
    keyGenerator,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json({
        error: { message, code: "RATE_LIMITED", details: { retryAfter: Math.ceil(options.windowMs / 1000) } },
      });
    },
  });

// Every /api/auth/* route.
export const authLimiter = limiter(15 * 60 * 1000, 150, "Too many requests. Please wait a few minutes and try again.");

// Password and code submission endpoints — call once per route so each keeps its own counter.
export const credentialLimiter = () => limiter(60 * 1000, 10, "Too many attempts. Please wait a minute and try again.");

// Authenticated 2FA management endpoints — keyed per user (runs after requireAuth), so people sharing an office IP don't throttle each other.
export const twoFactorLimiter = limiter(15 * 60 * 1000, 100, "Too many requests. Please wait a few minutes and try again.", (req) => `user:${req.user.id}`);
