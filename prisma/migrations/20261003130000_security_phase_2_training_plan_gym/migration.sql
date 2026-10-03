ALTER TABLE "training_plan" ADD COLUMN "gymId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "training_plan" AS plan
    WHERE (
      SELECT COUNT(*)
      FROM "gym_membership" AS membership
      WHERE membership."userId" = plan."userId"
        AND membership."status" = 'ACTIVE'
    ) <> 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill training plans: every plan owner must have exactly one ACTIVE gym membership';
  END IF;
END $$;

UPDATE "training_plan" AS plan
SET "gymId" = membership."gymId"
FROM "gym_membership" AS membership
WHERE membership."userId" = plan."userId"
  AND membership."status" = 'ACTIVE';

ALTER TABLE "training_plan" ALTER COLUMN "gymId" SET NOT NULL;

ALTER TABLE "training_plan"
ADD CONSTRAINT "training_plan_gymId_fkey"
FOREIGN KEY ("gymId") REFERENCES "gym"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "training_plan_gymId_userId_idx"
ON "training_plan"("gymId", "userId");