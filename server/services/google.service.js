// "Continue with Google": OpenID Connect authorization-code flow with PKCE, talking to Google directly (no SDK).
import crypto from "node:crypto";
import { config } from "../config.js";
import { badRequest } from "../utils/errors.js";
import { randomToken } from "../utils/crypto.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

// Must match an "Authorized redirect URI" on the Google OAuth client exactly.
const redirectUri = () => `${config.clientUrl}/api/auth/google/callback`;

const failed = () => badRequest("Google couldn't confirm your sign-in. Please try again.", { code: "GOOGLE_FAILED" });

/** Where to send the browser, plus the state and PKCE verifier to keep until Google sends it back. */
export function googleAuthRequest() {
  const state = randomToken(24);
  const verifier = randomToken(48);
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: url.toString(), state, verifier };
}

/** Swaps the authorization code for the user's verified Google identity. */
export async function googleIdentity(code, verifier) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  }).catch(() => null);
  const body = await response?.json().catch(() => null);
  if (!response?.ok || !body?.id_token) throw failed();

  // The ID token came straight from Google's token endpoint over TLS, so its claims are checked
  // but its signature needn't be (OpenID Connect Core §3.1.3.7).
  let claims;
  try {
    claims = JSON.parse(Buffer.from(body.id_token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    throw failed();
  }
  if (!ISSUERS.has(claims.iss) || claims.aud !== config.GOOGLE_CLIENT_ID || !claims.sub || claims.exp * 1000 < Date.now()) throw failed();
  if (!claims.email || claims.email_verified !== true) {
    throw badRequest("Your Google account's email address isn't verified, so it can't be used to sign in.", { code: "GOOGLE_EMAIL_UNVERIFIED" });
  }

  const email = claims.email.trim().toLowerCase();
  const name = [claims.name, [claims.given_name, claims.family_name].filter(Boolean).join(" ")].find((n) => n?.trim().length >= 2);
  return { sub: claims.sub, email, fullName: (name ?? email.split("@")[0]).trim().slice(0, 80) };
}
