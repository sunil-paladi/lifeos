-- CreateTable
CREATE TABLE "GymAttendance" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberMembershipId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GymAttendance_gymId_checkedInAt_idx" ON "GymAttendance"("gymId", "checkedInAt");

-- CreateIndex
CREATE INDEX "GymAttendance_memberMembershipId_checkedInAt_idx" ON "GymAttendance"("memberMembershipId", "checkedInAt");

-- AddForeignKey
ALTER TABLE "GymAttendance" ADD CONSTRAINT "GymAttendance_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymAttendance" ADD CONSTRAINT "GymAttendance_memberMembershipId_fkey" FOREIGN KEY ("memberMembershipId") REFERENCES "gym_membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
