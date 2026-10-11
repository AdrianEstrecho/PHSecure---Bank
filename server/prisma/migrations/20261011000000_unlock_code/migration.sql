-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lockedByUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unlockCodeHash" TEXT;
