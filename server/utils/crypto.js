import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { config } from "../config.js";

const PASSWORD_COST = 12;
// Short-lived codes and Vault Codes are checked in loops, so they use a lighter cost than passwords.
const CODE_COST = 10;

export const hashPassword = (password) => bcrypt.hash(password, PASSWORD_COST);
export const hashCode = (code) => bcrypt.hash(code, CODE_COST);
export const compareHash = (value, hash) => bcrypt.compare(value, hash);

// Compared against when an email isn't registered, so response time doesn't reveal which emails exist.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString("hex"), PASSWORD_COST);

/** 6-digit numeric one-time code, zero-padded. */
export function generateNumericCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// No 0/O/1/I so codes survive being written down by hand.
const VAULT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Vault (backup) code in XXXX-XXXX format. */
export function generateVaultCode() {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += VAULT_ALPHABET[crypto.randomInt(0, VAULT_ALPHABET.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function normalizeVaultCode(input) {
  const raw = String(input).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : null;
}

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

const ENC_KEY = Buffer.from(config.TOTP_ENC_KEY, "hex");

/** AES-256-GCM, serialised as v1:iv:tag:ciphertext (base64url parts). */
export function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(":");
}

export function decrypt(payload) {
  const [version, iv, tag, ciphertext] = payload.split(":");
  if (version !== "v1") throw new Error("Unsupported ciphertext version");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
