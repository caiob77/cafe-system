-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
