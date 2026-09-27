---

description: "Task list for training attendance without practitioner linkage"
---

# Tasks: Training Attendance Without Practitioner Linkage

**Input**: Design documents from `/specs/001-training-attendance-names/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md — all present

**Tests**: No automated test framework exists in this repository (0 test files, no CI), and the spec
does not request TDD. Per constitution Principle V, verification tasks use the standard gates plus a
scripted HTTP + database harness, enumerated in [quickstart.md](./quickstart.md). They are real,
blocking tasks — not optional extras.

**Organization**: Tasks are grouped by user story. Note the honest caveat in
"Story independence caveat" below: the schema and contract change is one atomic step, so the stories
are incremental slices of *user-facing capability*, not independently deployable halves of the
migration.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Exact file paths are included in every task

## Path Conventions

Single Next.js application at repository root: `src/`, `prisma/`, `docs/`. No `tests/` directory
exists.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one new capability the feature needs and the shared constants both the parser
and the template depend on

- [X] T001 Add dependency `read-excel-file@9.3.10` to `dependencies` in `package.json` (runtime need, not dev-only) and refresh `package-lock.json`; then run `npm audit --omit=dev` and paste the result into the PR description as research.md R-001 requires — if it reports a vulnerability in this package or its tree, stop and re-open decision R-001
- [X] T002 [P] Create `src/lib/attendance.ts` exporting the shared, client-safe constants: `ATTENDANCE_TEMPLATE_HEADER = 'الاسم'`, `ATTENDEE_NAME_MAX_LENGTH = 200`, `MAX_ATTENDEE_NAMES = 1000`, `HEADCOUNT_MIN = 1`, `HEADCOUNT_MAX = 100000` — the template writer and the import parser MUST both read the header from here so they cannot drift (contracts/attendance-template-route.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, migration, data contract, read path and write path change together. Until
this phase is complete the application does not compile, because `attendeePractitionerIds` is
removed from the DTO.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Update `prisma/schema.prisma`: in `model TrainingAttendance` remove `practitionerId String?` and its `practitioner Practitioner? @relation(...)` line, and add `attendeeName String?`; in `model Practitioner` remove the `attendances TrainingAttendance[]` back-relation (data-model.md)
- [X] T004 Write `prisma/migrations/20260927000000_attendance_names/migration.sql` with these statements **in this order**: (1) `ALTER TABLE "TrainingAttendance" ADD COLUMN "attendeeName" TEXT;` (2) backfill `attendeeName` from the joined `"Practitioner"."name"` for every row where `"practitionerId" IS NOT NULL` (FR-016); (3) drop the foreign-key constraint then `DROP COLUMN "practitionerId"`; (4) add a CHECK constraint enforcing exactly one of `"attendeeName"` / `"headcount"` is non-null; (5) add a partial unique index on `"trainingId"` `WHERE "attendeeName" IS NULL` so a training can hold at most one headcount row. Steps 4–5 MUST follow step 2 or the backfilled rows violate the CHECK (research.md R-004)
- [X] T005 Run `npx prisma generate` and confirm the generated client in `src/generated/prisma` no longer exposes `practitionerId` on `TrainingAttendance`
- [X] T006 Update `TrainingDTO` in `src/lib/types.ts`: remove `attendeePractitionerIds: string[]` and add `attendeeNames: string[]` (ordered as stored, duplicates preserved); keep `attendeeCount: number` (data-model.md)
- [X] T007 Update `listTrainings` in `src/server/queries/trainings.ts`: select `attendeeName` and `headcount` per attendance row, map to `attendeeNames`, and derive `attendeeCount` as the number of name rows or the headcount value (FR-017); delete the `attendeePractitionerIds` derivation
- [X] T008 Rework attendance handling in `recordTrainingExecution` in `src/server/actions/trainings.ts` per contracts/attendance-actions.md §1: parse `mode` (`"names"` | `"headcount"`), `attendeeNames` (repeated field, each trimmed, 1–200 chars, at least 1, at most 1000, duplicates preserved) and `headcount` (integer 1–100000); delete the `practitionerIds` parsing and the same-hospital practitioner `count()` validation; explicitly reject a request that carries `practitionerIds` with an Arabic validation error (FR-005); keep the delete-then-insert replacement inside the existing transaction and keep the `logAudit()` call
- [X] T009 Stop loading practitioners for the attendance picker: remove the `listPractitioners` call and the `practitioners` prop from `src/app/(portal)/trainings/page.tsx`, and remove the prop from `TrainingsViewProps` in `src/components/views/TrainingsView.tsx` (research.md R-009; the `/assets` practitioner screen is unaffected)
- [X] T010 Rehearse the migration on a scratch database per quickstart.md §1: seed one practitioner-linked attendance row, run `npx prisma migrate deploy`, and confirm the name was backfilled, `practitionerId` is gone, an existing headcount row is untouched, and that a mixed row, an empty row, and a second headcount row are each rejected by the new constraints

**Checkpoint**: Schema, data contract, read path and write path are consistent; the app compiles and
headcount attendance still works end to end

---

## Phase 3: User Story 1 - Record named attendees by typing them (Priority: P1) 🎯 MVP

**Goal**: A coordinator types attendee names instead of selecting committee members, and the saved
record holds plain names with no practitioner reference

**Independent Test**: Open a training, add three typed names (one deliberately matching a registered
practitioner's name), save, reopen, and confirm the three names and a count of 3; then rename that
practitioner on `/assets` and confirm the attendance name is unchanged

- [X] T011 [US1] Replace the practitioner picker in the `ExecutionForm` component of `src/components/views/TrainingsView.tsx` with a named-attendee editor: a text input plus "add" action appending a row, each row individually removable, seeded from `training.attendeeNames`; enforce `maxLength={200}` and the 1000-name cap in the UI, and trim on add while rejecting an empty result
- [X] T012 [US1] Submit the named-attendee set from `ExecutionForm` in `src/components/views/TrainingsView.tsx`: append one `attendeeNames` field per row plus `mode="names"`, stop appending `practitionerIds`, and surface the action's Arabic error text through the existing `useActionRunner` alert path
- [X] T013 [US1] Show the saved attendance in the training detail panel of `src/components/views/TrainingsView.tsx`: list `attendeeNames` and display `attendeeCount`, replacing the "المحدد بالاسم: N ممارس" practitioner wording with attendee wording (Arabic/RTL, FR-020)
- [X] T014 [US1] Verify User Story 1 against a running build per quickstart.md §2, including the practitioner-rename independence check, and record the observed results; also time entering 5 names manually and record it against SC-002's 30-second target

**Checkpoint**: Named attendance works by manual entry alone — a complete, shippable slice

---

## Phase 4: User Story 2 - Bulk import attendees from an Excel file (Priority: P2)

**Goal**: A coordinator downloads a one-column template, uploads it filled, and sees how many rows
were imported and skipped

**Independent Test**: Download the template, fill 10 names with 2 blank rows interspersed, upload,
and confirm the summary reads 10 imported / 2 skipped with 10 removable names on the training

- [X] T015 [P] [US2] Create `src/server/attendance/import.ts` (starting with `import 'server-only'`) exporting a pure parse function that takes the uploaded file and returns `{ names, skipped }` per data-model.md's ImportSummary shape: read `.xlsx` via `read-excel-file/node` and `.csv` via a single-column reader (strip the UTF-8 BOM, split on `\r\n`/`\n`, unwrap one level of double quotes, take the first field); read only the first worksheet and first column; require the first cell to equal `ATTENDANCE_TEMPLATE_HEADER` from `src/lib/attendance.ts`; trim each name; classify empty/whitespace-only rows as `blank` and names over `ATTENDEE_NAME_MAX_LENGTH` as `tooLong` with their 1-based sheet row; populate `sheetName` with the worksheet actually read for `.xlsx` sources (omit for `.csv`) so the summary can state that only the first sheet was used; throw distinct Arabic errors for unsupported type, unopenable file, wrong/missing header, no names found, and more than `MAX_ATTENDEE_NAMES` names (research.md R-002, R-008)
- [X] T016 [P] [US2] Create `src/app/api/templates/attendance-names/route.ts` per contracts/attendance-template-route.md: require a session (401 without one), respond `200` with `text/csv; charset=utf-8`, `Content-Disposition` attachment plus RFC 5987 UTF-8 filename matching the existing file/KPI route convention, `Cache-Control: private, no-store`, and a body of `﻿` + `ATTENDANCE_TEMPLATE_HEADER` + newline
- [X] T017 [US2] Add `importAttendanceNames(formData)` to `src/server/actions/trainings.ts` per contracts/attendance-actions.md §2 (depends on T015): start with `requireActionUser()`, load the training with `{ id, ...hospitalScope(user) }` and fail not-found style when out of scope, parse the file in memory **without** writing to `UPLOADS_DIR` or creating a `StoredFile` row, then atomically replace the training's whole attendance set with the parsed names, write a `logAudit()` entry naming the imported count, and return the `ImportSummary` as the action's `data`
- [X] T018 [US2] Add the import UI to `ExecutionForm` in `src/components/views/TrainingsView.tsx`: an "استيراد من Excel" action opening a dialog with a template download link to `/api/templates/attendance-names`, a file input restricted to `.xlsx,.csv`, an 8 MB note, and a result panel rendering imported/skipped counts plus the per-reason breakdown with row numbers for `tooLong` rejections and, when `sheetName` is present, a line stating which worksheet was read; on success refresh the name list from the returned summary. Label the download so the format is explicit — e.g. "تنزيل القالب (CSV يفتح في Excel)" — so the "Excel" action name does not promise an `.xlsx` file
- [X] T019 [US2] Verify User Story 2 against a running build per quickstart.md §3, covering the four file-level rejections (unsupported type, wrong header, header-only sheet, over-limit sheet) and the per-row `tooLong` skip, confirming each rejection leaves existing attendance intact; confirm the multi-sheet case reports the worksheet read; and time both a 50-name import against SC-002's 2-minute target and a 1,000-name import against plan.md's 5-second parse-and-commit goal, recording all observed results

**Checkpoint**: Manual entry and bulk import both work; either alone is sufficient to record names

---

## Phase 5: User Story 3 - Keep headcount-only attendance, and keep the two modes exclusive (Priority: P3)

**Goal**: Headcount recording survives the change, and a training can never hold both a headcount
and names, with no surprising data loss when switching

**Independent Test**: Record a headcount of 50, confirm zero names; switch to named mode, confirm the
warning and that the headcount clears once names are saved; switch back and confirm the reverse

- [X] T020 [US3] Add the attendance mode toggle to `ExecutionForm` in `src/components/views/TrainingsView.tsx`: a names/headcount selector that shows only the active mode's inputs, initialised from the training's current mode, with a confirmation before switching away from a mode that already holds data stating exactly what will be discarded (FR-015)
- [X] T021 [US3] Complete the mode validation in `recordTrainingExecution` in `src/server/actions/trainings.ts` (same file as T008, so not parallel): refuse with distinct Arabic messages when neither names nor a headcount is supplied, and when both are supplied (FR-001, spec User Story 3 scenario 4)
- [X] T022 [US3] Verify User Story 3 against a running build per quickstart.md §4, including the neither-supplied refusal and both directions of the mode switch, and record the observed results

**Checkpoint**: All three user stories independently functional; attendance is unambiguous by
construction

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T023 [P] Reword the misleading practitioner label "متاح للربط بالتدريبات المعتمدة" in `src/components/views/AssetsView.tsx`, which becomes false once attendance no longer links to practitioners (spec Dependencies item 7)
- [X] T024 [P] Update `docs/CLAUDE_REFERENCE.md`: describe `TrainingAttendance.attendeeName` and the name-xor-headcount invariant in §5, and note the import path in §3 (parsed in memory, never stored) — deviation D-001 in §8 is already recorded and needs no change
- [X] T025 Run the security verification harness per quickstart.md §5: cross-hospital `recordTrainingExecution` and `importAttendanceNames` rejections each paired with a same-hospital positive control, the `practitionerIds` rejection, both actions with no session, and the template route returning 401 unauthenticated — a refusal without its positive control does not count as evidence (constitution Principle V). Also assert the concurrency edge case: two overlapping saves for one training leave exactly one complete attendance set (last write wins), never a merged or partial one
- [X] T026 Run the data assertions in quickstart.md §6 against the scratch database: `practitionerId` absent from `TrainingAttendance`, zero rows violating name-xor-headcount, no training mixing modes, an `AuditLog` entry per attendance change, and dashboard/list counts matching stored attendance (SC-005)
- [X] T027 Run the gates and record their output: `npm run typecheck`, `npm run lint`, `npm run build` (constitution Principle V). Run `npm run typecheck` continuously from Phase 2 onward — the DTO change in T006 breaks compilation until T007–T009 land, so this task is the recorded final evidence, not the first time the gates are run
- [ ] T028 Apply `20260927000000_attendance_names` to Neon with `npx prisma migrate deploy` **only after T010, T025, T026 and T027 pass**, and only with explicit owner approval, since it is a schema change against live data (constitution: production data constraint). The prerequisite `20260920000000_stored_file_disk_path` is already applied, so this is the only pending migration. It MUST be applied **before** the code that reads `attendeeName` is deployed, per the constitution's migration rule — deploying first leaves production querying a column that does not exist
- [ ] T029 Hand the SRS amendment back to the product owner: FR-21 and FR-26 still read the old practitioner-linked wording in `docs/SRS_IPC_Management_Portal_Neon.md`; D-001 governs until they are updated (spec Dependencies item 1)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: needs T002 for the shared constants; blocks every user story
- **User Stories (Phase 3–5)**: all depend on Phase 2 completing
- **Polish (Phase 6)**: T023/T024 any time after Phase 2; T025–T027 after the stories being shipped are done; T028 last

### Story independence caveat (read this)

The stories are independently *testable* and can ship in sequence, but they are not independently
deployable slices of the schema change. Dropping `practitionerId` removes `attendeePractitionerIds`
from the DTO, which forces the query, action and view edits in the same change — otherwise the build
fails. Phase 2 is therefore unusually heavy, and Phase 2 + Phase 3 together are the smallest
shippable unit.

### Within each user story

- Server contract before UI that calls it (T015 → T017 → T018)
- Shared constants before the parser and template that read them (T002 → T015, T016)
- Verification task last in each story

### Parallel Opportunities

- T002 runs alongside T001
- T015 and T016 touch different files and can run together
- T023 and T024 are documentation/copy and run alongside anything in Phase 6
- T008 and T021 edit the same file and MUST NOT be parallelised; likewise T011, T012, T013, T018 and
  T020 all edit `TrainingsView.tsx` and must be sequential

## Parallel Example: User Story 2

```bash
# Different files, no shared state — safe together:
Task: "Create src/server/attendance/import.ts parser (T015)"
Task: "Create src/app/api/templates/attendance-names/route.ts (T016)"
```

## Implementation Strategy

### MVP (recommended scope)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 User Story 1
2. **STOP and VALIDATE**: quickstart.md §2 plus the §5 security checks for `recordTrainingExecution`
3. This already delivers the correction that motivated the feature: attendance stops
   misrepresenting committee members as attendees

### Incremental delivery

1. Setup + Foundational → schema and contracts consistent, headcount attendance still working
2. Add US1 → manual named entry → validate → ship (MVP)
3. Add US2 → bulk import → validate → ship
4. Add US3 → mode toggle and exclusivity guarantees → validate → ship
5. Polish, then T028 migration to Neon with owner approval

### Parallel team strategy

After Phase 2, one developer can take US2's server side (T015–T017) while another takes the
`TrainingsView` work for US1 (T011–T013), since only US2's T018 touches the shared view file.

## Notes

- 29 tasks: 2 setup, 8 foundational, 4 + 5 + 3 across the three stories, 7 polish
- `[P]` means different files and no dependency on unfinished work
- Verification tasks (T010, T014, T019, T022, T025, T026, T027) are blocking, not optional — the
  repository has no test suite to fall back on
- T028 touches production data and needs explicit approval before it runs
- Commit after each task or logical group; stop at any checkpoint to validate a story on its own
