// Seeds one demo customer with two accounts and a month of history. 2FA starts off so every enable flow can be tried.
// Set SEED_EMAIL to an inbox you can read if Brevo is configured.
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const email = (process.env.SEED_EMAIL || "demo@example.com").trim().toLowerCase();
const password = process.env.SEED_PASSWORD || "PHSecure-2026";

const daysAgo = (days, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d;
};

const ACCOUNTS = [
  {
    type: "Private Current",
    number: "014270024821",
    opening: "612480.25",
    history: [
      [28, "Salary — Meridian Holdings", "Income", "385000.00"],
      [27, "Transfer to Reserve Savings", "Transfer", "-150000.00"],
      [25, "Electricity — Metro Power Co.", "Utilities", "-8742.60"],
      [22, "Dining — Café Lumière", "Dining", "-6480.00"],
      [19, "Travel — Pacific Air", "Travel", "-42315.00"],
      [15, "Groceries — Harvest & Co.", "Groceries", "-12930.45"],
      [12, "Mobile — Skyline Telecom", "Utilities", "-2999.00"],
      [9, "Wine — Maison Verre", "Shopping", "-18650.00"],
      [6, "Dividend — Solace Equity Fund", "Income", "24800.00"],
      [3, "Dining — The Gilded Oak", "Dining", "-9120.00"],
      [1, "Wellness — Serein Spa", "Lifestyle", "-7500.00"],
    ],
  },
  {
    type: "Reserve Savings",
    number: "014290037465",
    opening: "2950000.00",
    history: [
      [27, "Transfer from Private Current", "Transfer", "150000.00"],
      [2, "Interest credit", "Interest", "10208.33"],
    ],
  },
];

async function main() {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.bankAccount.deleteMany({ where: { number: { in: ACCOUNTS.map((a) => a.number) } } });

  const user = await prisma.user.create({
    data: {
      fullName: "Isabel Navarro",
      email,
      emailVerified: true,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: daysAgo(30),
    },
  });

  for (const account of ACCOUNTS) {
    let balance = new Prisma.Decimal(account.opening);
    const transactions = [{ description: "Opening balance", category: "Deposit", amount: balance, balanceAfter: balance, createdAt: daysAgo(30, 9) }];
    for (const [days, description, category, amount] of account.history) {
      balance = balance.plus(amount);
      transactions.push({ description, category, amount: new Prisma.Decimal(amount), balanceAfter: balance, createdAt: daysAgo(days) });
    }
    await prisma.bankAccount.create({
      data: {
        userId: user.id,
        type: account.type,
        number: account.number,
        balance,
        createdAt: daysAgo(30, 9),
        transactions: { create: transactions },
      },
    });
  }

  console.log(`Seeded demo customer:\n  email:    ${email}\n  password: ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
