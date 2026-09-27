# Quickstart: Validating Training Attendance Without Practitioner Linkage

How to prove this feature works end to end. Referenced shapes live in
[data-model.md](./data-model.md) and [contracts/](./contracts/); this file is the run guide.

## Prerequisites

- Node >= 20.9, dependencies installed (`npm install`), including the new `read-excel-file`.
- A **scratch** PostgreSQL database — never the production Neon database for these steps. The
  project has previously used a disposable local Postgres for exactly this.
- Environment: `DATABASE_URL`, `DIRECT_URL` (scratch database), `AUTH_SECRET` (≥32 chars).
- One central user and two hospitals, each with a coordinator and at least one training. Create the
  central user with `npm run admin:create`; create hospitals, coordinators and trainings through the
  app or the existing seeding-by-action approach. No seed data ships with the product.

## 0. Gates (Principle V)

```bash
npm run typecheck
npm run lint
npm run build
```

All three must pass before any functional claim. Record the new-dependency audit result too:

```bash
npm audit --omit=dev
```

## 1. Migration rehearsal, including the backfill

Before applying anywhere real, prove FR-016 on the scratch database:

1. Apply migrations up to the commit *before* this feature.
2. Insert one attendance row linked to a practitioner (the state production does not have but other
   environments may).
3. Run `npx prisma migrate deploy`.
4. Expect: the linked row now carries that practitioner's **name** in `attendeeName`, its
   `practitionerId` column no longer exists, and any pre-existing headcount row is unchanged.
5. Expect: inserting a row with both `attendeeName` and `headcount`, or with neither, is rejected by
   the CHECK constraint; inserting a second headcount row for one training is rejected by the
   partial unique index.

> Production note: migration `20260920000000_stored_file_disk_path` is still unapplied on Neon.
> Apply that first, separately, before this feature's migration reaches that database.

## 2. Manual named entry (User Story 1)

1. Sign in as a hospital coordinator and open a training on `/trainings`.
2. Confirm **no** practitioner/committee-member picker appears anywhere in the attendance area.
3. Add three names, including one that exactly matches a registered practitioner's name. Save.
4. Expect: the three names are listed and the attendee count reads 3.
5. Remove one name, save, and expect a count of 2.
6. Rename that practitioner on `/assets`, return to the training, and expect the attendance name
   unchanged — proving there is no link.

## 3. Excel/CSV import (User Story 2)

1. Download the template from the attendance area. Expect a single header cell `الاسم`, and Arabic
   that renders correctly when opened in Excel.
2. Fill 10 names with 2 blank rows interspersed; upload.
3. Expect: summary reads 10 imported / 2 skipped, and 10 individually removable names appear.
4. Repeat with an `.xlsx` saved from Excel — same result.
5. Error cases, each expected to write nothing and leave existing attendance intact:
   - a `.txt` or `.pdf` file → unsupported type, accepted list named;
   - a sheet whose first header is not `الاسم` → expected column named, template offered;
   - a header-only sheet → "no names found";
   - a sheet with 1,001 names → limit and found count reported;
   - a sheet containing one 250-character name → that row reported as skipped with its row number,
     the rest imported.

## 4. Mode exclusivity (User Story 3)

1. Record a headcount of 50 on a training; expect count 50 and zero names.
2. Switch to named entry, save 4 names; expect count 4, no headcount, after a warning that the
   headcount will be replaced.
3. Switch back to headcount 40; expect count 40, zero names, after a warning about discarding names.
4. Attempt to save with neither → refused with a message asking for one of the two.

## 5. Security checks (negative + positive control)

Run these against the built server with a scripted harness, because the UI no longer offers the
removed mode. Each negative test needs its positive control, or a refusal proves nothing.

| Check | Expect |
|---|---|
| Coordinator A calls `recordTrainingExecution` for hospital B's training | refused, nothing written |
| Same call for A's own training | succeeds *(positive control)* |
| Coordinator A calls `importAttendanceNames` for hospital B's training | refused, nothing written |
| Same import for A's own training | succeeds *(positive control)* |
| Any caller submits `practitionerIds` | refused with a validation error, nothing written (FR-005) |
| No session, either action | refused before the action body runs |
| Template route without a session | `401` |

## 6. Data assertions

```sql
-- no practitioner reference remains anywhere in attendance
SELECT column_name FROM information_schema.columns
WHERE table_name = 'TrainingAttendance';      -- must not include practitionerId

-- every row is a name xor a headcount
SELECT count(*) FROM "TrainingAttendance"
WHERE ("attendeeName" IS NULL) = ("headcount" IS NULL);   -- must be 0

-- no training mixes modes
SELECT "trainingId" FROM "TrainingAttendance"
GROUP BY "trainingId"
HAVING count("attendeeName") > 0 AND count("headcount") > 0;   -- must return no rows
```

Also confirm an `AuditLog` entry exists for each attendance change, and that the counts shown on
the dashboard and training list match the stored attendance for both modes (SC-005).

## 7. Documentation follow-through

- `docs/CLAUDE_REFERENCE.md` §5 data-model notes updated to describe `attendeeName`.
- §8 already records deviation **D-001**; the SRS itself still needs its manual FR-21/FR-26 update
  by the product owner.
