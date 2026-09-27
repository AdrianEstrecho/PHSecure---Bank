import { z } from "zod";

const optional = z.string().trim().optional().default("");

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().trim().default("http://localhost:5173"),
  DATABASE_URL: z.string().trim().min(1, "is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "must be at least 32 characters"),
  COOKIE_SECRET: z.string().min(32, "must be at least 32 characters"),
  TOTP_ENC_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "must be 32 bytes of hex (64 characters)"),
  BREVO_API_KEY: optional,
  BREVO_SENDER_EMAIL: optional,
  BREVO_SENDER_NAME: z.string().trim().default("PHSecure Security"),
  BREVO_SMS_SENDER: z.string().trim().max(11).default("PHSecure"),
  WEBAUTHN_RP_ID: z.string().trim().default("localhost"),
  WEBAUTHN_RP_NAME: z.string().trim().default("PHSecure Bank"),
  WEBAUTHN_ORIGIN: z.string().trim().default("http://localhost:5173"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  TRUST_PROXY: z.string().trim().default("loopback"),
  TRUST_GEO_HEADERS: z.stringbool().default(false),
  APP_TIMEZONE: z.string().trim().default("Asia/Manila"),
  CODE_REQUESTS_PER_HOUR: z.coerce.number().int().positive().default(5),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n✖ Invalid server environment (see server/.env.example):");
  for (const issue of parsed.error.issues) {
    console.error(`  • ${issue.path.join(".")} ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;
const isProd = env.NODE_ENV === "production";
const devOutbox = !env.BREVO_API_KEY;

if (isProd && devOutbox) {
  console.error("\n✖ BREVO_API_KEY is required in production — the dev outbox must never serve real codes.");
  process.exit(1);
}
if (!devOutbox && !env.BREVO_SENDER_EMAIL) {
  console.error("\n✖ BREVO_SENDER_EMAIL is required when BREVO_API_KEY is set.");
  process.exit(1);
}

const splitList = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);

export const config = {
  ...env,
  isProd,
  devOutbox,
  googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  clientOrigins: splitList(env.CLIENT_URL),
  clientUrl: splitList(env.CLIENT_URL)[0],
  webauthnOrigins: splitList(env.WEBAUTHN_ORIGIN),
};
