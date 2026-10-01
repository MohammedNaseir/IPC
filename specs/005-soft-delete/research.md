# Phase 0 Research: Soft Delete Across All Modules

## R-001 — Mechanism for guaranteeing every read excludes deleted rows

**Decision**: a single Prisma Client Extension (`$extends`), applied once where the shared
`prisma` client singleton is constructed (`src/server/db.ts`), rather than adding
`deletedAt: null` by hand at each read call-site.

**Rationale**: counted ~36 existing read call-sites (`findMany`/`findFirst`/`findUnique`/`count`)
across `src/server/queries/*.ts` and inline in `src/server/actions/*.ts` for the eleven in-scope
models, with no automated test suite to catch a missed one. A structural filter applied once is
the only approach where a *future* query — one that doesn't exist yet — is safe by construction
rather than by the next developer remembering a convention. This is also the idiomatic, officially
documented Prisma pattern for exactly this problem (Prisma's own docs carry a "soft delete"
extension example built the same way), not a project-specific workaround.

**Confirmed available**: `$extends`, `Prisma.defineExtension` and `Prisma.getExtensionContext`
are all present in the installed `@prisma/client` runtime types
(`node_modules/@prisma/client/runtime/client.d.ts`) and the app's generated client
(`src/generated/prisma/client.ts`, using the `prisma-client` ESM generator) re-exports the `Prisma`
namespace those hang off. Exact import path and call shape to be re-verified against the installed
`.d.ts` at implementation time, not assumed from memory — same discipline this project already
applied to a new dependency's API in the previous feature.

**One extension component, not two — revised during implementation**: the original plan called for
a `query` component (read-filtering) plus a `model` component (redirecting `delete`→`update`).
Only the `query` component was actually used, via its `$allModels`/`$allOperations` hook, for
**both** jobs:
- For read operations (`findMany`/`findFirst`/`findUnique`/`count`/etc.) on an in-scope model, it
  injects `deletedAt: null` into a *new* args object (not a mutation of the original) before
  calling through.
- For `delete`/`deleteMany` on an in-scope model, it **throws**, refusing the call outright, rather
  than redirecting it. The `model`-component redirect approach the plan described was dropped: it
  replaces a method globally for *every* model, with no safe way to fall through to the real
  delete for a model outside this feature's scope — and `TrainingAttendance` has exactly one real,
  legitimate `deleteMany` call in the codebase today (its attendance re-sync in
  `src/server/attendance/input.ts`) that a global override would have silently broken. A `query`
  component can only intercept or refuse the operation it's bound to, not swap it for a different
  one (confirmed against the installed type declarations) — so refusal, not redirection, is what
  it can safely do. Every `delete<Module>` action therefore calls `.update()` directly, an
  ordinary Prisma call with no magic; the extension's refusal exists purely as a loud safety net
  against a future stray `.delete()` call, which is arguably better than a silent redirect would
  have been — the failure surfaces immediately instead of quietly changing what `.delete()`'s
  return value means.
- For `Visit` specifically, an `update`/`updateMany` that sets `deletedAt` gets its `where` clause
  augmented with `status: { not: 'completed' }` (research.md R-004) — Prisma's own "record not
  found" error on a non-matching update is the refusal, with no separate lookup query needed.

**`findUnique` needed no special handling**: checked directly against the generated types
(`VisitWhereUniqueInput` and the others), and every one already accepts `deletedAt` as an
additional filter alongside its real unique key (Prisma's "extended `where` for `findUnique`"
support). No `findFirst` normalization was necessary.

**Escape hatch**: `prismaUnfiltered`, a second export from `src/server/db.ts` sharing the same
underlying (unextended) base client and connection pool as `prisma` — the *only* way to see
soft-deleted rows, used exclusively by the Trash queries. It is not the default client, so a query
written against the normal `prisma` export can never accidentally see deleted data.

**Ripple effect found and fixed, not anticipated in this plan**: every function taking a
transaction handle (`logAudit`, `notify.ts`'s three functions, `resolveParent` in `programs.ts`,
`loadOpenVisit` in `visits.ts`, the attendance re-sync helper, `storeUpload` in `files.ts`) was
typed against the base `Prisma.TransactionClient`, which the now-extended `prisma.$transaction`'s
callback parameter no longer structurally matches. Fixed by exporting `ExtendedTransactionClient`
from `src/server/db.ts` (derived by inference from an actual `.$transaction()` call site, not by
indexing Prisma's own complex generic `$extends`/`$transaction` types directly — the latter does
not resolve correctly through `ReturnType<>`) and retyping all seven functions against it.

