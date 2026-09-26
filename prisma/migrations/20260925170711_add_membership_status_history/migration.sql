-- AlterEnum
ALTER TYPE "GymMembershipStatus" ADD VALUE 'INACTIVE';

-- CreateTable
CREATE TABLE "gym_membership_status_history" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "status" "GymMembershipStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_membership_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_membership_status_history_gymId_membershipId_changedAt_idx" ON "gym_membership_status_history"("gymId", "membershipId", "changedAt");

-- CreateIndex
CREATE INDEX "gym_membership_status_history_membershipId_changedAt_idx" ON "gym_membership_status_history"("membershipId", "changedAt");

-- AddForeignKey
ALTER TABLE "gym_membership_status_history" ADD CONSTRAINT "gym_membership_status_history_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_membership_status_history" ADD CONSTRAINT "gym_membership_status_history_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "gym_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_membership_status_history" ADD CONSTRAINT "gym_membership_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
