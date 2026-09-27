import { prisma } from "../lib/prisma.js";
import { compareHash, generateVaultCode, hashCode, normalizeVaultCode } from "../utils/crypto.js";

export const VAULT_CODE_COUNT = 10;

/** Generates a fresh set of Vault Codes. Hashing happens here, outside any DB transaction. */
export async function createVaultCodeSet() {
  const codes = Array.from({ length: VAULT_CODE_COUNT }, generateVaultCode);
  const hashes = await Promise.all(codes.map(hashCode));
  return { codes, hashes };
}

/** Replaces the user's stored Vault Codes. The plaintext codes are never stored. */
export async function storeVaultCodes(tx, userId, hashes) {
  await tx.backupCode.deleteMany({ where: { userId } });
  await tx.backupCode.createMany({ data: hashes.map((codeHash) => ({ userId, codeHash })) });
}

/** Marks a matching unused Vault Code as used. Returns the number of codes left, or null if none matched. */
export async function consumeVaultCode(userId, input) {
  const code = normalizeVaultCode(input);
  if (!code) return null;

  const unused = await prisma.backupCode.findMany({ where: { userId, usedAt: null } });
  const matches = await Promise.all(unused.map((candidate) => compareHash(code, candidate.codeHash)));
  const match = unused[matches.indexOf(true)];
  if (!match) return null;

  const { count } = await prisma.backupCode.updateMany({ where: { id: match.id, usedAt: null }, data: { usedAt: new Date() } });
  return count ? unused.length - 1 : null;
}

export async function vaultSummary(userId) {
  const codes = await prisma.backupCode.findMany({ where: { userId }, select: { usedAt: true, createdAt: true } });
  return {
    total: codes.length,
    remaining: codes.filter((c) => !c.usedAt).length,
    generatedAt: codes[0]?.createdAt ?? null,
  };
}
