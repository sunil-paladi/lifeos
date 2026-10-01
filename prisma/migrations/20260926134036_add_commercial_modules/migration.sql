-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('MEMBERSHIP', 'PT_SESSION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER', 'ONLINE');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'STRIPE', 'RAZORPAY', 'OTHER');

-- AlterTable
ALTER TABLE "gym_membership" ADD COLUMN     "membershipEndDate" TIMESTAMP(3),
ADD COLUMN     "membershipPlanId" TEXT,
ADD COLUMN     "membershipStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "pt_session" ADD COLUMN     "ptPricingId" TEXT;

-- CreateTable
CREATE TABLE "gym_membership_plan" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_membership_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pt_pricing" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pt_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberMembershipId" TEXT NOT NULL,
    "membershipPlanId" TEXT,
    "ptSessionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "providerPaymentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_membership_plan_gymId_idx" ON "gym_membership_plan"("gymId");

-- CreateIndex
CREATE INDEX "gym_membership_plan_gymId_isActive_idx" ON "gym_membership_plan"("gymId", "isActive");

-- CreateIndex
CREATE INDEX "pt_pricing_gymId_idx" ON "pt_pricing"("gymId");

-- CreateIndex
CREATE INDEX "pt_pricing_gymId_isActive_idx" ON "pt_pricing"("gymId", "isActive");

-- CreateIndex
CREATE INDEX "payment_gymId_paymentType_status_idx" ON "payment"("gymId", "paymentType", "status");

-- CreateIndex
CREATE INDEX "payment_gymId_paidAt_idx" ON "payment"("gymId", "paidAt");

-- CreateIndex
CREATE INDEX "payment_memberMembershipId_paidAt_idx" ON "payment"("memberMembershipId", "paidAt");

-- CreateIndex
CREATE INDEX "payment_membershipPlanId_idx" ON "payment"("membershipPlanId");

-- CreateIndex
CREATE INDEX "payment_ptSessionId_idx" ON "payment"("ptSessionId");

-- CreateIndex
CREATE INDEX "gym_membership_gymId_membershipPlanId_idx" ON "gym_membership"("gymId", "membershipPlanId");

-- CreateIndex
CREATE INDEX "pt_session_gymId_ptPricingId_idx" ON "pt_session"("gymId", "ptPricingId");

-- AddForeignKey
ALTER TABLE "gym_membership_plan" ADD CONSTRAINT "gym_membership_plan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_pricing" ADD CONSTRAINT "pt_pricing_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_membership" ADD CONSTRAINT "gym_membership_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "gym_membership_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_session" ADD CONSTRAINT "pt_session_ptPricingId_fkey" FOREIGN KEY ("ptPricingId") REFERENCES "pt_pricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_memberMembershipId_fkey" FOREIGN KEY ("memberMembershipId") REFERENCES "gym_membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "gym_membership_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_ptSessionId_fkey" FOREIGN KEY ("ptSessionId") REFERENCES "pt_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
