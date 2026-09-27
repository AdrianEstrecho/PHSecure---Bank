import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../utils/errors.js";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function storeChallenge(userId, purpose, challenge) {
  await prisma.$transaction([
    prisma.webAuthnChallenge.deleteMany({ where: { userId, purpose } }),
    prisma.webAuthnChallenge.create({ data: { userId, purpose, challenge, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) } }),
  ]);
}

/** Single use: the challenge is deleted as it is read. */
async function consumeChallenge(userId, purpose) {
  const record = await prisma.webAuthnChallenge.findFirst({ where: { userId, purpose }, orderBy: { createdAt: "desc" } });
  await prisma.webAuthnChallenge.deleteMany({ where: { userId, purpose } });
  if (!record || record.expiresAt < new Date()) {
    throw badRequest("This passkey request expired. Please try again.", { code: "PASSKEY_EXPIRED" });
  }
  return record.challenge;
}

export async function passkeyRegistrationOptions(user) {
  const existing = await prisma.passkey.findMany({ where: { userId: user.id }, select: { id: true, transports: true } });
  const options = await generateRegistrationOptions({
    rpName: config.WEBAUTHN_RP_NAME,
    rpID: config.WEBAUTHN_RP_ID,
    userName: user.email,
    userDisplayName: user.fullName,
    userID: isoUint8Array.fromUTF8String(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });
  await storeChallenge(user.id, "REGISTER", options.challenge);
  return options;
}

export async function verifyPasskeyRegistration(user, response) {
  const expectedChallenge = await consumeChallenge(user.id, "REGISTER");
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: config.webauthnOrigins,
      expectedRPID: config.WEBAUTHN_RP_ID,
      requireUserVerification: false,
    });
  } catch (err) {
    throw badRequest(`We couldn't verify this passkey: ${err.message}`, { code: "PASSKEY_FAILED" });
  }
  if (!verification.verified) throw badRequest("We couldn't verify this passkey.", { code: "PASSKEY_FAILED" });

  const { credential } = verification.registrationInfo;
  return {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? response.response?.transports ?? [],
  };
}

export async function passkeyAuthenticationOptions(user) {
  const passkeys = await prisma.passkey.findMany({ where: { userId: user.id }, select: { id: true, transports: true } });
  const options = await generateAuthenticationOptions({
    rpID: config.WEBAUTHN_RP_ID,
    allowCredentials: passkeys.map((p) => ({ id: p.id, transports: p.transports })),
    userVerification: "preferred",
  });
  await storeChallenge(user.id, "LOGIN", options.challenge);
  return options;
}

/** Returns true when the assertion is valid for one of the user's passkeys. */
export async function verifyPasskeyAuthentication(user, response) {
  const expectedChallenge = await consumeChallenge(user.id, "LOGIN");
  const passkey = await prisma.passkey.findFirst({ where: { id: String(response?.id ?? ""), userId: user.id } });
  if (!passkey) return false;

  try {
    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: config.webauthnOrigins,
      expectedRPID: config.WEBAUTHN_RP_ID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: false,
    });
    if (!verified) return false;
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: authenticationInfo.newCounter, lastUsedAt: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}
