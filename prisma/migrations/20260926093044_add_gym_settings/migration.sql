-- CreateTable
CREATE TABLE "gym_settings" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "language" TEXT NOT NULL DEFAULT 'en',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "timeFormat" TEXT NOT NULL DEFAULT '12h',
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "distanceUnit" TEXT NOT NULL DEFAULT 'km',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gym_settings_gymId_key" ON "gym_settings"("gymId");

-- CreateIndex
CREATE INDEX "gym_settings_gymId_idx" ON "gym_settings"("gymId");

-- AddForeignKey
ALTER TABLE "gym_settings" ADD CONSTRAINT "gym_settings_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
