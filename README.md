# PHSecure Bank

Online banking web app with four selectable two-factor methods — **PHSecure Mail Key** (email code), **PHSecure Authenticator** (TOTP), **PHSecure Text Key** (SMS) and **PHSecure Touch** (passkey) — plus single-use **Vault Codes**. Every method is switched on or off from **Profile → Security**, and every change is confirmed with a code emailed through Brevo first.

React (Vite) · Tailwind CSS v4 · Express 5 · Prisma 6 · PostgreSQL (Supabase) · Brevo · otplib · SimpleWebAuthn

## Quick start

Requires Node 22+ (developed on Node 24).

```bash
npm install                      # installs client + server (npm workspaces)
```

1. **Database (Supabase).** In the Supabase project click *Connect* and copy two connection strings into `server/.env`:
   - `DATABASE_URL` — the **Transaction pooler** string (port 6543), with `?pgbouncer=true&connection_limit=1` appended
   - `DIRECT_URL` — the **Session pooler** string (port 5432, used by migrations)
2. **Secrets.** `server/.env` already contains freshly generated `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET` and `TOTP_ENC_KEY`. Keep them private; changing `TOTP_ENC_KEY` later makes existing authenticator links unreadable.
3. **Create tables and demo data:**
   ```bash
   npm run db:migrate
   npm run db:seed                # demo@example.com / PHSecure-2026 (2FA off, two accounts, a month of history)
   ```
4. **Run:**
   ```bash
   npm run dev                    # API on :5000, app on http://localhost:5173
   ```

### Email and SMS in development

With `BREVO_API_KEY` empty, nothing is sent: every email and SMS is written to `server/dev-outbox/` and listed at **http://localhost:5173/api/dev/outbox** (the app shows a *Dev outbox* button). The server refuses to start in production without a Brevo key.

To send for real, fill in `BREVO_API_KEY` and a verified `BREVO_SENDER_EMAIL` (Brevo → *Senders & IPs*). SMS also needs SMS credits on the Brevo account. Set `SEED_EMAIL` to your own inbox before seeding if you want the demo customer's codes to reach you.

## What's where

```
server/
  index.js, app.js, config.js      Express app, Helmet/CORS/cookies, env validation (fails fast)
  prisma/                           schema, initial migration, seed
  routes/ controllers/              auth, 2fa, accounts/transfers/security log, dev outbox
  services/
    code.service.js                 6-digit codes: bcrypt-hashed, expiry, 5 attempts, 60 s resend, hourly cap
    totp.service.js                 AES-256-GCM secret at rest, ±1 step, replay blocked
    passkey.service.js              WebAuthn registration/sign-in, single-use challenges
    session.service.js              15-min access JWT + rotating 7-day refresh cookie, reuse detection
    device.service.js               signed device cookie → new-device alerts, "trust for 30 days"
    lockout.service.js              5 failures → 15-min lock + email
    email/sms/notify/outbox         Brevo delivery, dev outbox fallback
  templates/                        branded emails (verify-enable-2fa, login-otp, 2fa-disabled-alert, …)
  scripts/api-smoke-test.mjs        end-to-end API test (npm run test:api -w server)
client/src/
  pages/                            Landing, Register, Login, TwoFactorChallenge, Dashboard, Accounts,
                                    Transfers, Profile, Security, SecurityActivity, LockAccount
  components/                       OtpInput, MethodCard, EnableMethodModal, DisableMethodModal,
                                    TotpSetup, SmsSetup, PasskeySetup, VaultCodesModal, Seal, Passbook, …
  api/ context/ lib/                axios client (auto-refresh, CSRF), AuthContext, formatting, method metadata
```

## Flows

- **Turning a method on:** toggle → emailed code → short-lived setup token → method setup (TOTP QR / phone + SMS code / passkey prompt) → on. The first method also creates 10 Vault Codes, shown once with Download and Copy. The toggle only flips once the server confirms.
- **Turning a method off:** current password (if the account has one) → emailed code → off, plus a `2fa-disabled-alert` email. Turning off the last method turns 2FA off and deletes the Vault Codes.
- **Sign-in:** password → the default method's screen, with *Try another method* (other methods and *Use a Vault Code*) and *Trust this device for 30 days*.
- **Continue with Google:** Google replaces the password step only; 2FA still applies. A new Google email opens an account (no password), an existing one is linked by its verified email. The callback hands the SPA a 2-minute token in the URL fragment, bound to the browser by a cookie nonce and redeemed once at `POST /api/auth/google/finish`. Accounts without a password confirm turning a method off with the emailed code alone.
- **"Lock my account":** every security email links to `/lock`, which signs out every device and blocks sign-in for 24 hours.

## Additions and interpretations

These go beyond or interpret the spec:

- **Extra schema:** `Session` (refresh-token rotation and logout), `Device` (new-device alerts and trusted devices), `WebAuthnChallenge`, `Transaction`, and `TwoFactorMethod.totpLastStep` (TOTP replay protection).
- **Code request cap:** the "5 code requests per hour" limit applies per user **per purpose** (sign-in, enable, disable, …), so setting up all four methods doesn't lock you out of signing in. Adjust it with `CODE_REQUESTS_PER_HOUR`.
- **Login emails:** a sign-in sends an email when it comes from an unrecognised device or uses a Vault Code. Every sign-in is still recorded in the security log.
- **Extra endpoints:**
  - `POST /api/auth/2fa/passkey/options` for passkey sign-in.
  - `POST /api/2fa/backup/regenerate/request` for the emailed code.
  - `POST /api/auth/verify-email/resend`, `POST /api/auth/lock`, `GET /api/auth/me`.
  - `GET /api/accounts/transactions` and `POST /api/transfers` for internal and external transfers. These are real database updates; the counterparty bank is mocked.
- **Masking:** email and phone are masked by the server, so the client never receives them in full.
- **Approximate location in emails:** comes from Cloudflare or Vercel geo headers when `TRUST_GEO_HEADERS=true`. Otherwise it says *Local network* or *Unknown location*.

## Production notes

**Vercel** (`vercel.json`): the built client is served from the CDN and `api/index.mjs` runs the Express app as one function behind `/api/*`. Production builds run `prisma migrate deploy`. Set these on the project: `DATABASE_URL` and `DIRECT_URL` (Supabase), the four secrets, `BREVO_API_KEY`/`BREVO_SENDER_EMAIL`, `CLIENT_URL`/`WEBAUTHN_RP_ID`/`WEBAUTHN_ORIGIN` for the site's domain, `TRUST_PROXY=1`, `TRUST_GEO_HEADERS=true`, and optionally `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (redirect URI `https://<domain>/api/auth/google/callback`).

**Any other host:**

- Build with `npm run build` and start with `NODE_ENV=production npm start`. Express serves `client/dist`, redirects HTTP to HTTPS, and sends HSTS and `Secure` cookies.
- Set `TRUST_PROXY` to match your load balancer (for example `1`).
- Set `CLIENT_URL`, `WEBAUTHN_RP_ID` (your domain, e.g. `phsecurebank.com`) and `WEBAUTHN_ORIGIN` (e.g. `https://phsecurebank.com`).
- Rate limits use in-memory stores. With more than one server instance, move them to a shared store such as Redis.
