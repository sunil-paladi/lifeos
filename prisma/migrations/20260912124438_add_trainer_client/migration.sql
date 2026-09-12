-- CreateTable
CREATE TABLE "trainer_client" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "trainerMembershipId" TEXT NOT NULL,
    "clientMembershipId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trainer_client_gymId_idx" ON "trainer_client"("gymId");

-- CreateIndex
CREATE INDEX "trainer_client_trainerMembershipId_idx" ON "trainer_client"("trainerMembershipId");

-- CreateIndex
CREATE INDEX "trainer_client_clientMembershipId_idx" ON "trainer_client"("clientMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_client_gymId_trainerMembershipId_clientMembershipId_key" ON "trainer_client"("gymId", "trainerMembershipId", "clientMembershipId");

-- AddForeignKey
ALTER TABLE "trainer_client" ADD CONSTRAINT "trainer_client_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_client" ADD CONSTRAINT "trainer_client_trainerMembershipId_fkey" FOREIGN KEY ("trainerMembershipId") REFERENCES "gym_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_client" ADD CONSTRAINT "trainer_client_clientMembershipId_fkey" FOREIGN KEY ("clientMembershipId") REFERENCES "gym_membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
