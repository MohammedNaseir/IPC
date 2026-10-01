# Implementation Plan: Soft Delete Across All Modules

**Branch**: `main` (owner directed for the prior feature; no indication this one changes that —
confirm before Phase 2 if a branch is actually wanted) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-soft-delete/spec.md`

## Summary

Add a soft-delete-and-restore capability to the eleven record types users actually manage:
Hospital, Visit, Training, TrainingTemplate, Practitioner, Equipment, Policy, OrgDocument,
DocumentCenterFile, Program/ProgramFolder, and Coordinator/User accounts. Today none of these can
be deleted at all — this is new capability, not a conversion of existing hard deletes. The core
technical risk is that "soft delete" only works if **every** read of these models, present and
future, excludes deleted rows; with ~36 existing read call-sites across `src/server/queries` and
`src/server/actions` and no automated test suite, hand-adding a filter at each site is exactly the
kind of thing that gets missed once and leaks a deleted record back into a list. The plan is
therefore built around a single Prisma Client Extension that makes the filter structural rather
than a per-call-site convention, plus a `deletionEventId` marker that makes cascade delete/restore
(a Hospital's children, a Program folder's contents) exact rather than approximate.

One hard constraint carries through unchanged from the existing SRS: a completed Visit is never
deletable, by anyone, through any path — enforced at the extension layer itself (see Constitution
Check), not just in the UI or in one action.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19.3, Node 20

**Primary Dependencies**: Next.js 16.3.5 App Router, Prisma 7.10 + `@prisma/adapter-pg` (the
`prisma-client` ESM generator), `zod` 4.6. **No new runtime dependency** — the mechanism is a
Prisma Client Extension (`$extends`), confirmed present in the installed
`@prisma/client/runtime/client.d.ts` and compatible with the `prisma-client` generator already in
use (`src/generated/prisma/client.ts`'s `PrismaClient` type carries the `ExtArgs` extension type
parameter this relies on).

**Storage**: PostgreSQL. **Schema change required** — this is the one feature since the initial
migration that touches `prisma/schema.prisma` broadly: a nullable `deletedAt DateTime?` and a
nullable `deletionEventId String?` added to all eleven in-scope models, plus converting
`User.email` and `User.hospitalId`'s plain `@unique` into partial unique indexes
(`WHERE "deletedAt" IS NULL`) so a deleted coordinator's identity frees up for reuse (spec FR-013).
Ships as one committed migration in `prisma/migrations/`, per the constitution's migration rule.

**Testing**: no test framework is installed and none is added — same scratchpad CDP-browser
harness used for the last three features (seeded scratch PostgreSQL, production build, real
browser automation, positive **and** negative controls for every authorization/scoping claim per
Constitution Principle V) plus `npm run typecheck`, `npm run lint`, `npm run build`.

**Target Platform**: server-rendered web behind an authenticated session; unchanged from every
prior feature.

**Project Type**: single Next.js App Router application; no separate frontend/backend split.

**Performance Goals**: the extension adds one additional `WHERE deletedAt IS NULL` predicate to
existing indexed lookups (`hospitalId`, etc.) — expected to be immeasurable against the render
budgets already established in `specs/004-portal-ui-overhaul/before004/baseline.json`. Re-measured
under SC-related verification, not assumed.

**Constraints**: a completed Visit is never deletable by any user, through any path, including a
direct call bypassing the UI (spec FR-008) — this is the one place the plan requires enforcement
below the UI/action layer, inside the extension itself, so a future call site cannot accidentally
reopen the hole. Delete/restore permission must mirror today's edit permission per module exactly
(spec FR-004). Every delete and restore writes exactly one `AuditLog` row (spec FR-006).

**Scale/Scope**: 11 in-scope models, 6 user stories, 15 functional requirements, 8 success
criteria. Touches `prisma/schema.prisma`, one new Prisma Client Extension module, every action
file under `src/server/actions/` that currently has no delete capability, a new central-only Trash
view per module, and `docs/CLAUDE_REFERENCE.md` §9 (this feature is scope the SRS's FR-1…FR-43
don't themselves define — see Constitution Check).

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| **I. Server-Only Data Access** | **PASS** | The extension lives under `src/server/db.ts`/a new `src/server/db/softDelete.ts`, both already `server-only`. No client component gains a Prisma import — delete/restore reach the server exclusively through new Server Actions, matching every existing action's shape. |
| **II. Layered Server-Side Authorization** | **PASS, with one structural addition** | Every new delete/restore action calls `requireActionUser()`/`requireActionCentral()`, validates the target id, and loads it scoped by `{ id, ...hospitalScope(actor) }` before acting — identical to every existing action (spec FR-004, FR-007). The one new layer beyond the existing four: the completed-Visit exception (FR-008) is enforced *inside the Prisma extension itself*, not only in the action, so it holds even if a future action forgets to check status explicitly — this is an addition to defense-in-depth, not a substitute for the action-level check, which still happens too. |
| **III. No Backdoors, No Fabricated Data** | **PASS** | Nothing here invents data; a restored record's fields come from the same row, unmodified. The Trash view shows real removal metadata (actor, timestamp) read from `AuditLog`, never a placeholder. |
| **IV. Spec-Anchored Scope** | **PASS, with one recorded deviation to make** | The SRS's functional requirements (FR-1…FR-43) do not themselves define a delete/remove capability for any module — this is new scope, consistent with the SRS's own general "create/edit/delete" description of the architecture and touching nothing in its explicit exclusions (§6). Per Principle IV this must be recorded in `docs/CLAUDE_REFERENCE.md` §9 once implemented, the same way the previous feature's owner-directed additions were recorded. The one binding existing SRS rule this feature touches — a completed Visit's permanent immutability — is preserved exactly, not relaxed (spec FR-008, Assumptions). |
| **V. Evidence Before Done** | **PASS** | This feature is authorization- and data-scoping-heavy by nature (spec FR-004, FR-005, FR-007), so Principle V's stronger clause governs throughout: every permission boundary (coordinator vs. central, own-hospital vs. other-hospital, completed-visit exception, last-central-admin guard) needs both a refused attempt and an equivalent allowed one verified against a running build, not inferred from the code. |

**Security & Data Integrity**: the audit trail requirement (constitution: "every mutation MUST
write an `AuditLog` entry inside the same transaction") extends naturally to delete and restore —
both are mutations. The existing immutability rule ("a completed visit MUST reject further
writes, including by central") is what FR-008 exists to preserve, not weaken. No env var, upload,
or session-cookie behavior changes.

**No violations require justification** in the sense the Complexity Tracking table is for — but
one piece of added structure is worth naming without being a violation: enforcing the
completed-Visit exception inside the Prisma extension (not only the action) is deliberately
redundant with the action-level check, because Principle II's "one missed check is not a breach"
reasoning applies most sharply to the one rule this feature is absolutely not allowed to get
wrong.

## Project Structure

### Documentation (this feature)

```text
specs/005-soft-delete/
├── plan.md              # This file
├── spec.md              # 6 user stories, 15 FRs, 8 SCs
├── research.md           # Phase 0 — R-001..R-0xx
├── data-model.md         # Phase 1 — schema changes, migration shape
├── quickstart.md         # Phase 1 — validation guide
├── contracts/
│   └── soft-delete.md    # Phase 1 — the extension/action/Trash-view contract every module follows
├── checklists/
│   └── requirements.md   # spec quality checklist, already passing
└── tasks.md              # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                        # deletedAt + deletionEventId on 11 models; partial unique indexes on User
└── migrations/
    └── <timestamp>_soft_delete/         # one committed migration

