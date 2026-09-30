# Phase 1 Data Model: Portal UI Overhaul

**Feature**: `004-portal-ui-overhaul` | **Date**: 2026-09-29

## Schema change: none

`prisma/schema.prisma` and `prisma/migrations/**` are untouched by all eight items. SC-011 asserts this. No entity is added, removed or altered; no migration is written.

Seven of the eight items do not reach the data layer at all. Item 1 changes **what an existing write produces**, not what can be stored.

---

## Affected entity: `Training`

Unchanged in shape:

| Field | Type | Note |
|---|---|---|
| `id` | `String` | cuid |
| `templateId` | `String?` | **null for an internal training** — this is what makes it internal (`isInternal: t.templateId === null`) |
| `hospitalId` | `String` | scoped |
| `title` | `String` | |
| `description` | `String` | |
| `deliveredBy` | `String?` | |
| `date` | `DateTime?` | execution date, supplied by the creation form |
| `notes` | `String?` | |
| `status` | `TrainingStatus` | `pending` \| `completed`, default `pending` |
| `createdAt` | `DateTime` | |

### State transition changed by item 1

| | Before | After |
|---|---|---|
| Status on creation of an internal training | `completed` | **`pending`** |
| Attendance rows written on creation | one `TrainingAttendance` carrying `headcount` | **none** |
| How attendance is eventually recorded | fixed at creation, from a form field | on the training record page, via the existing execution form, as names **or** a total |

No other transition changes. Central-template trainings are unaffected — they already begin `pending` and complete through the same execution form.

### Derived status — unchanged, and the reason item 1 has a known gap

`deriveTrainingStatus(stored, dueDate, now)` returns `late` when a non-completed training's `dueDate` has passed. `dueDate` lives on **`TrainingTemplate`**, and the query reads `t.template?.dueDate ?? null`.

An internal training has `templateId = null`, therefore `dueDate = null`, therefore it can **never** derive `late`. The overdue reminder in `src/app/api/cron/notifications/route.ts` filters on `template: { dueDate: { lt: now } }` — an inner join a template-less training cannot satisfy — so it can never raise a reminder either.

**Consequence, accepted by owner decision D1**: a pending internal training appears in the dashboard's pending count, has no deadline, and nothing will ever chase it. Recorded here because it is a property of the data model, not of the UI.

---

## Affected entity: `TrainingAttendance`

Unchanged in shape and unchanged in rules. Item 1 changes only whether a row exists at creation time.

| Field | Type | Note |
|---|---|---|
| `id` | `String` | cuid |
| `trainingId` | `String` | cascade delete with its training |
| `attendeeName` | `String?` | exclusive with `headcount` |
| `headcount` | `Int?` | exclusive with `attendeeName` |

**Invariants that must survive item 1** (FR-040):

- A row is **one named attendee XOR one total**, never both and never neither. Enforced by a database `CHECK` in migration `20260927000000_attendance_names`.
- At most **one** headcount row per training, enforced by a partial unique index.
- Attendance carries **no reference to `Practitioner`**; a matching name is a coincidence (deviation D-001 in `docs/CLAUDE_REFERENCE.md` §8).
- Shared bounds stay in force for the record page's execution form: `HEADCOUNT_MIN = 1`, `HEADCOUNT_MAX = 100_000`, `MAX_ATTENDEE_NAMES = 1000`, `ATTENDEE_NAME_MAX_LENGTH = 200`.

**Verified**: the `CHECK` constraint is **per row**. Nothing requires a training to have any attendance row, so creating a training with zero attendance is schema-valid. The problem with the alternative — keeping `status: 'completed'` — was semantic, not structural.

---

## Derived value: `attendeeCount`

This is the trap item 1 must not fall into. The same name means two different things:

| Where | What it is | Item 1 |
|---|---|---|
| `internalTrainingSchema.attendeeCount` in `src/server/actions/trainings.ts` | **Input**, supplied by the creation form | **REMOVED** |
| `internalCount` state, its input, and the value passed to the action in `TrainingsView.tsx` | **Input**, the form field itself | **REMOVED** |
| `TrainingDTO.attendeeCount` in `src/lib/types.ts` | **Derived output** | **KEPT** |
| `attendeeNames.length + headcount` in `src/server/queries/trainings.ts` | The derivation, from real attendance rows | **KEPT** |
| The trainings-list column and the record page's attendee figure | Consumers of the derived value | **KEPT** |

Removing the derived value or its consumers is exactly the "affects other screens" failure the brief warned against. FR-040 forbids it; SC-014 verifies it by comparing reported figures before and after for trainings that already have attendance.

---

## Entities introduced: none

The notification and confirmation work (item 3) persists nothing. A dialog is a presentation concern with no stored state, no audit entry of its own, and no entity.

The supplied logo is a static asset at `public/ipc-hail-logo.jpg`, not a database record.
