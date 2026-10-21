-- Reconcile the live database with prisma/schema.prisma.
-- The 20261019073143_add_auth_system file was rewritten after it had already
-- been applied, so the database never received "googleId" and still contains
-- the superseded password-authentication objects. Every statement is guarded
-- so a fresh replay of the migration history stays a no-op.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

DROP TABLE IF EXISTS "PasswordResetToken";

DROP TABLE IF EXISTS "EmailVerificationToken";

ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";

ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";

ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerifiedAt";
