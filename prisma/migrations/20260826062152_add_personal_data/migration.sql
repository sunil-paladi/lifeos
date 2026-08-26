-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "TrainingExperience" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "activityLevel" "ActivityLevel",
ADD COLUMN     "preferredTrainingDays" INTEGER,
ADD COLUMN     "targetWeight" DOUBLE PRECISION,
ADD COLUMN     "trainingExperience" "TrainingExperience";

-- CreateTable
CREATE TABLE "weight_entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weight_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chest" DOUBLE PRECISION,
    "waist" DOUBLE PRECISION,
    "arms" DOUBLE PRECISION,
    "thighs" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weight_entry_userId_recordedAt_idx" ON "weight_entry"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "body_measurement_userId_recordedAt_idx" ON "body_measurement"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "weight_entry" ADD CONSTRAINT "weight_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurement" ADD CONSTRAINT "body_measurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
