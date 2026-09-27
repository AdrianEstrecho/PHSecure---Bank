import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authLimiter } from "./middleware/rateLimit.js";
import { accountRoutes } from "./routes/account.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { devRoutes } from "./routes/dev.routes.js";
import { twofaRoutes } from "./routes/twofa.routes.js";

const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");

export function createApp() {
  const app = express();
  const trustProxy = /^\d+$/.test(config.TRUST_PROXY) ? Number(config.TRUST_PROXY) : config.TRUST_PROXY;
  app.set("trust proxy", trustProxy === "false" ? false : trustProxy);

  if (config.isProd) {
    app.use((req, res, next) => (req.secure ? next() : res.redirect(308, `https://${req.get("host")}${req.originalUrl}`)));
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
          "img-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
          "upgrade-insecure-requests": config.isProd ? [] : null,
        },
      },
      strictTransportSecurity: config.isProd,
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || config.clientOrigins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser(config.COOKIE_SECRET));

  if (!config.isProd) {
    app.use((req, res, next) => {
      const started = performance.now();
      res.on("finish", () => console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Math.round(performance.now() - started)}ms)`));
      next();
    });
  }

  app.get("/api/health", (req, res) => res.json({ ok: true }));
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/2fa", twofaRoutes);
  if (!config.isProd) app.use("/api/dev", devRoutes);
  app.use("/api", accountRoutes);
  app.use("/api", notFoundHandler);

  // In production the server also hosts the built client.
  if (fs.existsSync(CLIENT_DIST)) {
    app.use(express.static(CLIENT_DIST, { index: false }));
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
