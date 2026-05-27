-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "plan" "PlanType" NOT NULL DEFAULT 'free',
ADD COLUMN     "planExpiresAt" TIMESTAMP(3);
