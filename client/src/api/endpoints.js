import { api } from "./client.js";

const data = (promise) => promise.then((r) => r.data);

export const auth = {
  register: (body) => data(api.post("/auth/register", body)),
  verifyEmail: (verificationToken, code) => data(api.post("/auth/verify-email", { verificationToken, code })),
  resendVerification: (verificationToken) => data(api.post("/auth/verify-email/resend", { verificationToken })),
  login: (email, password) => data(api.post("/auth/login", { email, password })),
  send2fa: (challengeToken, method) => data(api.post("/auth/2fa/send", { challengeToken, method })),
  passkeyOptions: (challengeToken) => data(api.post("/auth/2fa/passkey/options", { challengeToken })),
  verify2fa: (body) => data(api.post("/auth/2fa/verify", body)),
  logout: () => api.post("/auth/logout"),
  lock: (token) => data(api.post("/auth/lock", { token })),
};

export const twofa = {
  status: () => data(api.get("/2fa/status")),
  enableRequest: (method) => data(api.post("/2fa/enable/request", { method })),
  enableVerifyEmail: (method, code) => data(api.post("/2fa/enable/verify-email", { method, code })),
  totpSetup: (setupToken) => data(api.post("/2fa/totp/setup", { setupToken })),
  smsSetup: (setupToken, phone) => data(api.post("/2fa/sms/setup", { setupToken, phone })),
  passkeyOptions: (setupToken) => data(api.get("/2fa/passkey/options", { headers: { "X-Setup-Token": setupToken } })),
  enableConfirm: (body) => data(api.post("/2fa/enable/confirm", body)),
  disableRequest: (method, password) => data(api.post("/2fa/disable/request", { method, password })),
  disableConfirm: (method, code) => data(api.post("/2fa/disable/confirm", { method, code })),
  setDefault: (method) => data(api.patch("/2fa/default", { method })),
  regenerateRequest: () => data(api.post("/2fa/backup/regenerate/request")),
  regenerate: (code) => data(api.post("/2fa/backup/regenerate", { code })),
};

export const banking = {
  accounts: () => data(api.get("/accounts")),
  transactions: (params) => data(api.get("/accounts/transactions", { params })),
  transfer: (body) => data(api.post("/transfers", body)),
  securityLogs: () => data(api.get("/security/logs")),
};

export const dev = {
  status: () => data(api.get("/dev/status")),
};
