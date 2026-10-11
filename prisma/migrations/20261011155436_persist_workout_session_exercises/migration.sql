-- Add the new columns as nullable so existing sessions and sets can be backfilled.
ALTER TABLE "workout_session"
ADD COLUMN "clientRequestId" TEXT,
ADD COLUMN "lastActivityAt" TIMESTAMP(3),
ALTER COLUMN "workoutDayId" DROP NOT NULL;

CREATE TABLE "workout_session_exercise" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "programExerciseId" TEXT,
    "exerciseId" TEXT,
    "exerciseOrder" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "primaryMuscle" TEXT NOT NULL,
    "secondaryMuscles" TEXT,
    "equipment" TEXT,
    "imageUrl" TEXT,
    "instructions" TEXT,
    "bodyPart" TEXT,
    "exerciseType" TEXT,
    "difficulty" TEXT,
    "plannedSets" INTEGER,
    "minReps" INTEGER,
    "maxReps" INTEGER,
    "targetWeight" DOUBLE PRECISION,
    "restSeconds" INTEGER,
    "durationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_session_exercise_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "workout_set"
ADD COLUMN "workoutSessionExerciseId" TEXT;

-- Give each legacy session a stable idempotency key and preserve its latest known activity time.
UPDATE "workout_session"
SET
    "clientRequestId" = 'legacy:' || "id",
    "lastActivityAt" = GREATEST("startedAt", "updatedAt", COALESCE("completedAt", "startedAt"));

-- Snapshot every exercise on the session's planned day, including exercises without recorded sets,
-- plus any exercise referenced by a legacy set even if its plan relationship is inconsistent.
WITH source_exercises AS (
    SELECT session."id" AS "sessionId", program_exercise."id" AS "programExerciseId"
    FROM "workout_session" AS session
    JOIN "program_exercise" AS program_exercise
      ON program_exercise."workoutDayId" = session."workoutDayId"

    UNION

    SELECT workout_set."workoutSessionId" AS "sessionId",
           workout_set."programExerciseId"
    FROM "workout_set" AS workout_set
),
ordered_exercises AS (
    SELECT
        source."sessionId",
        program_exercise."id" AS "existingProgramExerciseId",
        source."programExerciseId",
        program_exercise."exerciseId",
        program_exercise."sets",
        program_exercise."minReps",
        program_exercise."maxReps",
        program_exercise."targetWeight",
        program_exercise."restSeconds",
        ROW_NUMBER() OVER (
            PARTITION BY source."sessionId"
            ORDER BY
                CASE
                    WHEN program_exercise."workoutDayId" = session."workoutDayId" THEN 0
                    ELSE 1
                END,
                program_exercise."exerciseOrder" NULLS LAST,
                source."programExerciseId"
        ) AS "exerciseOrder"
    FROM source_exercises AS source
    JOIN "workout_session" AS session
      ON session."id" = source."sessionId"
    LEFT JOIN "program_exercise" AS program_exercise
      ON program_exercise."id" = source."programExerciseId"
    LEFT JOIN "exercise" AS exercise
      ON exercise."id" = program_exercise."exerciseId"
)
INSERT INTO "workout_session_exercise" (
    "id",
    "workoutSessionId",
    "programExerciseId",
    "exerciseId",
    "exerciseOrder",
    "name",
    "primaryMuscle",
    "secondaryMuscles",
    "equipment",
    "imageUrl",
    "instructions",
    "plannedSets",
    "minReps",
    "maxReps",
    "targetWeight",
    "restSeconds",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy:' || LENGTH(ordered."sessionId")::TEXT || ':' ||
        ordered."sessionId" || LENGTH(ordered."programExerciseId")::TEXT || ':' ||
        ordered."programExerciseId",
    ordered."sessionId",
    ordered."existingProgramExerciseId",
    CASE
        WHEN exercise."id" IS NOT NULL THEN ordered."exerciseId"
        ELSE NULL
    END,
    ordered."exerciseOrder"::INTEGER,
    COALESCE(exercise."name", 'Unknown exercise (' || ordered."programExerciseId" || ')'),
    COALESCE(exercise."primaryMuscle", 'Unknown'),
    exercise."secondaryMuscles",
    exercise."equipment",
    exercise."imageUrl",
    exercise."instructions",
    ordered."sets",
    ordered."minReps",
    ordered."maxReps",
    ordered."targetWeight",
    ordered."restSeconds",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM ordered_exercises AS ordered
LEFT JOIN "exercise" AS exercise
  ON exercise."id" = ordered."exerciseId";

-- Resolve every original set to the deterministic snapshot ID for its session/source exercise.
UPDATE "workout_set" AS workout_set
SET "workoutSessionExerciseId" = session_exercise."id"
FROM "workout_session_exercise" AS session_exercise
WHERE session_exercise."id" =
    'legacy:' || LENGTH(workout_set."workoutSessionId")::TEXT || ':' ||
    workout_set."workoutSessionId" ||
    LENGTH(workout_set."programExerciseId")::TEXT || ':' ||
    workout_set."programExerciseId";

-- Abort rather than discard or mis-attach any legacy set if the backfill did not resolve it.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "workout_set" AS workout_set
        LEFT JOIN "workout_session_exercise" AS session_exercise
          ON session_exercise."id" = workout_set."workoutSessionExerciseId"
        LEFT JOIN "program_exercise" AS source_exercise
          ON source_exercise."id" = workout_set."programExerciseId"
        WHERE workout_set."workoutSessionExerciseId" IS NULL
           OR session_exercise."id" IS NULL
           OR session_exercise."workoutSessionId" <> workout_set."workoutSessionId"
           OR (
               source_exercise."id" IS NOT NULL
               AND session_exercise."programExerciseId" IS DISTINCT FROM source_exercise."id"
           )
    ) THEN
        RAISE EXCEPTION 'Workout set snapshot backfill failed: a set is missing or linked to a different session or source exercise';
    END IF;
