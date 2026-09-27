-- Training attendance no longer references Practitioner (docs/CLAUDE_REFERENCE.md §8, D-001).
-- A row is now either one named attendee or the training's total headcount.
-- Order matters: the backfill must run while the practitioner link still exists, and the
-- constraints must come after the backfill or converted rows would violate the CHECK.

-- 1. New column for the attendee's name.
ALTER TABLE "TrainingAttendance" ADD COLUMN "attendeeName" TEXT;

-- 2. Preserve documented attendance history: convert each practitioner-linked row into a plain
--    name carrying that practitioner's name at migration time. No-op where no linked rows exist.
UPDATE "TrainingAttendance" AS a
SET "attendeeName" = p."name"
FROM "Practitioner" AS p
WHERE a."practitionerId" = p."id"
  AND a."practitionerId" IS NOT NULL;

-- 2b. Remove information-free orphans. Under the old schema, deleting a practitioner set
--     "practitionerId" to NULL (the FK was ON DELETE SET NULL), leaving rows with no practitioner,
--     no name and no headcount. They contributed nothing to the reported attendee count, which
--     summed linked practitioners and headcounts, so deleting them loses no information — whereas
--     inventing a placeholder name would fabricate an attendee and inflate the count.
DELETE FROM "TrainingAttendance"
WHERE "attendeeName" IS NULL
  AND "headcount" IS NULL;

-- 3. Drop the link itself.
ALTER TABLE "TrainingAttendance" DROP CONSTRAINT IF EXISTS "TrainingAttendance_practitionerId_fkey";
ALTER TABLE "TrainingAttendance" DROP COLUMN "practitionerId";

-- 4. Exactly one of attendeeName / headcount per row.
ALTER TABLE "TrainingAttendance"
ADD CONSTRAINT "TrainingAttendance_name_xor_headcount"
CHECK (("attendeeName" IS NOT NULL AND "headcount" IS NULL)
    OR ("attendeeName" IS NULL AND "headcount" IS NOT NULL));

-- 5. At most one headcount row per training.
CREATE UNIQUE INDEX "TrainingAttendance_one_headcount_per_training"
ON "TrainingAttendance" ("trainingId")
WHERE "attendeeName" IS NULL;
