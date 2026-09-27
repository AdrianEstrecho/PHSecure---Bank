import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { serializeAccount, serializeTransaction } from "../services/account.service.js";
import { badRequest, notFound } from "../utils/errors.js";

const MAX_TRANSFER = new Prisma.Decimal("2000000");

export const schemas = {
  transfer: z
    .object({
      kind: z.enum(["internal", "external"]),
      fromAccountId: z.string().uuid("Choose an account to send from."),
      toAccountId: z.string().uuid().optional(),
      payeeName: z.string().trim().min(2).max(60).optional(),
      payeeAccount: z.string().trim().regex(/^\d{10,16}$/, "Enter a 10–16 digit account number.").optional(),
      payeeBank: z.string().trim().min(2).max(60).optional(),
      amount: z.string().trim().regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount like 1500 or 1500.50."),
      note: z.string().trim().max(80).optional(),
    })
    .superRefine((v, ctx) => {
      if (v.kind === "internal" && !v.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Choose an account to send to." });
      if (v.kind === "external" && !(v.payeeName && v.payeeAccount && v.payeeBank)) {
        ctx.addIssue({ code: "custom", path: ["payeeName"], message: "Enter the recipient's name, bank and account number." });
      }
    }),
};

export async function listAccounts(req, res) {
  const accounts = await prisma.bankAccount.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "asc" } });
  const total = accounts.reduce((sum, a) => sum.plus(a.balance), new Prisma.Decimal(0));
  res.json({ accounts: accounts.map(serializeAccount), total: total.toFixed(2), currency: "PHP" });
}

export async function listTransactions(req, res) {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 10, 50);
  const accountId = typeof req.query.accountId === "string" ? req.query.accountId : undefined;
  const transactions = await prisma.transaction.findMany({
    where: { account: { userId: req.user.id }, ...(accountId && { accountId }) },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { account: { select: { type: true } } },
  });
  res.json({ transactions: transactions.map(serializeTransaction) });
}

export async function transfer(req, res) {
  const { kind, fromAccountId, toAccountId, payeeName, payeeAccount, payeeBank, note } = req.body;
  const amount = new Prisma.Decimal(req.body.amount);
  if (amount.lte(0)) throw badRequest("Enter an amount greater than zero.", { code: "VALIDATION" });
  if (amount.gt(MAX_TRANSFER)) throw badRequest("Transfers above ₱2,000,000 need a call with your private banker.", { code: "LIMIT_EXCEEDED" });

  const owned = await prisma.bankAccount.findMany({ where: { userId: req.user.id }, select: { id: true, type: true } });
  const from = owned.find((a) => a.id === fromAccountId);
  const to = kind === "internal" ? owned.find((a) => a.id === toAccountId) : null;
  if (!from || (kind === "internal" && !to)) throw notFound("Account not found.");
  if (to && to.id === from.id) throw badRequest("Choose two different accounts.", { code: "SAME_ACCOUNT" });

  const description =
    kind === "internal" ? `Transfer to ${to.type}` : `Transfer to ${payeeName} · ${payeeBank} ••${payeeAccount.slice(-4)}`;

  await prisma.$transaction(async (tx) => {
    // Conditional decrement: fails atomically if the balance is too low.
    const debited = await tx.bankAccount.updateMany({
      where: { id: from.id, userId: req.user.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (!debited.count) throw badRequest("There isn't enough in that account for this transfer.", { code: "INSUFFICIENT_FUNDS" });

    const fromAfter = await tx.bankAccount.findUniqueOrThrow({ where: { id: from.id } });
    await tx.transaction.create({
      data: { accountId: from.id, description: note ? `${description} — ${note}` : description, category: "Transfer", amount: amount.negated(), balanceAfter: fromAfter.balance },
    });

    if (to) {
      const toAfter = await tx.bankAccount.update({ where: { id: to.id }, data: { balance: { increment: amount } } });
      await tx.transaction.create({
        data: { accountId: to.id, description: `Transfer from ${from.type}`, category: "Transfer", amount, balanceAfter: toAfter.balance },
      });
    }
  });

  res.status(201).json({ ok: true });
}
