import { Router } from "express";
import * as twofa from "../controllers/twofa.controller.js";
import { twoFactorLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";

const { schemas } = twofa;
export const twofaRoutes = Router();

twofaRoutes.use(requireAuth, twoFactorLimiter);

twofaRoutes.get("/status", twofa.status);
twofaRoutes.post("/enable/request", validate(schemas.method), twofa.enableRequest);
twofaRoutes.post("/enable/verify-email", validate(schemas.methodCode), twofa.enableVerifyEmail);
twofaRoutes.post("/totp/setup", validate(schemas.setupToken), twofa.totpSetup);
twofaRoutes.post("/sms/setup", validate(schemas.smsSetup), twofa.smsSetup);
twofaRoutes.get("/passkey/options", twofa.passkeyOptions);
twofaRoutes.post("/enable/confirm", validate(schemas.confirm), twofa.enableConfirm);
twofaRoutes.post("/disable/request", validate(schemas.disableRequest), twofa.disableRequest);
twofaRoutes.post("/disable/confirm", validate(schemas.methodCode), twofa.disableConfirm);
twofaRoutes.patch("/default", validate(schemas.method), twofa.setDefault);
twofaRoutes.post("/backup/regenerate/request", twofa.regenerateRequest);
twofaRoutes.post("/backup/regenerate", validate(schemas.code), twofa.regenerate);
