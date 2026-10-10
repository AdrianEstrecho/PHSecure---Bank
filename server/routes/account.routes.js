import { Router } from "express";
import * as accounts from "../controllers/account.controller.js";
import * as security from "../controllers/security.controller.js";
import { credentialLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";

// Mounted at /api, so auth is applied per route rather than router-wide.
export const accountRoutes = Router();

accountRoutes.get("/accounts", requireAuth, accounts.listAccounts);
accountRoutes.get("/accounts/transactions", requireAuth, accounts.listTransactions);
accountRoutes.post("/transfers", requireAuth, validate(accounts.schemas.transfer), accounts.transfer);
accountRoutes.get("/security/logs", requireAuth, security.listLogs);
accountRoutes.post("/security/password", credentialLimiter(), requireAuth, validate(security.schemas.changePassword), security.changePassword);
accountRoutes.get("/security/devices", requireAuth, security.listDevices);
accountRoutes.post("/security/devices/sign-out-others", requireAuth, security.signOutOtherDevices);
accountRoutes.post("/security/devices/:id/sign-out", requireAuth, security.signOutDevice);
