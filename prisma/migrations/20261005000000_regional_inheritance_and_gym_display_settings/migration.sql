-- ==========================================================================
-- Regional inheritance + gym display settings (pre-MVP correction)
-- ==========================================================================
--
-- PART A: user regional columns become nullable (null = inherit).
--
-- The previous migration (20261004171500_add_user_regional_preferences)
-- created the 9 regional columns as NOT NULL with hardcoded India defaults
-- (Asia/Kolkata, IN, en-IN, INR, kg, cm, km, DD/MM/YYYY, 12h). Those values
-- were auto-assigned, never user choices, so leaving them in place would
-- permanently pin every existing user as having explicit personal overrides
-- and make "inherit gym settings" unrepresentable.
--
-- This backfill clears exactly those auto-assigned defaults to NULL so
-- existing users inherit (gym -> browser/device -> built-in) from now on.
-- This is safe/appropriate because the regional preference feature is newly
-- introduced and is being corrected BEFORE MVP: at this stage the default
-- values are indistinguishable from deliberate choices, and no released
-- product promise depends on them.
--
-- IMPORTANT: This one-time backfill must NOT be repeated after MVP, when
-- values matching these defaults may be intentional user choices.
-- ==========================================================================

-- Defensive vocabulary normalization (legacy "mi" -> "miles").
UPDATE "user" SET "distanceUnit" = 'miles' WHERE "distanceUnit" = 'mi';

-- Clear the auto-assigned India defaults -> users inherit instead.
UPDATE "user" SET "timezone"     = NULL WHERE "timezone"     = 'Asia/Kolkata';
UPDATE "user" SET "country"      = NULL WHERE "country"      = 'IN';
UPDATE "user" SET "locale"       = NULL WHERE "locale"       = 'en-IN';
UPDATE "user" SET "currency"     = NULL WHERE "currency"     = 'INR';
UPDATE "user" SET "weightUnit"   = NULL WHERE "weightUnit"   = 'kg';
UPDATE "user" SET "heightUnit"   = NULL WHERE "heightUnit"   = 'cm';
UPDATE "user" SET "distanceUnit" = NULL WHERE "distanceUnit" = 'km';
UPDATE "user" SET "dateFormat"   = NULL WHERE "dateFormat"   = 'DD/MM/YYYY';
UPDATE "user" SET "timeFormat"   = NULL WHERE "timeFormat"   = '12h';

-- null now means "inherit": drop NOT NULL and the column defaults so the
-- database no longer injects implicit overrides on insert.
ALTER TABLE "user"
  ALTER COLUMN "timezone" DROP NOT NULL,
  ALTER COLUMN "timezone" DROP DEFAULT,
  ALTER COLUMN "country" DROP NOT NULL,
  ALTER COLUMN "country" DROP DEFAULT,
  ALTER COLUMN "locale" DROP NOT NULL,
  ALTER COLUMN "locale" DROP DEFAULT,
  ALTER COLUMN "currency" DROP NOT NULL,
  ALTER COLUMN "currency" DROP DEFAULT,
  ALTER COLUMN "weightUnit" DROP NOT NULL,
  ALTER COLUMN "weightUnit" DROP DEFAULT,
  ALTER COLUMN "heightUnit" DROP NOT NULL,
  ALTER COLUMN "heightUnit" DROP DEFAULT,
  ALTER COLUMN "distanceUnit" DROP NOT NULL,
  ALTER COLUMN "distanceUnit" DROP DEFAULT,
  ALTER COLUMN "dateFormat" DROP NOT NULL,
  ALTER COLUMN "dateFormat" DROP DEFAULT,
  ALTER COLUMN "timeFormat" DROP NOT NULL,
  ALTER COLUMN "timeFormat" DROP DEFAULT;

-- ==========================================================================
-- PART B: gym_settings gains owner display settings.
-- ==========================================================================

-- Language renamed to locale (BCP 47, e.g. en-IN), unified with the user
-- vocabulary; existing "language" values are copied over.
ALTER TABLE "gym_settings" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en-IN';
UPDATE "gym_settings" SET "locale" = "language";
ALTER TABLE "gym_settings" DROP COLUMN "language";

-- Owner-configurable height unit (member-inheritable display field).
ALTER TABLE "gym_settings" ADD COLUMN "heightUnit" TEXT NOT NULL DEFAULT 'cm';

-- Gym-level distance vocabulary normalized to "miles" (matches
-- USER_DISTANCE_UNITS and the profile validator).
UPDATE "gym_settings" SET "distanceUnit" = 'miles' WHERE "distanceUnit" = 'mi';
