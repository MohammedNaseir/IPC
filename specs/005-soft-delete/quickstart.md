# Quickstart: validating Soft Delete Across All Modules

**Feature**: `005-soft-delete` | **Date**: 2026-09-30

How to bring the environment up and prove each story works. No test framework is installed and
none is added — verification is a real build against a real database, driven through a real
browser (research.md R-009), the same harness used for the last three features.

## Prerequisites

- Node 20, already installed; `node_modules` present.
- The scratch PostgreSQL and CDP harness in the session scratchpad under `scratchpad/pgtest/`.
- **Never point this at the Neon database.** A schema migration is part of this feature — it must
  run against the scratch instance only.

## Bring the environment up

```bash
# 1. scratch PostgreSQL (port 54341)
cd <scratchpad>/pgtest && node start.mjs     # wait for READY

# 2. apply the migration
cd <repo> && npx prisma migrate deploy       # or `migrate dev` if iterating

# 3. build and serve the app
npm run build
source <scratchpad>/pgtest/env.sh && npm run start   # 127.0.0.1:38141
```

Accounts: `central@test.local` (central) and `coord.a@test.local` (hospital coordinator).
Passwords are in `scratchpad/pgtest/secrets.json`.

## Gates — run for every story, before calling it done

```bash
npm run typecheck && npm run lint && npm run build
```

Constitution Principle V: a story is not done until these pass, both a refused and an equivalent
allowed request have been observed for every permission boundary it touches, and the claim states
what was verified and what was not. Stop the server before rebuilding — it locks
`.next/standalone` on Windows.

## Foundation — before any story

The extension (research.md R-001) and the migration (data-model.md) land first and get their own
proof before any story depends on them:

- Confirm the migration applies cleanly to a fresh scratch database and `prisma generate` succeeds.
- Pick one in-scope model (Practitioner) and confirm, directly against the database (the raw Prisma
  call, not a new action, to prove the extension itself is what's doing this): creating a row
  leaves `deletedAt`/`deletionEventId` null; calling `prisma.practitioner.delete()` **throws**
  rather than removing the row or silently soft-deleting it (research.md R-001 — refusal, not
  redirection); the row is unchanged afterward; a real soft delete via `prisma.practitioner.update({
  data: { deletedAt: new Date() } })` succeeds; a subsequent `prisma.practitioner.findMany()`
  excludes it; the row is still present via `prismaUnfiltered`.
- Confirm a direct `prisma.visit.update({ where: { id }, data: { deletedAt: new Date() } })` on a
  `status: 'completed'` visit throws, proving R-004's extension-level enforcement independent of
  any action code.

## Per-story validation

### User Story 1 — Practitioners and Equipment

Create a practitioner (or equipment record) as a hospital coordinator. Delete it; confirm it
disappears from the roster and from any count that included it. Attempt to delete a record
belonging to a different hospital by id (negative control); confirm refusal. As central, delete a
record from any hospital (positive control for the broader permission). Restore it as central from
the trash view; confirm every field matches the original.

### User Story 2 — Policies, Org Documents, Document Center

Upload one of each. Delete each as central; confirm it disappears from its library. Attempt the
same as a hospital coordinator (negative control); confirm refusal. Restore each; confirm the
file, category and version are unchanged.

### User Story 3 — Visits and Trainings, and the completed-Visit exception

Delete an in-progress visit and a pending training; confirm both disappear and restore correctly.
Mark a visit completed, then:
- Confirm no delete control is rendered anywhere for it, as either role.
- Attempt the underlying action directly against its id (bypassing the missing UI control);
  confirm refusal, with no change to the row.

### User Story 4 — Hospitals (cascade)

Seed a hospital with a practitioner, a piece of equipment, an in-progress visit, and a completed
visit. Delete the hospital as central. Confirm: the hospital, its coordinator's login, the
practitioner, the equipment, and the in-progress visit are all hidden; the completed visit is
**still fully visible**, unaffected. Attempt sign-in as the deleted coordinator (negative control).
Restore the hospital; confirm exactly the cascaded set returns — separately, delete a different
practitioner at that same hospital *independently* before restoring, and confirm restoring the
hospital does not bring that one back.

### User Story 5 — Program folders (cascade)

Create a folder containing a subfolder and a file. Delete the top folder; confirm the whole branch
disappears. Restore it; confirm the whole branch reappears intact, same structure. Separately,
delete one file inside an otherwise-untouched folder and confirm only that file is affected.

### User Story 6 — Training Templates and Coordinator accounts

Delete a training template that has trainings already created from it; confirm those trainings are
completely unaffected. Delete a coordinator account; confirm sign-in fails. Create a new
coordinator for that same hospital using the deleted account's email, without restoring it first;
confirm it succeeds. Attempt to delete the acting central user's own account, and attempt to
delete the last remaining central account (two negative controls); confirm both refused.

## Whole-feature checks

| Check | How |
|---|---|
| Scope boundary | `git diff --name-only -- prisma src/server` — everything touched should trace to this feature's actions/extension/migration, nothing unrelated |
| No leaked deleted records (R-001's core guarantee) | Every existing list, dashboard count, search and export re-checked with at least one soft-deleted row of each type present in the database — confirmed absent everywhere, not just in the modules this feature directly adds a delete action to |
| Audit trail | One `AuditLog` row per delete and per restore, actor and timestamp correct, verified by count |
| Contrast/focus/no-scroll (SC-005/SC-006 style, from the shared table/dialog conventions this feature reuses) | Same harness as `specs/004-portal-ui-overhaul` — new UI (delete confirmations, restore buttons, the trash view) re-measured the same way |
| Render budget | Warm-database timings on affected list screens compared to the `specs/004-portal-ui-overhaul` baseline; the extension's added `WHERE deletedAt IS NULL` predicate should be immeasurable |

## Tear down

Stop the app server, then the scratch PostgreSQL. On Windows the server holds `.next/standalone`;
stop it before any rebuild.
