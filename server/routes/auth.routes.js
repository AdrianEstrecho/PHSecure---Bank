import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import { credentialLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";

const { schemas } = auth;
export const authRoutes = Router();

authRoutes.post("/register", credentialLimiter(), validate(schemas.register), auth.register);
authRoutes.post("/verify-email", credentialLimiter(), validate(schemas.verifyEmail), auth.verifyEmail);
authRoutes.post("/verify-email/resend", validate(schemas.resendVerification), auth.resendVerification);
authRoutes.post("/login", credentialLimiter(), validate(schemas.login), auth.login);
authRoutes.post("/2fa/send", validate(schemas.send2fa), auth.send2fa);
authRoutes.post("/2fa/passkey/options", validate(schemas.passkeyOptions), auth.passkeyLoginOptions);
authRoutes.post("/2fa/verify", credentialLimiter(), validate(schemas.verify2fa), auth.verify2fa);
authRoutes.post("/refresh", auth.refresh);
authRoutes.post("/logout", auth.logout);
authRoutes.post("/lock", validate(schemas.lock), auth.lockAccount);
authRoutes.get("/me", requireAuth, auth.me);
