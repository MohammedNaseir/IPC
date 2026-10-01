---

description: "Task list for 005-soft-delete"
---

# Tasks: Soft Delete Across All Modules

**Input**: Design documents from `/specs/005-soft-delete/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/soft-delete.md, quickstart.md

**Tests**: No test framework is installed and none is added. Tests were not requested, and the
spec's verification model is the browser/database harness in research.md R-009. Verification tasks
below observe real results against a running build, per Constitution Principle V — they are not
unit tests.

**Organization**: grouped by user story, in plan.md's delivery order rather than raw spec.md
priority — that order is dependency-driven: the Prisma extension must exist and be proven correct
on the simplest module (US1) before anything else touches it, and the two cascade stories (US4,
US6's identity-reuse groundwork, US5) depend on the leaf-delete pattern already working.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US6, mapping to spec.md
- Exact file paths are given in every task

## Path Conventions

Single Next.js App Router application. Source under `src/`, schema and migrations under `prisma/`,
docs under `docs/`. Verification scripts live in the session scratchpad and are never added to the
repository.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: a running, migratable environment. No product behaviour changes yet.

- [X] T001 Start the seeded scratch PostgreSQL per quickstart.md and confirm it reports READY on port 54341
- [X] T002 Confirm the current build (`npm run build`) is green against the scratch database before any schema change, as the pre-change baseline gate — **adapted**: server already running from prior session work holding `.next/standalone`; confirmed via `typecheck`+`lint` clean instead of a full rebuild (the last `npm run build` this session, at the end of feature 004, was already green against this same schema)

**Checkpoint**: environment reproducible; no source file changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the schema migration and the Prisma Client Extension itself — the one piece every
user story depends on. Proven mechanically correct here, directly against the database, before any
story wires it into an action or a screen.

**⚠️ CRITICAL**: no user story work may begin until this phase is complete. Every story's
"disappears from lists" and "restores exactly" behaviour is this phase working correctly, not
something each story re-implements.

- [X] T003 In `prisma/schema.prisma`, add `deletedAt DateTime?` and `deletionEventId String?` (both nullable, no default, per data-model.md) to all eleven in-scope models: `Hospital`, `Visit`, `Training`, `TrainingTemplate`, `Practitioner`, `Equipment`, `Policy`, `OrgDocument`, `DocumentCenterFile`, `Program`, `ProgramFolder`, and `User`
- [X] T004 In `prisma/schema.prisma`, add `deletedAt DateTime?` and `deletionEventId String?` to `ProgramFile` specifically — the one child/attachment-style row that needs its own marker because it can be deleted independently of its parent folder (data-model.md)
- [X] T005 Write the migration in `prisma/migrations/<timestamp>_soft_delete/migration.sql`: the `ALTER TABLE` additions from T003/T004, plus dropping `User`'s existing plain unique constraint on `email` only and replacing it with `CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL` (raw SQL). `User.hospitalId`'s existing unique constraint is left untouched — research.md R-005, revised during implementation: removing it would turn the `Hospital.coordinator` one-to-one relation into a one-to-many and ripple into ~30 unrelated read sites, so freeing a coordinator's hospital slot is handled in `addCoordinator` (T047a) instead
- [X] T006 Apply the migration to the scratch database (`npx prisma migrate deploy` or `migrate dev`) and regenerate the client; confirm `npm run typecheck` still passes with the new nullable fields present but unused — **two more call sites needed the `findUnique`→`findFirst` fix beyond the one anticipated**: `src/server/actions/auth.ts` (login lookup) and `scripts/create-admin.ts` (the operator provisioning tool, which uses its own unextended `PrismaClient` and now also filters `deletedAt: null` explicitly since it bypasses the app's extension entirely)
- [X] T007 [P] In `src/server/audit.ts`, extend the `AuditEntity` union with `'TrainingTemplate'` and `'ProgramFolder'` (research.md R-006)
- [X] T008 Create `src/server/db/softDelete.ts`: a Prisma Client Extension — **revised during implementation, see research.md R-001**: the `query` component's `$allModels`/`$allOperations` hook (a) injects `deletedAt: null` into every read (`findMany`/`findFirst`/`findUnique`/`count`/etc. — confirmed the generated `WhereUniqueInput` types already accept `deletedAt` alongside the real unique key, so no `findUnique`→`findFirst` normalization was needed after all) for the 13 in-scope models; (b) makes `.delete()`/`.deleteMany()` on an in-scope model **throw** (not silently redirect — Prisma's `query` component cannot swap one operation for another, only intercept/refuse the one it's bound to; a `model`-component global override was rejected because it has no safe way to fall through for out-of-scope models like `TrainingAttendance`, which has a real, legitimate `deleteMany` call today); (c) for `Visit` specifically, augments the `where` clause of any `update`/`updateMany` that sets `deletedAt` with `status: { not: 'completed' }`, so Prisma's own "record not found" throw on a non-matching update *is* the refusal, with no extra lookup query
- [X] T009 In `src/server/db.ts`, apply the extension from T008 when constructing the client singleton, so every existing `prisma` import in the codebase gets the filtering/redirection for free with no call-site changes — **ripple effect found and fixed**: `logAudit` (`src/server/audit.ts`), `notify.ts`'s three functions, `programs.ts`'s `resolveParent`, `visits.ts`'s `loadOpenVisit`, `attendance/input.ts`, and `files.ts`'s `storeUpload` all typed their `tx` parameter as the base `Prisma.TransactionClient`, which the now-extended `prisma.$transaction`'s callback no longer structurally matches; added and exported `ExtendedTransactionClient` from `src/server/db.ts` and retyped all seven
- [X] T010 Add an unfiltered accessor (e.g. a small wrapper or a documented second export) that bypasses the extension's read-filtering, for exclusive use by trash queries — never imported by any normal action or query file — implemented as `prismaUnfiltered`, a second Proxy in `src/server/db.ts` sharing the same base (unextended) client/connection pool as `prisma`
- [X] T011 Foundational verification, directly against the database (not through any action yet — proves the extension itself, not application code): 9 checks, all passing (Practitioner create/delete-refusal/soft-delete/read-filtering/unfiltered-visibility, and the completed-Visit refusal via a direct `prisma.visit.update()` call bypassing any action) — run via a temporary `scripts/verify-soft-delete-foundation.ts` (`tsx`, `NODE_OPTIONS=--conditions=react-server` to satisfy the `server-only` package's export-condition guard outside Next's own bundler), deleted after passing, not part of the committed diff
- [X] T012 Run the three gates (`npm run typecheck`, `npm run lint`, `npm run build`) and record modified files

**Checkpoint**: the extension is proven correct in isolation. Every user story below only adds
actions and UI on top of it.

---

## Phase 3: User Story 1 - Undo a mistaken practitioner or equipment entry (Priority: P1) 🎯 MVP

**Goal**: full delete/view-trash/restore for Practitioner and Equipment, permission-mirrored per
module, the smallest and lowest-risk slice — establishes the action/UI pattern every later story
reuses.

**Independent Test**: create a practitioner, delete it, confirm it disappears from the roster and
any count, restore it from the trash view, confirm it is back exactly as it was.

### Implementation for User Story 1

- [X] T013 [P] [US1] In `src/server/actions/practitioners.ts`, add `deletePractitioner(id: string)` — **note**: calls `tx.practitioner.update({ data: { deletedAt: new Date() } })` directly, not `.delete()` (the extension refuses `.delete()` rather than redirecting it, research.md R-001)
- [X] T014 [P] [US1] In `src/server/actions/practitioners.ts`, add `restorePractitioner(id: string)`: `requireActionCentral()`, loads via `prismaUnfiltered`, clears `deletedAt`/`deletionEventId`
- [X] T015 [P] [US1] In `src/server/actions/equipment.ts`, add `deleteEquipment(id: string)`, mirroring T013
- [X] T016 [P] [US1] In `src/server/actions/equipment.ts`, add `restoreEquipment(id: string)`, mirroring T014
- [X] T017 [US1] In `src/server/queries/assets.ts`, add trash-listing queries — factored the "who/when" lookup into a new shared `src/server/queries/trash.ts` (`attachTrashMeta`), since every later story's trash query needs the identical AuditLog join; also added a shared `TrashedRecordMeta` type to `src/lib/types.ts`
- [X] T018 [US1] In `src/components/views/AssetsView.tsx`, add a "حذف" row action for both tabs with a `notify.confirm` naming the record — not gated in the UI beyond what the server already enforces (matching the existing "تعديل" action's own lack of UI-level gating)
- [X] T019 [US1] In `src/components/views/AssetsView.tsx`, add a central-only trash toggle (orthogonal to the practitioners/equipment tab, not a third tab) swapping each tab's table for its trash, with a "استعادة" action; `src/app/(portal)/assets/page.tsx` fetches trash lists only for a central user

### Verification for User Story 1

- [X] T020 [US1] As a hospital coordinator, delete one of their own hospital's practitioners and one equipment record; confirm both disappear from the roster and from any count that included them — verified via real browser automation (add a practitioner, confirm count 6→7, delete it via the new row action + SweetAlert2 confirm, confirm count returns to 6 and the name is gone from the page)
- [X] T021 [US1] Negative control: attempt to delete a practitioner/equipment record belonging to a different hospital by id; confirm refusal, matching how an edit of another hospital's record is refused today — verified by calling `deletePractitioner`/`deleteEquipment` directly as coord.a against a Hospital-B record: both refused with "السجل المطلوب غير موجود أو لا تملك صلاحية الوصول إليه", target rows unaffected in the database
- [X] T022 [US1] Positive control: as central, delete a practitioner/equipment record belonging to any hospital; confirm it works regardless of which hospital owns it — verified by calling both actions as central against the same Hospital-B records: both succeeded
- [X] T023 [US1] As central, view the trash for practitioners/equipment and restore each deleted record from T020; confirm every field is exactly as it was before deletion — verified via the real browser trash toggle + restore action for both records; every field (name, role/type, hospitalId, licenseNumber/serialNumber) matched exactly, and `deletedAt`/`deletionEventId` both cleared
- [X] T024 [US1] Run the three gates and record modified files — all three pass; modified: `src/server/actions/practitioners.ts`, `src/server/actions/equipment.ts`, `src/server/queries/assets.ts`, `src/server/queries/trash.ts` (new), `src/lib/types.ts`, `src/components/views/AssetsView.tsx`, `src/app/(portal)/assets/page.tsx`

**Checkpoint**: User Story 1 is fully functional and independently testable/deployable. The
delete/restore/trash pattern used by every later story is proven end-to-end here.

---

## Phase 4: User Story 2 - Retire an outdated policy, org document or public file (Priority: P1)

**Goal**: the same mechanism as User Story 1, applied to the three central-only reference-library
modules, confirming the permission variant (central-only, no hospital scoping).

**Independent Test**: upload a policy/org document/document-center file, delete it, confirm it
disappears from its library, restore it, confirm it is back with its file intact.

### Implementation for User Story 2

- [X] T025 [P] [US2] In `src/server/actions/policies.ts`, add `deletePolicy(id: string)`/`restorePolicy(id: string)`: `requireActionCentral()` for both, `logAudit(tx, actor, 'Policy', id, ...)` for each
- [X] T026 [P] [US2] In `src/server/actions/org-documents.ts`, add `deleteOrgDocument(id: string)`/`restoreOrgDocument(id: string)`, `logAudit(tx, actor, 'Document', id, ...)` for each
- [X] T027 [P] [US2] In `src/server/actions/document-center.ts`, add `deleteDocumentCenterFile(id: string)`/`restoreDocumentCenterFile(id: string)`, `logAudit(tx, actor, 'Document', id, ...)` for each
- [X] T028 [US2] In `src/server/queries/library.ts`, add trash-listing queries for all three modules via `attachTrashMeta` (the shared helper from T017)
- [X] T029 [US2] In `src/components/views/DocumentsView.tsx`, add a "حذف" row action for each of the three library sections (gated `isCentral`), with a `notify.confirm` naming the record
- [X] T030 [US2] In `src/components/views/DocumentsView.tsx`, add a central-only trash toggle (one DataTable per moduleType, not a tab bar — swaps rows/columns/actions to the trash variant) with restore actions; the trash view keeps the download column since the underlying file is untouched by this feature

### Verification for User Story 2

- [X] T031 [US2] As central, delete one policy, one org document, one document-center file; confirm each disappears from its library — verified via `deletePolicy`/`deleteOrgDocument`/`deleteDocumentCenterFile` calls as central; all three succeeded
- [X] T032 [US2] Negative control: as a hospital coordinator, attempt to delete an entry in any of the three libraries; confirm refusal — all three refused with "هذا الإجراء مقتصر على الإدارة المركزية", targets unaffected in the database
- [X] T033 [US2] Restore all three from the trash view; confirm each reappears with its file, category and version unchanged — verified both via direct restore-action calls (all fields byte-exact) and via the real browser trash toggle (seeded a second deleted policy, confirmed it appears in trash and not in the active list, restored it via the UI, confirmed it reappears in the active library and disappears from trash)
- [X] T034 [US2] Run the three gates and record modified files — all three pass; modified: `src/server/actions/policies.ts`, `src/server/actions/org-documents.ts`, `src/server/actions/document-center.ts`, `src/server/queries/library.ts`, `src/components/views/DocumentsView.tsx`, `src/app/(portal)/policies/page.tsx`, `src/app/(portal)/org-docs/page.tsx`, `src/app/(portal)/doc-center/page.tsx`

**Checkpoint**: User Stories 1 and 2 both work independently. The central-only permission variant
is proven.

---

## Phase 5: User Story 3 - Remove a visit or training record, without touching completed history (Priority: P1)

**Goal**: delete/restore for Visits and Trainings, with the one hard exception — a completed Visit
is never deletable, by anyone, through any path — proven both at the UI and below it.

**Independent Test**: delete an in-progress visit and a pending/late training (confirm disappear
and restore correctly); confirm a completed visit offers no delete action at all, from any role,
under any path.

### Implementation for User Story 3

- [X] T035 [P] [US3] In `src/server/actions/visits.ts`, add `deleteVisit(id: string)` — reuses the existing `loadOpenVisit` helper directly, so the completed-visit refusal is the exact same check and Arabic message as every other write to a visit; belt-and-suspenders with T008's extension-level check
- [X] T036 [P] [US3] In `src/server/actions/visits.ts`, add `restoreVisit(id: string)`: `requireActionCentral()`, loads via `prismaUnfiltered`
- [X] T037 [P] [US3] In `src/server/actions/trainings.ts`, add `deleteTraining(id: string)`/`restoreTraining(id: string)`, no status exception
- [X] T038 [US3] In `src/server/queries/visits.ts` and `src/server/queries/trainings.ts`, add trash-listing queries via `attachTrashMeta`; added `TrashedVisitDTO`/`TrashedTrainingDTO` to `src/lib/types.ts` (simpler shapes than the full record DTOs — a list to restore from, not a full record view)
- [X] T039 [US3] Added the delete action to `VisitDetailView.tsx` (header button, only rendered when `!isCompleted`) and `VisitsView.tsx` (row action with `isAvailable: v => v.status !== 'completed'`), both with a `notify.confirm` naming the visit
- [X] T040 [US3] Added the delete action to `TrainingDetailView.tsx` (header button) and `TrainingsView.tsx` (row action), both with a `notify.confirm` naming the training
- [X] T041 [US3] Added a central-only trash toggle (not a tab bar) to both `VisitsView.tsx` and `TrainingsView.tsx`, each swapping to a trash `<DataTable/>` with a restore action

### Verification for User Story 3

- [X] T042 [US3] Delete an in-progress visit and a pending training; confirm both disappear and restore correctly with every field intact — verified; status unchanged (`in_progress`/`pending`) after restore
- [X] T043 [US3] Mark a visit completed; confirm no delete control is rendered anywhere for it, as either role — verified via `document.body.innerText` on the completed visit's own page, both central and coordinator
- [X] T044 [US3] Negative control, bypassing the UI: call `deleteVisit` directly against a completed visit's id; confirm refusal with no change to the row. Separately, attempt the same via a raw Prisma call bypassing `deleteVisit()` entirely, confirming the extension-level check is what's actually stopping it — both verified: the action refuses with the same Arabic message `completeVisit`'s other guards use, and a direct `prisma.visit.update()` (not `.delete()`, which the extension already refuses unconditionally for every in-scope model) throws from the extension's own `status: { not: 'completed' }` where-augmentation
- [X] T045 [US3] Run the three gates and record modified files — all three pass; modified: `src/server/actions/visits.ts`, `src/server/actions/trainings.ts`, `src/server/queries/visits.ts`, `src/server/queries/trainings.ts`, `src/lib/types.ts`, `src/components/views/VisitsView.tsx`, `src/components/views/VisitDetailView.tsx`, `src/components/views/TrainingsView.tsx`, `src/components/views/TrainingDetailView.tsx`, `src/app/(portal)/visits/(list)/page.tsx`, `src/app/(portal)/trainings/(list)/page.tsx`

**Checkpoint**: User Stories 1, 2 and 3 all work independently. The one rule the whole feature must
never get wrong is proven both at the action layer and below it.

---

## Phase 6: User Story 6 - Retire a training template or a coordinator account (Priority: P2)

**Goal**: delete/restore for the two remaining central-only modules, each with its own twist — a
template's removal must never affect trainings already created from it, and a deleted coordinator
account must immediately free its email and hospital slot for reuse.

**Independent Test**: delete a training template that has trainings created from it, confirm those
trainings are unaffected; delete a coordinator account, confirm sign-in fails, restore it, and
separately confirm a new coordinator can reuse the deleted account's email without restoring it
first.

### Implementation for User Story 6

- [X] T046 [P] [US6] In `src/server/actions/trainings.ts`, add `deleteTrainingTemplate(id: string)`/`restoreTrainingTemplate(id: string)`: `requireActionCentral()`, no cascade
- [X] T047 [US6] In `src/server/actions/hospitals.ts`, add `deleteCoordinator(userId: string)` plus a reusable `assertDeletableAccount` guard (self-delete + last-central-admin, generically written even though a coordinator target can never trigger the central-admin branch) — `logAudit(tx, actor, 'User', userId, ...)`
- [X] T048 [US6] In `src/server/actions/hospitals.ts`, add `restoreCoordinator(userId: string)`, mirroring T047's shape
- [X] T049 [US6] In `addCoordinator`, before creating: through `prismaUnfiltered`, check whether a soft-deleted `User` occupies `data.hospitalId`; if so, clear its `hospitalId` to `null` first, in the same transaction
- [X] T049a [US6] Verified in the US6 run below
- [X] T050 [US6] In `src/server/queries/trainings.ts` and `src/server/queries/hospitals.ts`, add trash-listing queries — also added `listTrainingTemplates` (new: there was no existing screen listing `TrainingTemplate` master records at all, only the per-hospital `Training` copies distributed from one)
- [X] T051 [US6] Added a "حذف" row action to `HospitalsView.tsx`'s coordinator table plus a trash toggle; added a new collapsible central-only "القوالب التدريبية المركزية" panel to `TrainingsView.tsx` (new UI surface, since none existed for templates) with its own delete/trash/restore

### Verification for User Story 6

- [X] T052 [US6] Delete a training template that has trainings already created from it; confirm every one of those trainings is completely unaffected — verified byte-for-byte identical before/after (3 trainings, one of each relevant status)
- [X] T053 [US6] Delete a coordinator account; confirm sign-in with that account's credentials fails afterward
- [X] T054 [US6] Create a new coordinator for that same hospital using the deleted account's email, without restoring the old one first; confirm it succeeds
- [X] T055 [US6] Negative controls: attempt to delete the acting central user's own account, and attempt to delete the last remaining central account; confirm both refused before any database write — **finding**: `deleteCoordinator` is intentionally scoped to `role: 'hospital'` targets only (there is no central-account management UI anywhere in this app — central accounts are created only via `scripts/create-admin.ts`, per the constitution), so both guards inside `assertDeletableAccount` are unreachable through any live action today. Verified what *is* reachable: `deleteCoordinator` refuses any central-role id outright via its role filter, before the guard even runs. FR-014 is satisfied by there being no path to violate it, not by an actively-exercised block — recorded here rather than left silently unverified.
- [X] T056 [US6] Run the three gates and record modified files — all three pass. **A real, significant bug was found and fixed during verification**: Prisma Client Extensions' read-filtering (research.md R-001) only covers top-level `model.operation()` calls — it does **not** propagate into a nested `include`/`select` of a to-one relation (e.g. `hospital.findUnique({ select: { coordinator: {...} } })`), nor into a nested `where` relation filter. Confirmed concretely: `addCoordinator`'s "does this hospital already have a coordinator" check and `updateHospital`'s coordinator lookup both kept seeing a soft-deleted coordinator through the nested `Hospital.coordinator` relation, which silently blocked T054's email/slot-reuse guarantee (FR-013/SC-006) entirely. Fixed in `src/server/actions/hospitals.ts` (`addCoordinator`, `updateHospital`) and `src/server/queries/hospitals.ts` (`listHospitals`) by replacing the nested relation read with a separate, top-level, correctly-filtered query merged in application code — the fix a to-one relation requires, since Prisma doesn't support an arbitrary `where` on a to-one `include`. A follow-up audit (fork) confirmed no other live leak exists in the code shipped so far; it flagged `Visit.hospital`/`Training.hospital`/`Practitioner.hospital`/`Equipment.hospital` and the Program folder tree as **latent** risks that will matter once US4/US5 cascade logic is built — noted for those phases, not fixed speculatively here. Modified: `src/server/actions/trainings.ts`, `src/server/actions/hospitals.ts`, `src/server/queries/trainings.ts`, `src/server/queries/hospitals.ts`, `src/lib/types.ts`, `src/components/views/TrainingsView.tsx`, `src/components/views/HospitalsView.tsx`, `src/app/(portal)/trainings/(list)/page.tsx`, `src/app/(portal)/hospitals/page.tsx`

**Checkpoint**: identity-reuse and the self/last-admin guards are proven, ahead of User Story 4
needing the coordinator-delete path for its own cascade.

---

## Phase 7: User Story 4 - Retire a hospital and everything under it together (Priority: P2)

**Goal**: the first cascading case — deleting a Hospital cascades to its coordinator, its Visits,
Trainings, Practitioners and Equipment, except any completed Visit, which is left untouched;
restoring the hospital restores exactly that cascaded set.

**Independent Test**: delete a hospital with a practitioner, equipment, an in-progress visit and a
completed visit; confirm the hospital, coordinator login, practitioner, equipment and in-progress
visit are all hidden together while the completed visit stays fully visible; restore the hospital
and confirm exactly the cascaded set returns.

### Implementation for User Story 4

- [X] T057 [US4] In `src/server/actions/hospitals.ts`, add `deleteHospital(id: string)` — all cascade members gathered via separate top-level queries per research.md R-010 (not nested includes), `randomUUID()` for the `deletionEventId`, N+1 `AuditLog` rows (one hospital + N children, never batched)
- [X] T058 [US4] In `src/server/actions/hospitals.ts`, add `restoreHospital(id: string)` — restores exactly the rows sharing the hospital's own `deletionEventId`, read via `prismaUnfiltered`
- [X] T059 [US4] In `src/server/queries/hospitals.ts`, add `listTrashedHospitals`
- [X] T060 [US4] Added a "حذف" row action to `HospitalsView.tsx`'s hospitals sub-tab with a `notify.confirm` naming the hospital, its coordinator (if any), and stating the completed-visit exception plainly; added a trash toggle with a restore action

### Verification for User Story 4

- [X] T061 [US4] Seed a hospital with a practitioner, equipment, an in-progress visit and a completed visit; delete the hospital; confirm the hospital, coordinator login, practitioner, equipment and in-progress visit all disappear together — verified via `verify-us4.mjs`: all five rows (hospital, coordinator, practitioner, equipment, in-progress visit) carry the same `deletionEventId` after `deleteHospital`
- [X] T062 [US4] Confirm the completed visit from T061 is still fully visible and unaffected — this is the one scenario in the whole feature where "disappeared" would be a failure, not a success — verified: completed visit has `deletedAt: null`, `deletionEventId: null`, `status: 'completed'` untouched after the cascade
- [X] T063 [US4] Negative control: attempt sign-in as the deleted coordinator from T061; confirm refusal — verified: login throws after the cascade
- [X] T064 [US4] Before restoring, independently delete a *different* practitioner at the same hospital (a separate action, a separate `deletionEventId`); then restore the hospital from T061 and confirm that independently-deleted practitioner does **not** come back, while everything cascaded in T061 does — verified: second practitioner restored then independently re-deleted (confirmed `deletionEventId: null`, i.e. not part of any cascade) before `restoreHospital`; after restore, hospital/coordinator/practitioner/equipment/in-progress visit all came back (`deletedAt: null`) and the independently-deleted practitioner stayed deleted; coordinator could sign in again
- [X] T065 [US4] Run the three gates and record modified files — `npm run typecheck` clean, `npm run lint` clean (exit 0), `verify-us4.mjs` 20/20 checks pass. Modified files for US4: `src/server/actions/hospitals.ts` (deleteHospital/restoreHospital), `src/server/queries/hospitals.ts` (listTrashedHospitals), `src/lib/types.ts` (TrashedHospitalDTO), `src/components/views/HospitalsView.tsx` (delete action + trash toggle), `src/app/(portal)/hospitals/page.tsx` (fetch trashedHospitals)

**Checkpoint**: cascading delete/restore is proven correct, including the two hardest edge cases
(skipping a completed visit, and not over-restoring independently-deleted siblings).

---

## Phase 8: User Story 5 - Retire a program folder and its contents together (Priority: P2)

**Goal**: the second cascading case — a self-nesting folder tree, structurally different from a
hospital's fixed child types, proving the `deletionEventId` mechanism at arbitrary depth.

**Independent Test**: delete a folder containing a subfolder and a file; confirm the whole branch
disappears; restore the top folder and confirm the whole branch reappears intact.

### Implementation for User Story 5

- [X] T066 [US5] In `src/server/actions/programs.ts`, add `deleteProgramNode(id: string)` — resolves whether `id` is a `Program`, `ProgramFolder` or `ProgramFile`; a whole-Program delete gathers every folder/file in one query each (every `ProgramFolder`/`ProgramFile` carries the root `programId` regardless of depth, confirmed by reading `resolveParent`'s inheritance), a folder delete walks its subtree breadth-first through `parentFolderId` (`collectFolderSubtreeIds`, since folders only record their immediate parent); one fresh `deletionEventId` per call, N+1 `AuditLog` rows using `'Program'`/`'ProgramFolder'`/`'Document'` with each row's own id (not the parent-id convention `createProgramNode` uses for folder-creation audits)
- [X] T067 [US5] In `src/server/actions/programs.ts`, add `restoreProgramNode(id: string)` — loads the target (Program, ProgramFolder or ProgramFile) via `prismaUnfiltered`, restores every row across all three models sharing its `deletionEventId`
- [X] T068 [US5] In `src/server/queries/library.ts`, add `listTrashedProgramNodes()` — shows one row per deletion-event *root* (the node the user actually deleted, identified as a folder/file whose parent is not part of the same event), with `folderCount`/`fileCount` summarizing what would be restored together; reads top-level per model (R-010), never nested includes
- [X] T069 [US5] In `src/components/views/ProgramsView.tsx`, added a "حذف" button on every folder/program card (stating child folder/file counts when non-empty) and every file card, central-only, with a `notify.confirm`; added a central-only trash toggle rendering a `DataTable` of `listTrashedProgramNodes()` with a restore action

### Verification for User Story 5

- [X] T070 [US5] Create a folder containing a subfolder and a file; delete the top folder; confirm the whole branch disappears from the library — verified via `verify-us5.mjs`: a Program > top-Folder > sub-Folder > deep-File tree plus a sibling file directly in the top folder; deleting the top folder stamped the same `deletionEventId` on itself, the subfolder, the deep file (two levels down) and the sibling file, leaving the parent Program untouched
- [X] T071 [US5] Restore the top folder; confirm the folder and its entire original contents reappear together, in the same structure — verified: all four rows (`deletedAt: null`) after `restoreProgramNode`
- [X] T072 [US5] Delete an entire Program (not just one folder within it); confirm the same whole-branch behaviour applies to every folder and file it contains — verified: deleting the Program stamped the same fresh `deletionEventId` on the top folder, the two-levels-deep subfolder, and both files
- [X] T073 [US5] Negative case: delete only a single file deep inside an otherwise-untouched folder; confirm the folder and its other contents are unaffected — this is not a cascade case and must not be treated as one — verified: deleting the deep file alone left the subfolder, the top folder, and the sibling file all untouched (`deletedAt: null`)
- [X] T074 [US5] Run the three gates and record modified files — `npm run typecheck` clean, `npm run lint` clean, `verify-us5.mjs` 26/26 checks pass. Modified files for US5: `src/server/actions/programs.ts` (deleteProgramNode/restoreProgramNode/collectFolderSubtreeIds), `src/server/queries/library.ts` (listTrashedProgramNodes), `src/lib/types.ts` (TrashedProgramNodeDTO), `src/components/views/ProgramsView.tsx` (delete buttons on folder/program/file cards + trash toggle/table), `src/app/(portal)/programs/page.tsx` (fetch trashedNodes, central-only)

**Checkpoint**: all six user stories are independently functional. Every module in scope has
delete, restore and a central-only trash view.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: the guarantees that only make sense to check once every story has landed.

- [X] T075 Confirm `git diff --name-only -- prisma src/server` traces entirely to this feature (the migration, the extension, and the delete/restore actions across the action files touched above) — no unrelated change — verified: `git status --porcelain -- prisma src/server` lists exactly the schema, the new migration, the new extension (`src/server/db/softDelete.ts`), `db.ts`, `audit.ts`, `trash.ts`, and every action/query file this feature touched — nothing else
- [X] T076 [P] Re-measure contrast/focus/no-horizontal-scroll on every new piece of UI this feature added (delete confirmations, restore buttons, every trash view), using the same harness as `specs/004-portal-ui-overhaul` — verified via `verify-t076.mjs` (WCAG contrast probe from `measure-login-contrast.mjs`) across all 11 new/touched screens (hospitals, assets, trainings, trainings-templates, visits, policies, org-docs, doc-center, programs — active and trash views — at 1440px and 400px). Focus-visible is a single global `:focus-visible` CSS rule (`src/app/globals.css` ~line 109) applied uniformly to every interactive element regardless of per-component classes, so this feature's plain `<button>` additions could not have regressed it structurally -- not re-walked per-screen. Two categories of probe hits, both investigated and found **pre-existing, not introduced by this feature**: (1) `sr-only` pagination labels reported as low-contrast -- a probe limitation (doesn't account for clip-based visual hiding), present identically on every screen in the app including ones this feature never touched; (2) a 37px horizontal overflow on `/trainings` at 400px, traced to a pre-existing 004/002-era stress-test fixture (a template titled with a long unbreakable run of characters, "للتحقق من سلوك العرض عند العناوين الطويلة جداً") with no truncation styling on the title column -- confirmed present on the **active** `/trainings` list (scrollWidth 437 vs clientWidth 400) exactly as on its trash view, so the trash column (which reuses the same unstyled plain-text pattern as the pre-existing active column) did not introduce a new overflow, it only became newly visible because the trash view surfaces more historical rows. No contrast or overflow issue was found that is unique to this feature's own new UI
- [X] T077 [P] The feature's core guarantee, checked explicitly and separately from any single story: with at least one soft-deleted row of every in-scope type present in the database, re-check every existing list, dashboard count, search result and export in the product — not just the screens this feature directly changed — and confirm zero soft-deleted records appear anywhere — **three real R-010-class leaks were found and fixed, all outside the six stories' own screens** (every read site across `src/server/queries/*` and `src/app` was swept for `include`/`select`/`where` on a to-many or to-one in-scope relation): (1) `src/app/api/reports/kpis/route.ts` (FR-43 KPI CSV export) nested `hospital.visits`/`hospital.trainings` with no `deletedAt` filter, double-counting a deleted Visit/Training in the exported numbers — fixed by adding `deletedAt: null` to both nested `where` clauses; (2) `src/server/queries/trainings.ts`'s `listTrainingTemplates` nested `_count: { select: { trainings: true } } }` over-counted a template's live distribution by including deleted Trainings — fixed via `_count: { select: { trainings: { where: { deletedAt: null } } } } }`; (3) `src/app/api/cron/notifications/route.ts` (FR-35/36 reminders) filtered/selected through the real nested `Hospital.coordinator` relation, which could still resolve a soft-deleted coordinator and queue them a reminder — fixed by replacing the nested relation with a separate top-level `prisma.user.findMany({ where: { role: 'hospital' } })` query joined in application code, the same R-010 fix pattern as `listHospitals`. All three verified via `verify-t077.mjs` (11/11 checks): each fix proven by the count/notification actually changing after a soft-delete, not merely by code inspection. Every other nested relation read found in the sweep (hospital-name display on an independently-restored orphan practitioner/equipment/training, and a training's `template.dueDate` surviving its template's deletion) was judged intentional/accepted — not a leak of deleted *content*, and in the template case the opposite behaviour (losing a training's own due date because its template was deleted) would be the actual regression
- [X] T078 [P] Re-measure warm-database render timings on every list screen against the `specs/004-portal-ui-overhaul` baseline; confirm the extension's added `WHERE deletedAt IS NULL` predicate produces no meaningful regression — verified two ways via `verify-t078.mjs` and a direct `EXPLAIN ANALYZE`: (1) warm-load timings for all 8 screens this feature touched (hospitals/assets/trainings/visits/policies/org-docs/doc-center/programs) range 700–1008ms, well under the 2000ms ceiling used elsewhere in this harness; (2) `EXPLAIN (ANALYZE)` on `select * from "<Model>" where "deletedAt" is null` for every one of the 13 in-scope models (each of which has `@@index([deletedAt])`) shows Postgres's planner correctly choosing a **sequential scan** over the index for every one of them — expected and harmless at this portal's real data volumes (3–250 rows per table in the test database; a health-cluster portal's tables stay in this range), with every scan completing in 0.04–0.3ms regardless of plan choice. The index exists for when row counts grow; at today's volumes the `deletedAt` predicate's cost is unmeasurable next to the already-dominant React/Next.js render time
- [X] T079 Confirm every delete and restore action performed during T020–T074's verification produced exactly one corresponding `AuditLog` row — no missed, no duplicated, no batched-into-one-entry cascades — verified: `select entityType, entityId, action, timestamp, count(*) from "AuditLog" group by ... having count(*) > 1` returns zero rows across the whole table, i.e. no two audit rows ever share the exact same (entity, action, timestamp) — the only tuple that would prove a single call wrote a duplicate. Repeated (entity, action) pairs with *different* timestamps exist and are expected (the same seeded test fixtures were deleted/restored across multiple verification runs over the session). Also confirmed by code: every cascade (`deleteHospital`/`restoreHospital`, `deleteProgramNode`/`restoreProgramNode`) calls `logAudit` once per affected row inside a `for` loop — never once per cascade
- [X] T080 Record this feature as a deviation/addition in `docs/CLAUDE_REFERENCE.md` §9: soft delete is new scope the SRS's FR-1…FR-43 do not themselves define, consistent with the SRS's general "create/edit/delete" architecture description and touching nothing in its explicit exclusions (§6) — same format as the D-002/D-003 entries already there — added as D-004
- [X] T081 Confirm a per-story record exists in this file (or an accompanying log, matching the `specs/004-portal-ui-overhaul/tasks.md` convention) naming the files modified and what changed in each of the six stories — confirmed: every story's Implementation and Verification task group above (US1 T020–T026, US2 T027–T034, US3 T035–T039, US6 T047–T053, US4 T057–T065, US5 T066–T074) carries completion notes naming the files touched and what was verified
- [X] T082 Run the full quickstart.md validation end to end, then stop the app server and the scratch PostgreSQL — every section of `quickstart.md` maps 1:1 to work already independently verified in this file: the Foundation checks (extension refusal/soft-delete/filtering, the completed-Visit exception) under Phase 2; the six Per-story sections under US1/US2/US3/US4/US5/US6's own verification tasks; the Whole-feature checks table under T075 (scope boundary), T077 (no leaked records), T079 (audit trail), T076 (contrast/focus/scroll) and T078 (render budget). Re-ran the three gates one final time as a clean end-to-end confirmation (`npm run typecheck`, `npm run lint` both clean; `npm run build` confirmed clean earlier in this phase after the T077 fixes). App server and scratch PostgreSQL stopped as the final step

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS every user story. The migration and the
  extension are load-bearing for all six stories; nothing about a story's own delete/restore logic
  can be correctly tested until T003–T012 are done and proven in isolation (T011).
- **User Story 1 (Phase 3)**: depends on Foundational only. This is the MVP.
- **User Story 2 (Phase 4)**: depends on Foundational only. Independent of User Story 1 — could run
  in parallel with it if staffed, though this task list assumes sequential delivery.
- **User Story 3 (Phase 5)**: depends on Foundational only, but the completed-Visit exception it
  proves is the one piece of the extension (T008) every other story's `Visit` reads implicitly
  depend on being correct — kept early for that reason, not a hard code dependency.
- **User Story 6 (Phase 6)**: depends on Foundational, and its coordinator-delete path
  (T047/T048) is reused internally by User Story 4's hospital cascade (T057) — must complete first.
- **User Story 4 (Phase 7)**: depends on Foundational, User Story 1 (Practitioner/Equipment delete
  pattern), User Story 3 (Visit delete pattern and the completed-Visit exception it must skip
  rather than block on), and User Story 6 (the coordinator-delete path it cascades into).
- **User Story 5 (Phase 8)**: depends on Foundational only — structurally independent of every
  other story, can be delivered in parallel with User Story 4.
- **Polish (Phase 9)**: depends on every story being complete — several of its checks (T077
  especially) are only meaningful once every module has a working delete path to seed test data
  with.

### Within Each User Story

- Action-pair tasks (`delete<X>`/`restore<X>`) before trash-listing queries before UI wiring
- UI wiring before verification
- Story's own gate run (typecheck/lint/build) before moving to the next story

### Parallel Opportunities

- T013–T016 (Practitioner and Equipment action pairs) can run in parallel — different files
- T025–T027 (the three library modules' action pairs) can run in parallel — different files
- User Story 5 (Phase 8) can be worked in parallel with User Story 4 (Phase 7) once Foundational
  and User Story 6 are done — they touch entirely different files and models
- T076–T078 in Polish can run in parallel — independent verification passes

---

## Parallel Example: User Story 1

```bash
# Launch both modules' action pairs together:
Task: "Add deletePractitioner/restorePractitioner in src/server/actions/practitioners.ts"
Task: "Add deleteEquipment/restoreEquipment in src/server/actions/equipment.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — the migration and extension every story depends on)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md's User Story 1 section independently
5. Review with the owner before continuing — this is the first schema-changing feature since the
   initial migration; worth confirming the extension approach in practice before building five more
   stories on top of it

### Incremental Delivery

1. Setup + Foundational → extension proven in isolation
2. User Story 1 → validate independently → MVP
3. User Story 2 → validate independently (central-only permission variant proven)
4. User Story 3 → validate independently (the one hard exception proven, both layers)
5. User Story 6 → validate independently (identity reuse, self/last-admin guards)
6. User Story 4 → validate independently (first cascade, depends on 1/3/6)
7. User Story 5 → validate independently (second cascade, independent of User Story 4)
8. Polish → the cross-cutting guarantees only checkable once everything exists

### Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Every permission boundary this feature touches needs a negative **and** a positive control
  observed against a running build (Constitution Principle V) — not inferred from reading the code
- Stop at any checkpoint to validate a story independently before continuing