END $$;

ALTER TABLE "workout_session"
ALTER COLUMN "clientRequestId" SET NOT NULL,
ALTER COLUMN "lastActivityAt" SET NOT NULL,
ALTER COLUMN "lastActivityAt" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "workout_set"
ALTER COLUMN "workoutSessionExerciseId" SET NOT NULL;

-- The immutable snapshot remains after source plan/exercise deletion; only its optional links clear.
ALTER TABLE "workout_session"
DROP CONSTRAINT "workout_session_workoutDayId_fkey";

ALTER TABLE "workout_set"
DROP CONSTRAINT "workout_set_programExerciseId_fkey";

ALTER TABLE "workout_set"
DROP CONSTRAINT "workout_set_workoutSessionId_fkey";

DROP INDEX "workout_set_workoutSessionId_idx";
DROP INDEX "workout_set_programExerciseId_idx";
DROP INDEX "workout_set_workoutSessionId_programExerciseId_setNumber_key";

ALTER TABLE "workout_set"
DROP COLUMN "programExerciseId",
DROP COLUMN "workoutSessionId";

CREATE INDEX "workout_session_exercise_programExerciseId_idx"
ON "workout_session_exercise"("programExerciseId");

CREATE INDEX "workout_session_exercise_exerciseId_idx"
ON "workout_session_exercise"("exerciseId");

CREATE UNIQUE INDEX "workout_session_exercise_workoutSessionId_exerciseOrder_key"
ON "workout_session_exercise"("workoutSessionId", "exerciseOrder");

CREATE UNIQUE INDEX "workout_session_userId_clientRequestId_key"
ON "workout_session"("userId", "clientRequestId");

CREATE UNIQUE INDEX "workout_set_workoutSessionExerciseId_setNumber_key"
ON "workout_set"("workoutSessionExerciseId", "setNumber");

ALTER TABLE "workout_session"
ADD CONSTRAINT "workout_session_workoutDayId_fkey"
FOREIGN KEY ("workoutDayId") REFERENCES "workout_day"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workout_session_exercise"
ADD CONSTRAINT "workout_session_exercise_workoutSessionId_fkey"
FOREIGN KEY ("workoutSessionId") REFERENCES "workout_session"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workout_session_exercise"
ADD CONSTRAINT "workout_session_exercise_programExerciseId_fkey"
FOREIGN KEY ("programExerciseId") REFERENCES "program_exercise"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workout_session_exercise"
ADD CONSTRAINT "workout_session_exercise_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "exercise"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workout_set"
ADD CONSTRAINT "workout_set_workoutSessionExerciseId_fkey"
FOREIGN KEY ("workoutSessionExerciseId") REFERENCES "workout_session_exercise"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
