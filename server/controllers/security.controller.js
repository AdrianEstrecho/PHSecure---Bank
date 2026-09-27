import { prisma } from "../lib/prisma.js";
import { describeDevice } from "../utils/requestContext.js";

export async function listLogs(req, res) {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 100);
  const logs = await prisma.securityLog.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json({
    logs: logs.map((l) => ({ id: l.id, event: l.event, details: l.details, ip: l.ip, device: describeDevice(l.userAgent), createdAt: l.createdAt })),
  });
}
