# Implementation Plan: Training Attendance Without Practitioner Linkage

**Branch**: `001-training-attendance-names` (spec directory; work is on `main`) | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-training-attendance-names/spec.md`

## Summary

Training attendance stops referencing `Practitioner`. Each training's attendance becomes exactly
one of a single headcount row or a set of rows carrying a plain attendee name. Names are entered
one at a time, or bulk-imported from a one-column spreadsheet ("الاسم") with a downloadable
template and an imported/skipped summary.

Technical approach: replace `TrainingAttendance.practitionerId` with a nullable `attendeeName`
text column in a migration that first backfills the practitioner's name into it (no production
rows are affected — see Technical Context), then drops the column and relation. Database integrity
is tightened with a CHECK constraint (a row is a name **xor** a headcount) and a partial unique
index (at most one headcount row per training). The import runs entirely server-side in a Server
Action: the uploaded file is parsed in memory and discarded, never written to `UPLOADS_DIR` and
never stored. Spreadsheet reading is added via one focused dependency; the template is served as
UTF-8-BOM CSV by a route handler, reusing the CSV conventions already used by the KPI export, so
no spreadsheet *writer* is needed.

## Technical Context

**Language/Version**: TypeScript ~5.8 on Node >=20.9 (repo `engines`)

**Primary Dependencies**: Next.js 16.3.5 (App Router, Server Actions), React 19.3, Prisma 7.10 +
`@prisma/adapter-pg`, zod 4.6, Tailwind 4. **New**: `read-excel-file` 9.3.10 (MIT) for `.xlsx`
parsing — see [research.md](./research.md) decision R-001.

**Storage**: PostgreSQL (Neon). Import files are parsed in memory and never persisted; the
existing on-disk `UPLOADS_DIR` store is untouched by this feature.

**Testing**: No automated test framework exists in this repository (0 test files, no CI). Per
constitution Principle V, verification is a scripted HTTP + database harness plus the standard
gates (`npm run typecheck`, `npm run lint`, `npm run build`). Scenarios are enumerated in
[quickstart.md](./quickstart.md).

**Target Platform**: Node standalone server behind IIS `httpPlatformHandler` (SmarterASP.NET);
Arabic/RTL browser UI.

**Project Type**: Single Next.js web application (no separate frontend/backend).

**Performance Goals**: A 1,000-name import parses and commits in under 5 seconds; training list
and detail screens keep their current load characteristics (attendance is read with the training).

**Constraints**: Server Action body limit 9 MB (`next.config.ts`); per-training attendee cap
1,000 names; attendee name ≤ 200 characters; import file never written to disk; all new copy in
Arabic/RTL.

**Scale/Scope**: 2 hospitals and 2 trainings in production today; 1 attendance row (headcount 50)
and **0 practitioner-linked rows**, so the backfill step is a safeguard for other environments
rather than a production data change. Touches 1 schema model, 1 migration, 3 server modules, 1
DTO, 1 client screen, 1 new route handler, and 1 misleading label elsewhere.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Server-Only Data Access | Spreadsheet parsing and template generation live only under `src/server/**` / route handler; the parser is never imported by a `'use client'` module; no file bytes or DB access reach the client | **PASS** (design) |
| II. Layered Server-Side Authorization | Both attendance actions begin with `requireActionUser()`, load the training via `{ id, ...hospitalScope(user) }`, and reject cross-hospital targets with a not-found error; the template route requires a session | **PASS** (design) |
| III. No Backdoors, No Fabricated Data | No seed or sample attendee names; the import summary reports actual parsed counts; attendee count is derived from stored rows, never entered separately | **PASS** (design) |
| IV. Spec-Anchored Scope | SRS FR-21/FR-26 mandate the linkage being removed. Deviation recorded as **D-001** in `docs/CLAUDE_REFERENCE.md` §8; the SRS document itself is still unedited and flagged for manual update | **PASS with recorded deviation** |
| V. Evidence Before Done | Gates plus a negative/positive-control pair for cross-hospital import and for the practitioner-reference rejection; migration rehearsed on a scratch database before any production run | **PASS** (planned, see quickstart.md) |
| Constraint: audit trail | Both attendance writes call `logAudit()` inside the same transaction | **PASS** (design) |
| Constraint: uploads | Import files are parsed in memory and discarded, so the upload allowlist and magic-byte checks for *stored* files remain unchanged and unweakened | **PASS** (design) |
| Constraint: migrations | Migration committed with the schema change and applied before the dependent code deploys | **PASS** (planned) |
| Constraint: Arabic/RTL | Template header, all new labels, summaries and errors are Arabic | **PASS** (design) |

**Blocking prerequisite (not caused by this feature)**: migration
`20260920000000_stored_file_disk_path` is committed but not yet applied to Neon. Applying this
feature's migration to that database will stack on top of it, so that one must be applied first —
otherwise `prisma migrate deploy` will run both at once against a database whose code expectations
already diverge. Flag before any production migration.

**Post-Phase-1 re-check**: no new violations. One dependency is added; justified in Complexity
Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-training-attendance-names/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── attendance-actions.md
│   └── attendance-template-route.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                                  # TrainingAttendance: -practitionerId +attendeeName;
│                                                  # Practitioner: -attendances relation
└── migrations/
    └── 20260927000000_attendance_names/           # NEW: backfill → drop column → CHECK + partial unique index
        └── migration.sql

src/
├── lib/
│   └── types.ts                                   # TrainingDTO: -attendeePractitionerIds +attendeeNames
├── server/
│   ├── attendance/
│   │   └── import.ts                              # NEW: parse .xlsx/.csv → { names, skipped } (server-only)
│   ├── queries/
│   │   └── trainings.ts                           # read attendeeName/headcount; derive attendeeCount
│   └── actions/
│       └── trainings.ts                           # recordTrainingExecution (names|headcount);
│                                                  # NEW importAttendanceNames (FormData → ImportSummary)
├── app/
│   ├── api/templates/attendance-names/route.ts    # NEW: GET CSV template (UTF-8 BOM, header "الاسم")
│   └── (portal)/trainings/page.tsx                # stop loading practitioners for the picker
└── components/views/
    ├── TrainingsView.tsx                          # replace picker with name rows + import dialog + summary
    └── AssetsView.tsx                             # reword "متاح للربط بالتدريبات المعتمدة"

docs/
└── CLAUDE_REFERENCE.md                            # §8 D-001 (done); update §5 data-model notes
```

**Structure Decision**: The existing single-application layout is kept. Import parsing goes in a
new `src/server/attendance/` module rather than inside the action file, so the pure
parse-and-classify logic is separable from the transaction and can be exercised directly by the
verification harness; it carries `import 'server-only'` like every other module under
`src/server/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New runtime dependency `read-excel-file` | `.xlsx` is a ZIP of XML; the spec requires reading real Excel files (FR-011) and the repo has no spreadsheet capability | Hand-rolling a ZIP+XML reader is far more code and risk than a 2.5 MB focused library. `exceljs` (22 MB, 9 deps incl. `archiver`/`unzipper`) was rejected as oversized for one text column, and `xlsx`/SheetJS was rejected because the npm-published 0.18.5 carries unpatched advisories (research.md R-001) |
| Raw SQL in the migration beyond Prisma's model (CHECK + partial unique index) | Prisma's schema language cannot express "name xor headcount" or "at most one headcount row per training"; these are the feature's core data invariants (FR-001) | Enforcing only in application code would let a future code path or manual SQL create a mixed record, which is exactly the ambiguity this feature removes |
