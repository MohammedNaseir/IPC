# Implementation Plan: Full-Page Record Views for Visits and Trainings

**Branch**: `003-full-page-record-views` (spec directory; work is on `main`) | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-full-page-record-views/spec.md`

## Summary

Give every visit and every training its own page. Activating a row in either list navigates to that
record's address instead of opening a side panel; the detail content and every action move across
unchanged; the list keeps its search, sort, filter and page when the user comes back; and the embedded
visit and training lists on the two profile screens navigate to the same pages.

Technical approach: two new dynamic route segments under the portal, each a server component that
resolves one record through a new scoped query and calls `notFound()` when the record is absent *or* out
of the caller's scope — the same outcome for both, so the address cannot be used to discover whether
another hospital's record exists. The detail markup moves out of the two list views into client
components that the new pages render, carrying their modals, forms and action calls with them. List state
survives the round trip through an optional `stateKey` on the shared table, which restores from a
client-side store on mount instead of from the address. Rows gain a real link on their primary cell
alongside the existing row activation, so the destination is announced as a navigation.

This feature touches `src/server/**` — deliberately, and unlike feature 002. A new way to reach a record
requires a new scoped query. It touches no schema, no migration, and no Server Action.

## Technical Context

**Language/Version**: TypeScript ~5.8 on Node >=20.9

**Primary Dependencies**: Next.js 16.3.5 (App Router), React 19.3, Prisma 7.10 with the `pg` driver
adapter, Tailwind 4, lucide-react. **No new dependency.**

**Storage**: PostgreSQL via Prisma. **No schema change, no migration.** Two new read queries and one
extraction of existing mapping code; no write path is touched.

**Testing**: No automated test framework exists. Verification is the standard gates
(`npm run typecheck`, `npm run lint`, `npm run build`) plus a scripted authorization probe and a
per-role record-set comparison against a pre-change baseline, detailed in [quickstart.md](./quickstart.md).

**Target Platform**: Arabic/RTL browser UI, desktop and phone; Node standalone server behind IIS.

**Performance Goals**: opening a record fetches that one record rather than the whole list; the record
page renders within the same budget as the existing list screens (SRS NFR 5.1: list screens under two
seconds).

**Constraints**: no change to what any record contains, who may see it, or what any action does. The
detail content and actions move unchanged (FR-012). The lists keep the shared table from feature 002 and
its column sets (FR-015, FR-017).

**Scale/Scope**: six surfaces change — two list views, two new record pages, and the embedded visit and
training tables on `HospitalProfileView` and the hospitals comprehensive profile. `VisitsView` (786 lines)
and `TrainingsView` (899 lines) each split into a list view and a detail view. One additive prop on the
shared table, which 18 table instances share.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Server-Only Data Access | The record pages are server components; they fetch through `src/server/queries/**` and pass serialised DTOs to client components. No client-side data access is added, and no query moves to the client | **PASS** (design) |
| II. Layered Server-Side Authorization | **The material risk in this feature.** A per-record address is a new authorization surface: today a record can only be reached through an already-scoped list. Mitigated at three layers — the route is behind the existing page guard, the record is resolved with `hospitalScope(user)` inside the `where` clause, and an unresolved record produces `notFound()` identically for "absent" and "not yours" | **PASS** (design), verified by SC-005 |
| III. No Backdoors, No Fabricated Data | No seed data, no sample records, no invented content; absent values keep rendering as absent | **PASS** |
| IV. Spec-Anchored Scope | SRS NFR 5.3 requires a consistent list-and-detail pattern across modules. It is preserved: both the list and the detail remain, and only where the detail is presented changes. Hospital Profile already establishes the full-page composition in this product. **No deviation needs recording** | **PASS** |
| V. Evidence Before Done | Gates, a scripted authorization probe with positive controls, a per-role record-set comparison against a pre-change baseline, and a re-run of feature 002's per-screen suite because the shared table gains a prop | **PASS** (planned) |
| Constraint: audit trail | No mutation is added, changed or removed, so no new audit entries and no change to existing ones | **PASS** |
| Constraint: Arabic/RTL | The record pages are Arabic and RTL in the same register as the rest of the product (FR-014) | **PASS** (design) |
| Constraint: migrations | None required | **N/A** |
| Constraint: production data | None touched; verification runs against a scratch database | **N/A** |

**Risk to manage, not a violation**: the shared table gains an optional `stateKey`. It is additive and
inert when unset, but 18 instances depend on that component, so "nothing else changed" is verified rather
than asserted.

**Post-Phase-1 re-check**: no new violations. No dependency added; Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-full-page-record-views/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — the read shapes and the view-state record
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output
│   ├── record-page-contract.md
│   └── list-state-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/(portal)/
│   ├── visits/
│   │   ├── (list)/                             # route group: URLs unchanged, Suspense boundary contained
│   │   │   ├── page.tsx                        # MOVED: renders the list view only
│   │   │   └── loading.tsx                     # MOVED: feature 002's table skeleton, no longer over [id]
│   │   └── [id]/
│   │       ├── layout.tsx                      # NEW: guard + scoped `select id` + notFound() (status only)
│   │       ├── page.tsx                        # NEW: guard + full scoped fetch + notFound()
│   │       └── loading.tsx                     # NEW: record-shaped skeleton
│   ├── trainings/
│   │   ├── (list)/
│   │   │   ├── page.tsx                        # MOVED
│   │   │   └── loading.tsx                     # MOVED
│   │   └── [id]/
│   │       ├── layout.tsx                      # NEW
│   │       ├── page.tsx                        # NEW
│   │       └── loading.tsx                     # NEW
│   └── hospital-profile/page.tsx               # unchanged
├── server/queries/
│   ├── visits.ts                               # + findVisitForUser, listAuditLogsForVisit; mapping extracted
│   └── trainings.ts                            # + findTrainingForUser; mapping extracted
├── components/
│   ├── table/
│   │   ├── DataTable.tsx                       # + optional stateKey, passed through
│   │   ├── useTableState.ts                    # + restore/persist by key
│   │   └── listStateStore.ts                   # NEW: client-only keyed store
│   └── views/
│       ├── VisitsView.tsx                      # list only; detail, modals and selection removed
│       ├── VisitDetailView.tsx                 # NEW: the detail half, moved
│       ├── TrainingsView.tsx                   # list only
│       ├── TrainingDetailView.tsx              # NEW: the detail half, moved, with ExecutionForm
│       ├── HospitalProfileView.tsx             # embedded visit/training rows navigate
│       └── HospitalsView.tsx                   # comprehensive-profile visit/training rows navigate
└── lib/table.ts                                # + stateKey on the table's prop type
```

**Structure Decision**: the record pages live as `[id]` segments under their existing list routes rather
than as new top-level routes, so the portal layout, its guard and its navigation apply unchanged and the
address reads as the record's place in the product.

Each list page sits in a `(list)` route group, which changes no URL but stops the list's `loading.tsx`
from creating a Suspense boundary over `[id]`. That boundary was making Next flush a `200` shell before
the record page could resolve, so `notFound()` rendered the not-found UI under a success status — caught
by the authorization probe and recorded in research.md R-012. The 404 decision therefore lives in
`[id]/layout.tsx`, which resolves above the record page's own boundary. **The layout is a status fix, not
the authorization check**: the page still performs its own full scoped fetch and its own `notFound()`.

The **six-surface gate (FR-021) is unchanged** by this: the surfaces in scope are still the two lists, the
two record pages and the two profile screens' embedded lists. Moving a page into a route group relocates
a file without adding a surface, and T041's assertion on `src/components/views` is untouched. The detail components sit beside their list views in
`src/components/views/` because they are screens, not shared infrastructure. The list-state store is a
separate small module rather than state inside `useTableState`, so that the client-only guard lives in
one place and is obvious to the next reader.

## Complexity Tracking

> No constitution violations require justification. No dependency is added, and no architectural layer is
> introduced: two route segments, two moved components, two scoped read queries and one additive prop.