**Alternatives considered**:
- *Manual `deletedAt: null` at each call-site.* Rejected — this is precisely the "one missed spot
  leaks a deleted record" risk the mechanism exists to close, and it doesn't protect any query
  written after this feature ships.
- *A convention of per-model query helper functions* (`activeHospitals()`, etc.) that callers use
  instead of the raw Prisma model. Rejected as the primary mechanism — still relies on every
  future caller choosing the helper over `prisma.hospital.findMany` directly, which Prisma itself
  does nothing to prevent. (`src/server/queries/*.ts` already organizes reads this way for other
  reasons and keeps doing so — but the extension is what makes it *safe*, not the organization.)

## R-002 — Tracking which cascade a child was deleted as part of

**Decision**: a nullable `deletionEventId String?` column on every in-scope model. One fresh id
(a `cuid()`, generated in application code once per top-level delete action) is stamped on the
record being deleted **and** on every record cascaded with it, all inside the same transaction.
Restoring means: find every row across the relevant models where `deletionEventId` equals the
value stored on the record being restored, and clear both `deletedAt` and `deletionEventId` on all
of them together.

**Rationale**: a simpler "store the immediate parent's id" field breaks down for the Program
folder tree (spec User Story 5), where a file three folders deep has no direct relationship to the
top-level folder someone actually clicked delete on — only a shared "this all happened in the same
delete action" id captures that correctly at arbitrary depth. The same field also correctly
answers User Story 4's edge case (a hospital's independently-deleted practitioner does not come
back when the hospital is restored) for free: that practitioner's `deletionEventId` is from a
different, earlier event, so it is excluded by construction, not by an extra rule.

**Alternatives considered**:
- *Store the immediate parent id* (`deletedWithId`). Rejected — insufficient for multi-level
  Program folder nesting (see above).
- *No tracking at all; restoring a parent restores every child with any `deletedAt` set.*
  Rejected outright — this is exactly the bug spec User Story 4 Scenario 3 requires not to happen.

## R-003 — Who performed a deletion, and when

**Decision**: not stored redundantly on each model. `AuditLog` already records actor and timestamp
for every mutation (constitution: "every mutation MUST write an `AuditLog` entry"); the Trash
view's "removed by / removed on" column is read by joining each trashed record to its most recent
matching `AuditLog` row (`entityType` + `entityId`, latest `timestamp`), not from a new column.

**Rationale**: avoids storing the same fact in two places that could drift, and keeps `AuditLog` as
the single narrative record of "who did what and when" that the constitution already treats it as.
`deletedAt` itself stays on the model directly — that one *is* needed as a real column, because
the read-filtering extension (R-001) needs a fast, indexed predicate on the row itself, not a
subquery against `AuditLog` on every list read.

## R-004 — Enforcing the completed-Visit exception below the UI

**Decision**: the `model` extension's replaced `delete`/`update`-for-`deletedAt` path for `Visit`
specifically checks `status` before allowing the write, and throws if it is `completed` — inside
the extension, not only inside `deleteVisit()` the Server Action. `deleteVisit()` also checks
explicitly and refuses early (so the user-facing error is a normal validation-style message, not a
raw extension exception), but the extension-level check is what makes the refusal hold even if a
future code path calls the Prisma model directly without going through that action.

**Rationale**: spec FR-008 is the one rule in this whole feature that must not have a single
missed enforcement point, anywhere, ever — it is also the one binding rule this feature inherits
from the existing SRS rather than one this feature is free to design. Constitution Principle II's
"one missed check is not a breach" reasoning is what justifies the deliberate redundancy here.

## R-005 — Identity reuse after a coordinator is deleted

**Decision, revised during implementation (two different mechanisms, not one)**:

- **`email`**: remove `@unique` from `User.email` in `schema.prisma`; replace it with a partial
  unique index (`CREATE UNIQUE INDEX ... ON "User"(email) WHERE "deletedAt" IS NULL`) written as
  raw SQL in the migration — Prisma's schema DSL does not express a `WHERE`-qualified unique index
  declaratively. The one real consequence: `email` is no longer a Prisma-level unique field, so the
  one call site that relied on that (`src/server/actions/auth.ts`'s login lookup,
  `prisma.user.findUnique({ where: { email } })`) becomes `findFirst({ where: { email } })` —
  behaviourally identical, since the database still guarantees at most one *active* match.
