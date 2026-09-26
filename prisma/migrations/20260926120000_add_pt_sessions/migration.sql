-- CreateEnum
CREATE TYPE "PTSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "pt_session" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "trainerMembershipId" TEXT NOT NULL,
    "clientMembershipId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "PTSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pt_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pt_session_gymId_scheduledAt_idx" ON "pt_session"("gymId", "scheduledAt");

-- CreateIndex
CREATE INDEX "pt_session_trainerMembershipId_scheduledAt_idx" ON "pt_session"("trainerMembershipId", "scheduledAt");

-- CreateIndex
CREATE INDEX "pt_session_clientMembershipId_scheduledAt_idx" ON "pt_session"("clientMembershipId", "scheduledAt");

-- AddForeignKey
ALTER TABLE "pt_session" ADD CONSTRAINT "pt_session_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_session" ADD CONSTRAINT "pt_session_trainerMembershipId_fkey" FOREIGN KEY ("trainerMembershipId") REFERENCES "gym_membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pt_session" ADD CONSTRAINT "pt_session_clientMembershipId_fkey" FOREIGN KEY ("clientMembershipId") REFERENCES "gym_membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;