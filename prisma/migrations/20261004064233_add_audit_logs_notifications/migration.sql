-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'TRAINER_CLIENT_ASSIGNED',
    'PT_SESSION_CREATED',
    'PT_SESSION_RESCHEDULED',
    'PT_SESSION_CANCELLED'
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "gymId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internalLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_gymId_createdAt_idx" ON "audit_log"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_gymId_subjectType_subjectId_createdAt_idx" ON "audit_log"("gymId", "subjectType", "subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorUserId_createdAt_idx" ON "audit_log"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_recipientUserId_readAt_createdAt_idx" ON "notification"("recipientUserId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notification_gymId_createdAt_idx" ON "notification"("gymId", "createdAt");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
