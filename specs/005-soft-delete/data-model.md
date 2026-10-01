# Phase 1 Data Model: Soft Delete Across All Modules

**Feature**: `005-soft-delete` | **Date**: 2026-09-30

## Schema change: yes — the first broad one since the initial migration

Every in-scope model gains two nullable columns. No existing column changes type or meaning; no
existing relation's `onDelete` behavior changes (those still govern real hard deletes, which this
feature does not introduce — see Assumptions in `spec.md`). One migration, committed to
`prisma/migrations/`, applied before any code depending on it deploys, per the constitution's
migration rule.

### New columns, on all eleven in-scope models

| Column | Type | Meaning |
|---|---|---|
| `deletedAt` | `DateTime?` | `null` = active (the overwhelming majority of rows, forever, for most models). Non-null = removed at this timestamp. The one column the read-filtering extension (research.md R-001) predicates on. |
| `deletionEventId` | `String?` | `null` when active, or when removed independently (not as part of a cascade). Set to a fresh id shared by every record removed together in one delete action (research.md R-002) — a Hospital and everything cascaded with it, or a Program folder and its entire nested contents. This is what makes restoring a parent bring back *exactly* what was removed with it. |

Applies to: `Hospital`, `Visit`, `Training`, `TrainingTemplate`, `Practitioner`, `Equipment`,
`Policy`, `OrgDocument`, `DocumentCenterFile`, `Program`, `ProgramFolder`, and `User`.

**Not changed**: `AuditLog` (permanent by existing rule, spec FR-015), and every pure child/join
row — `VisitAttachment`, `VisitResponse`, `TrainingAttachment`, `TrainingAttendance`,
`ProgramFile`. These are hidden via their parent's `deletedAt` through the relation, not given
their own column — `ProgramFile` is the one partial exception, see below.

**`ProgramFile` gets `deletedAt`/`deletionEventId` too**, despite being a "child" row, because a
Program File can be deleted *on its own* (spec User Story 5, Edge Cases: "a file deep inside a
folder, not the folder itself") as well as cascaded with its folder or program. Every other child
row in the exclusion list above is never independently deletable through this feature's user
stories, so it needs no marker of its own.

### Identity constraints changed on `User` — revised during implementation, see research.md R-005

| Field | Change |
|---|---|
| `email` | `@unique` removed from `schema.prisma`; replaced by a partial unique index in the migration (`WHERE "deletedAt" IS NULL`). `auth.ts`'s login lookup moves from `findUnique` to `findFirst`. |
| `hospitalId` | **Unchanged** — stays `String? @unique`, preserving the `Hospital.coordinator User?` one-to-one relation exactly as it is today. Freeing a deleted coordinator's hospital slot is handled by `addCoordinator` clearing the old occupant's `hospitalId` to `null` at the moment a replacement is actually created, not by a schema-level mechanism. |

Effect: a soft-deleted coordinator's email is reusable immediately (partial index); their hospital
slot is reusable the moment a new coordinator is actually created for that hospital (application
logic in `addCoordinator`) — both satisfy spec FR-013/SC-006 without restoring or otherwise
touching the old row, and without changing the shape of any existing read.

### `AuditEntity` type, extended (not a schema change — `src/server/audit.ts`)

Adds `'TrainingTemplate'` and `'ProgramFolder'` to the existing closed union (research.md R-006).
`'Document'` already covers `OrgDocument`/`DocumentCenterFile`'s audit entries the same way it
does for their existing upload actions.

## Cascade groups

Which models cascade together under one `deletionEventId` when their common ancestor is deleted,
per spec User Stories 4 and 5:

| Deleting this... | ...cascades to | ...except |
|---|---|---|
| `Hospital` | its coordinator `User`, every `Visit`, `Training`, `Practitioner`, `Equipment` row scoped to it | any `Visit` with `status: 'completed'` — left untouched, per the immutability rule (spec FR-008, FR-009) |
| `Program` | every `ProgramFolder` and `ProgramFile` it contains, at any depth | nothing |
| `ProgramFolder` | every subfolder and file nested inside it, at any depth (its own subtree only — not sibling folders, not the parent `Program` itself) | nothing |

Everything else in scope (`Visit`, `Training`, `TrainingTemplate`, `Practitioner`, `Equipment`,
`Policy`, `OrgDocument`, `DocumentCenterFile`, `User`/coordinator, and a `ProgramFile` deleted on
its own) is a leaf delete: sets its own `deletedAt`, leaves `deletionEventId` null (or, if it is
itself the *cause* of no further cascade, simply doesn't generate one to share).

**Deliberate non-cascade, called out because it could be assumed otherwise**: deleting a
`TrainingTemplate` does **not** cascade to the `Training` rows created from it (spec FR-012,
Assumptions) — those remain independent, permanent historical records regardless of whether the
template that originated them still exists.

## State transitions

| Model | New states this feature introduces |
|---|---|
| every in-scope model | **active** (`deletedAt: null`) → **removed** (`deletedAt` set, `deletionEventId` set only if cascaded) → **active** again via restore (both columns cleared together for every row sharing the same `deletionEventId`, or just the one row if it was removed independently) |
| `Visit` specifically | **completed** is a terminal state with respect to this feature: a completed visit cannot enter **removed** by any path (spec FR-008). Every other status (`in_progress`) can. |

No existing state transition (Visit `in_progress` → `completed`, Training `pending` → `late` →
`completed`, Hospital `isActive` toggle) changes shape or meaning. `isActive` remains a separate,
narrower mechanism (login-disable only) from a Hospital's own `deletedAt` — deleting a Hospital
cascades to disable its coordinator's login via the coordinator's own `deletedAt` (spec FR-009),
not by touching `isActive`.

## Migration shape

One migration directory, e.g. `prisma/migrations/<timestamp>_soft_delete/`:

1. `ALTER TABLE` adding `deletedAt` (nullable, no default) and `deletionEventId` (nullable, no
   default) to the thirteen tables listed above (eleven in-scope models plus `ProgramFile`; `User`
   included).
2. `DROP` the existing plain unique constraint backing `User.email` only; `CREATE UNIQUE INDEX ...
   WHERE "deletedAt" IS NULL` in its place, raw SQL inside the migration (research.md R-005).
   `User.hospitalId`'s existing unique constraint is **not** touched — see R-005 for why removing
   it was rejected mid-implementation.
3. No data backfill needed — every existing row's `deletedAt`/`deletionEventId` is correctly
   `null` (active, not part of any cascade) by simply being nullable columns with no default.

No `prisma/seed.ts` or fixture changes — constitution Principle III already forbids the app
shipping any seed/demo/sample row, and this feature adds no exception to that.