src/
├── server/
│   ├── db.ts                            # apply the extension when constructing the client
│   ├── db/
│   │   └── softDelete.ts                # NEW — the extension: read-filtering + delete/deleteMany redirection + the completed-Visit hard exception
│   ├── audit.ts                         # AuditEntity gains 'TrainingTemplate', 'ProgramFolder'
│   ├── actions/
│   │   ├── hospitals.ts                 # + deleteHospital, restoreHospital (cascade)
│   │   ├── visits.ts                    # + deleteVisit, restoreVisit (completed-visit refusal)
│   │   ├── trainings.ts                 # + deleteTraining/restoreTraining, deleteTrainingTemplate/restoreTrainingTemplate
│   │   ├── practitioners.ts             # + deletePractitioner, restorePractitioner
│   │   ├── equipment.ts                 # + deleteEquipment, restoreEquipment
│   │   ├── policies.ts                  # + deletePolicy, restorePolicy
│   │   ├── org-documents.ts             # + deleteOrgDocument, restoreOrgDocument
│   │   ├── document-center.ts           # + deleteDocumentCenterFile, restoreDocumentCenterFile
│   │   ├── programs.ts                  # + deleteProgramNode, restoreProgramNode (folder/file/program, cascade)
│   │   └── coordinators.ts or hospitals.ts  # + deleteCoordinator, restoreCoordinator (email/hospitalId reuse; self/last-admin guards)
│   └── queries/
│       └── trash.ts                     # NEW — per-module trash listings, using the extension's unfiltered escape hatch
└── components/
    └── views/
        └── TrashView.tsx (+ per-module route or a tabbed single screen — decided in Phase 1)  # NEW — central-only