- **`hospitalId`**: **kept exactly as-is, still `@unique`, no schema change.** Removing it looked
  like the natural parallel to `email`, but `hospitalId`'s uniqueness is what makes
  `Hospital.coordinator User?` a one-to-one relation in Prisma's eyes rather than a one-to-many —
  removing it would turn `coordinator` into `coordinators: User[]` and ripple into roughly 30 read
  sites across `src/server/queries/hospitals.ts`, several actions, `HospitalsView.tsx`,
  `DashboardView.tsx`, `HospitalProfileView.tsx`, and the overdue-reminder cron route, none of
  which this feature has any reason to touch. Instead: `hospitalId` is nullable already, and
  `deleteCoordinator` is not what frees the slot — **`addCoordinator` does, lazily, only when a
  slot is actually needed.** Before creating a new coordinator for a hospital, it checks (through
  the unfiltered accessor) whether an existing, soft-deleted `User` still occupies that
  `hospitalId`, and if so, clears that old row's `hospitalId` to `null` first. This is a small,
  contained addition to one existing function, not a schema or relation change, and every one of
  the ~30 existing read sites is unaffected.

**Rationale**: spec FR-013 requires a deleted coordinator's email and hospital slot to free up for
reuse without restoring or hard-deleting the old account first — but "free up how" doesn't have to
be the same mechanism for both fields, and choosing per-field based on actual blast radius keeps
this feature from growing a large, tangential relation refactor it doesn't need. `email` has no
relation depending on its uniqueness, so the partial-index route is cheap there; `hospitalId` does,
so a lazier, narrower fix is cheaper there.

**Consequence worth naming, not a defect**: if a coordinator is deleted, a *replacement* is
created for that hospital (freeing the slot as above), and only *then* is the original deleted
coordinator restored, the restored account comes back with `hospitalId: null` — orphaned, since
its slot is now genuinely occupied by someone else. There is no clean alternative resolution to
"which of two people is this hospital's coordinator now," so this is accepted as-is; central can
reassign the restored account's hospital manually the same way they can for any coordinator today.

## R-006 — Audit entity types for the two models without one today

**Decision**: extend the `AuditEntity` union in `src/server/audit.ts` with `'TrainingTemplate'`
and `'ProgramFolder'` (Hospital, Visit, Training, Practitioner, Equipment, Policy, Program and a
generic `'Document'` already exist there and cover OrgDocument/DocumentCenterFile the same way
they're already used for policy/document uploads today).

**Rationale**: every delete/restore writes an `AuditLog` row (spec FR-006); the existing type is a
closed union, so the two models that don't have an entry yet need one before their actions can
compile.

## R-007 — Trash view shape

**Decision**: one screen per module family, reusing the existing `<DataTable/>` convention
(`docs/CLAUDE_REFERENCE.md` §7) rather than a hand-rolled list — same columns as that module's
normal list where they make sense, plus "removed by" / "removed on" (from R-003) and a restore
action in place of the row-detail navigation. Central-only, matching spec FR-005. Exact
navigation/grouping (one central "Trash" destination with per-module sections, vs. a small trash
affordance surfaced from within each existing list screen) is a UI decision deferred to the
story's own implementation, not fixed here — both satisfy the spec's "a Trash view per module,
central-only" requirement equally.

**Rationale**: reusing `<DataTable/>` means the Trash view inherits sorting, search, paging and
the accessibility work already done for every other list in the product, for free, rather than
re-deriving it.

## R-008 — Guarding self-deletion and the last remaining central account

**Decision**: `deleteCoordinator`/a parallel central-account delete path checks, before the
extension is ever invoked: (a) refuse if the target id equals the acting user's own id; (b) for a
central-role target, refuse if it is the only remaining `role: 'central'` row with `deletedAt:
null`. Both are ordinary application-level guards in the Server Action, not extension-level —
unlike R-004, there is no "must hold even if some future code bypasses the action" requirement
here, since these are usability/lockout guards, not a compliance rule inherited from the SRS.

**Rationale**: spec FR-014. A locked-out system (zero working central accounts) has no in-app
recovery path, which is a worse failure mode than a slightly permissive guard would be a risk.

## R-009 — Verification approach

**Decision**: same scratchpad CDP-browser harness as the last three features — seeded scratch
PostgreSQL, production build, real browser automation with positive **and** negative controls for
every permission boundary (Constitution Principle V's stronger clause, which applies throughout
this feature). New to this feature: a dedicated check that queries every one of the ~36 existing
read call-sites' *screens* (not just the models this feature directly adds delete actions to, but
everywhere a deleted record could theoretically leak into: dashboard counts, search, exports)
return zero soft-deleted rows — this is the one guarantee the whole feature rests on per R-001, so
it gets its own explicit, named verification pass rather than being incidentally covered while
testing individual modules.

