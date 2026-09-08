-- CreateEnum
CREATE TYPE "GymMembershipRole" AS ENUM ('OWNER', 'TRAINER', 'MEMBER');

-- CreateEnum
CREATE TYPE "GymMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT');

-- CreateTable
CREATE TABLE "gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gym_membership" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GymMembershipRole" NOT NULL,
    "status" "GymMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_ownerId_idx" ON "gym"("ownerId");

-- CreateIndex
CREATE INDEX "gym_membership_gymId_role_idx" ON "gym_membership"("gymId", "role");

-- CreateIndex
CREATE INDEX "gym_membership_userId_idx" ON "gym_membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gym_membership_gymId_userId_key" ON "gym_membership"("gymId", "userId");

-- AddForeignKey
ALTER TABLE "gym" ADD CONSTRAINT "gym_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_membership" ADD CONSTRAINT "gym_membership_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gym_membership" ADD CONSTRAINT "gym_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