docs/
└── CLAUDE_REFERENCE.md                  # §9 — new recorded deviation/addition for this feature
```

**Structure Decision**: no new top-level directory. The extension lives beside the existing
`src/server/db.ts` singleton it wraps. Delete/restore actions land in each module's *existing*
action file, next to that module's create/update functions, rather than a separate
`src/server/actions/delete.ts` grab-bag — matching how every module already organizes its own
Server Actions together (constitution 5.5: feature-based organization).

## Delivery Order and Gates

Ordered so the riskiest, most-reused piece (the extension) lands first and is proven correct on
the simplest module before anything cascading or exception-bearing depends on it.

| # | Story | Why here | Gate before starting |
|---|---|---|---|
| 1 | **Foundation** — schema migration + the Prisma extension itself, proven against Practitioner/Equipment (User Story 1) | Everything else depends on the extension existing and being correct; Practitioner/Equipment are the lowest-risk proof (no cascade, no exceptions) | none |
| 2 | **US2 — Policies/Org Docs/Doc Center** | Same mechanism, confirms the central-only permission variant | Foundation proven |
| 3 | **US3 — Visits/Trainings** | Introduces the one hard exception (completed Visit); highest-stakes correctness requirement in the feature | Foundation proven |
| 4 | **US6 — Training Templates + Coordinator accounts** | Introduces the partial-unique-index identity-reuse behavior and the self/last-admin guards; no cascade yet | US2/US3 proven (reuses their permission patterns) |
| 5 | **US4 — Hospitals (cascade)** | First cascade case; depends on Practitioner/Equipment/Visit/Training/Coordinator delete already working correctly | US1, US3, US6 proven |
| 6 | **US5 — Programs/Program Folders (cascade)** | Second, structurally different cascade case (self-nesting tree) | Foundation proven; independent of US4 |
| 7 | **Trash view** | Cross-cutting UI once every module's restore action exists | US1 through US6 |

After each story: record the files modified and what changed (spec FR pattern, matching the prior
feature's per-phase record convention), and run the three gates.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 artifacts were written. **Still passing.** The Phase 1 design did not
introduce anything beyond what the Constitution Check above already accounted for:

- **I**: the extension and every new query file stay under `src/server/**`, `server-only`
  throughout; no client component gains a database import.
- **II**: `data-model.md` and `contracts/soft-delete.md` confirm every delete/restore action keeps
  the existing four-layer authorization shape, with the one deliberate addition (the completed-
  Visit rule enforced inside the extension itself, R-004) already identified pre-Phase-0 and not
  expanded further during design.
- **III**: nothing in the schema or contract introduces a fabricated value; restore reproduces
  exactly what was stored.
- **IV**: the one deviation identified pre-Phase-0 (this is new scope beyond the SRS's FR-1…FR-43)
  is unchanged in nature; `docs/CLAUDE_REFERENCE.md` §9 gets the recorded entry during
  implementation, once there is an actual shipped change to describe, matching how the prior
  feature's deviations were recorded after, not before, the work landed.
- **V**: `quickstart.md`'s per-story validation explicitly pairs every permission boundary with a
  negative and a positive control, and the "whole-feature checks" table's "no leaked deleted
  records" row is the direct verification of this feature's central risk (R-001) — not inferred,
  observed.

The migration (data-model.md) is the one genuinely new piece of process this feature adds relative
to the last three: it must be committed and applied before any dependent code deploys, per the
constitution's migration rule, which the Delivery Order table's "Foundation" phase exists to
respect (schema first, proven against the simplest model, before any story that depends on it
starts).
