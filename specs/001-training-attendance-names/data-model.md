# Phase 1 Data Model: Training Attendance Without Practitioner Linkage

## Changed entity: TrainingAttendance

One row is **either** one named attendee **or** the training's total headcount.

| Field | Type | Rules |
|---|---|---|
| `id` | id | unchanged |
| `trainingId` | id → Training | required; cascade delete with the training (unchanged) |
| `attendeeName` | text, nullable | **new**. Trimmed, 1–200 characters when present. Free text; no relationship to any person record |
| `headcount` | integer, nullable | unchanged. 1–100,000 when present |
| ~~`practitionerId`~~ | — | **removed**, with its foreign key and relation |

**Row-level invariant (CHECK)**: exactly one of `attendeeName` / `headcount` is non-null.

**Training-level invariants**:
- At most one headcount row per training — enforced by a partial unique index on `trainingId`
  restricted to rows where `attendeeName IS NULL`.
- A training never holds a headcount row and name rows at the same time — enforced by the write
  path, which replaces the whole attendance set for a training inside one transaction.
- At most 1,000 name rows per training — enforced in the write path (FR-008 assumption).

## Changed entity: Practitioner

| Field | Change |
|---|---|
| ~~`attendances`~~ | **removed** back-relation to `TrainingAttendance` |

Everything else is unchanged. The practitioner roster keeps its own screens and purpose (IPC
committee members, SRS FR-24/FR-25). Deleting or renaming a practitioner now has no effect on any
attendance record.

## Derived values (not stored)

| Value | Derivation | Requirement |
|---|---|---|
| `attendeeCount` | number of name rows, or the headcount value in headcount mode | FR-017 |
| attendance mode | `names` when any name row exists, `headcount` when the headcount row exists, otherwise unset | FR-001 |

## Transport shape (client-facing DTO)

`TrainingDTO` in `src/lib/types.ts`:

| Field | Change |
|---|---|
| ~~`attendeePractitionerIds: string[]`~~ | **removed** |
| `attendeeNames: string[]` | **new**; ordered as stored, duplicates preserved |
| `attendeeCount: number` | unchanged meaning, new derivation |

## Import result shape

```text
ImportSummary
  imported: number                  // attendee rows created
  skipped:  number                  // data rows not imported
  skippedReasons:
    blank:   number                 // empty or whitespace-only first cell
    tooLong: { row: number }[]      // name exceeded 200 characters, with 1-based sheet row
  sheetName?: string                // first worksheet read, when the source was .xlsx
```

## Migration outline

Migration `prisma/migrations/20260927000000_attendance_names/migration.sql`, in order:

1. `ALTER TABLE "TrainingAttendance" ADD COLUMN "attendeeName" TEXT;`
2. Backfill: set `attendeeName` from the joined `Practitioner.name` for every row where
   `practitionerId IS NOT NULL` (FR-016). Production holds 0 such rows; this protects other
   environments.
2b. Delete information-free orphans — rows left with no name and no headcount. Under the old schema
   a practitioner deletion set `practitionerId` to `NULL` (FK `ON DELETE SET NULL`), leaving rows
   that referenced nobody and counted for nothing: the old attendee count summed linked
   practitioners and headcounts, so such a row contributed 0. Deleting them loses no information,
   whereas giving them a placeholder name would fabricate an attendee and inflate the count. Found
   by the T010 rehearsal, which the first migration draft failed.
3. Drop the foreign key constraint, then `DROP COLUMN "practitionerId"`.
4. Add the CHECK constraint for the row-level invariant.
5. Add the partial unique index for one headcount row per training.

Steps 4 and 5 must follow step 2, or the backfilled rows would violate the new CHECK.

## Data state at planning time (verified)

| Table | Rows | Note |
|---|---|---|
| `TrainingAttendance` | 1 | headcount 50, `practitionerId` null |
| practitioner-linked attendance | 0 | backfill is a no-op in production |
| `Practitioner` | 1 | untouched by this change |
| `Training` | 2 | untouched |
