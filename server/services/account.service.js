import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { maskAccountNumber } from "../utils/mask.js";

export async function generateAccountNumber(tx = prisma) {
  for (;;) {
    const number = `0${crypto.randomInt(10, 100)}${crypto.randomInt(0, 1e9).toString().padStart(9, "0")}`;
    if (!(await tx.bankAccount.findUnique({ where: { number } }))) return number;
  }
}

/** Every new customer starts with a current and a savings account, each with an opening deposit. */
export async function openStarterAccounts(userId, tx = prisma) {
  const starters = [
    { type: "Private Current", opening: "150000.00" },
    { type: "Reserve Savings", opening: "500000.00" },
  ];
  for (const { type, opening } of starters) {
    const balance = new Prisma.Decimal(opening);
    await tx.bankAccount.create({
      data: {
        userId,
        type,
        number: await generateAccountNumber(tx),
        balance,
        transactions: { create: { description: "Opening deposit", category: "Deposit", amount: balance, balanceAfter: balance } },
      },
    });
  }
}

export const serializeAccount = (a) => ({
  id: a.id,
  type: a.type,
  maskedNumber: maskAccountNumber(a.number),
  balance: a.balance.toFixed(2),
  currency: a.currency,
  createdAt: a.createdAt,
});

export const serializeTransaction = (t) => ({
  id: t.id,
  accountId: t.accountId,
  accountType: t.account?.type,
  description: t.description,
  category: t.category,
  amount: t.amount.toFixed(2),
  balanceAfter: t.balanceAfter.toFixed(2),
  createdAt: t.createdAt,
});