**Rationale**: constitution Principle V — "Work MUST NOT be reported as complete... without
running the verification and observing the result," and this feature's central risk (R-001) is
precisely the kind of thing that "looks right" from reading the code but needs to be *observed*
against a real database to be trusted.

## R-010 — The extension does not cover nested relation reads (found during US6 implementation)

**Finding**: the soft-delete extension's read-filtering (R-001) is applied by intercepting
top-level `prisma.<model>.<operation>()` calls. It does **not** extend into a nested
`include`/`select` that pulls in a *relation* of an in-scope model, nor into a nested `where`
relation filter. Confirmed concretely: `addCoordinator`'s
`hospital.findUnique({ select: { coordinator: {...} } })` kept returning a soft-deleted coordinator
through the `Hospital.coordinator` relation, silently blocking a replacement coordinator from ever
being created — breaking FR-013/SC-006 (identity reuse) even though the dedicated extension test
(T011) had already proven the mechanism works for direct, top-level calls. `updateHospital` had the
identical bug on the same relation.

**Why a `where: { deletedAt: null }` can't just be added to the nested read**: Prisma only accepts
an arbitrary `where` filter on *list* relations (e.g. `training.findMany({ include: { attachments:
{ where: {...} } } })`). `Hospital.coordinator` is a to-one relation — there is exactly one matching
row by foreign key, and Prisma's query API has no way to additionally filter which one.

**Fix**: for every nested read of an in-scope model discovered to matter, replace it with a
separate, top-level, already-correctly-filtered query, merged in application code. Done for
`Hospital.coordinator` in `addCoordinator`, `updateHospital` (`src/server/actions/hospitals.ts`)
and `listHospitals` (`src/server/queries/hospitals.ts`).

**Scope of the problem beyond what's fixed**: a follow-up audit found no other *live* leak in the
six user stories shipped so far (US1, US2, US3, US6) — every other nested read of an in-scope model
(`Practitioner.hospital`, `Visit.hospital`, `Training.hospital`, `Equipment.hospital`, `Training.
template`) either reads from a model that isn't soft-deletable yet in practice (Hospital, until
US4) or is already covered because the row holding the reference is itself excluded at the
top level once its own parent is cascade-deleted. Two things to carry into the next two stories,
not fixed speculatively here:
- **US4 (Hospital cascade)**: any code that reads `*.hospital.name` (or similar) for a row whose
  parent Hospital might now be soft-deleted needs the same treatment if the row itself isn't also
  excluded by the top-level filter — audit this specifically while building `deleteHospital`/
  `restoreHospital` and the Hospitals trash view, rather than assuming R-001 alone covers it.
- **US5 (Program folder cascade)**: the recursive "walk this folder's entire subtree" logic that
  `deleteProgramNode`/`restoreProgramNode` needs MUST be built from top-level, correctly-filtered
  queries at each level (e.g. repeated `programFolder.findMany({ where: { parentFolderId: ... } })`
  calls) — not a single nested `include` chain of `subFolders` several levels deep, which would not
  only miss this filtering but also cap out at whatever depth the include happens to specify.

**One thing deliberately left exactly as it is, not a bug**: `trainingInclude.template: { select: {
dueDate: true } }` in `src/server/queries/trainings.ts` is a nested read of `Training.template`
that is *not* filtered — a Training keeps deriving its late/dueDate status from a deleted
TrainingTemplate's original `dueDate`. This is plausibly the correct behaviour (a historical
compliance deadline doesn't retroactively disappear because the template record was tidied away),
consistent with FR-012's "trainings remain independent historical records." Flagged for the owner
to override if this reading is wrong; not changed speculatively.
