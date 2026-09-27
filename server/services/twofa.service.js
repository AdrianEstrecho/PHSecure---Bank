import { prisma } from "../lib/prisma.js";
import { maskEmail, maskPhone } from "../utils/mask.js";
import { METHOD_TYPES } from "../utils/methods.js";
import { vaultSummary } from "./vault.service.js";

export async function enabledMethodTypes(userId) {
  const rows = await prisma.twoFactorMethod.findMany({ where: { userId, enabled: true }, select: { type: true } });
  const enabled = new Set(rows.map((r) => r.type));
  return METHOD_TYPES.filter((t) => enabled.has(t));
}

/** Everything the Security page needs, in one payload. */
export async function buildStatus(userId) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      methods: true,
      passkeys: { orderBy: { createdAt: "asc" }, select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true } },
    },
  });
  const byType = new Map(user.methods.map((m) => [m.type, m]));

  const methods = METHOD_TYPES.map((type) => {
    const row = byType.get(type);
    const enabled = Boolean(row?.enabled);
    return {
      type,
      enabled,
      enabledAt: enabled ? row.enabledAt : null,
      lastUsedAt: enabled ? row.lastUsedAt : null,
      ...(type === "PASSKEY" && {
        passkeys: user.passkeys.map((p) => ({ id: p.id.slice(0, 8), deviceName: p.deviceName, createdAt: p.createdAt, lastUsedAt: p.lastUsedAt })),
      }),
    };
  });

  return {
    twoFactorOn: user.twoFactorOn,
    defaultMethod: user.defaultMethod,
    maskedEmail: maskEmail(user.email),
    maskedPhone: maskPhone(user.phone),
    phoneVerified: user.phoneVerified,
    methods,
    vault: await vaultSummary(userId),
  };
}
