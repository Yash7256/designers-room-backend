/*
  Warnings:

  - You are about to drop the `TotpCredential` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TotpRecoveryCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TotpCredential" DROP CONSTRAINT IF EXISTS "TotpCredential_userId_fkey";

-- DropForeignKey
ALTER TABLE "TotpRecoveryCode" DROP CONSTRAINT IF EXISTS "TotpRecoveryCode_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "TotpCredential";

-- DropTable
DROP TABLE IF EXISTS "TotpRecoveryCode";
