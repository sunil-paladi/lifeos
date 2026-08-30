-- CreateEnum
CREATE TYPE "ExerciseVisibility" AS ENUM ('GLOBAL', 'PRIVATE', 'TRAINER_CLIENTS', 'PUBLIC');

-- CreateEnum
CREATE TYPE "WorkoutSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "primaryMuscle" TEXT NOT NULL,
    "secondaryMuscles" TEXT,
    "equipment" TEXT,
    "instructions" TEXT,
    "createdByUserId" TEXT,
    "visibility" "ExerciseVisibility" NOT NULL DEFAULT 'GLOBAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalWeeks" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_phase" (
    "id" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phaseOrder" INTEGER NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_week" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_day" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "dayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_exercise" (
    "id" TEXT NOT NULL,
    "workoutDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "exerciseOrder" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "minReps" INTEGER NOT NULL,
    "maxReps" INTEGER NOT NULL,
    "restSeconds" INTEGER,
    "targetWeight" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workoutDayId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "WorkoutSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "durationSeconds" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_set" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "programExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "reps" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_createdByUserId_idx" ON "exercise"("createdByUserId");

-- CreateIndex
CREATE INDEX "exercise_primaryMuscle_idx" ON "exercise"("primaryMuscle");

-- CreateIndex
CREATE INDEX "training_plan_userId_idx" ON "training_plan"("userId");

-- CreateIndex
CREATE INDEX "training_plan_userId_isActive_idx" ON "training_plan"("userId", "isActive");

-- CreateIndex
CREATE INDEX "program_phase_trainingPlanId_idx" ON "program_phase"("trainingPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "program_phase_trainingPlanId_phaseOrder_key" ON "program_phase"("trainingPlanId", "phaseOrder");

-- CreateIndex
CREATE INDEX "program_week_phaseId_idx" ON "program_week"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "program_week_phaseId_weekNumber_key" ON "program_week"("phaseId", "weekNumber");

-- CreateIndex
CREATE INDEX "workout_day_weekId_idx" ON "workout_day"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_day_weekId_dayOfWeek_key" ON "workout_day"("weekId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "program_exercise_workoutDayId_idx" ON "program_exercise"("workoutDayId");

-- CreateIndex
CREATE INDEX "program_exercise_exerciseId_idx" ON "program_exercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "program_exercise_workoutDayId_exerciseOrder_key" ON "program_exercise"("workoutDayId", "exerciseOrder");

-- CreateIndex
CREATE INDEX "workout_session_userId_idx" ON "workout_session"("userId");

-- CreateIndex
CREATE INDEX "workout_session_workoutDayId_idx" ON "workout_session"("workoutDayId");

-- CreateIndex
CREATE INDEX "workout_session_userId_startedAt_idx" ON "workout_session"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "workout_set_workoutSessionId_idx" ON "workout_set"("workoutSessionId");

-- CreateIndex
CREATE INDEX "workout_set_programExerciseId_idx" ON "workout_set"("programExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_set_workoutSessionId_programExerciseId_setNumber_key" ON "workout_set"("workoutSessionId", "programExerciseId", "setNumber");

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plan" ADD CONSTRAINT "training_plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_phase" ADD CONSTRAINT "program_phase_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "training_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_week" ADD CONSTRAINT "program_week_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "program_phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day" ADD CONSTRAINT "workout_day_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "program_week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercise" ADD CONSTRAINT "program_exercise_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_exercise" ADD CONSTRAINT "program_exercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "workout_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "program_exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
