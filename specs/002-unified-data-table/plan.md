# Implementation Plan: Unified Data Table for Record Screens

**Branch**: `002-unified-data-table` (spec directory; work is on `main`) | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-unified-data-table/spec.md`

## Summary

Introduce one shared table for every record screen: per-screen column definitions, single-column
sorting, substring search, client-side paging, per-row view/edit actions, distinct empty states, a
loading skeleton, Arabic RTL throughout, and a stacked-card layout below the small-screen breakpoint
instead of a horizontally scrolling table.

Technical approach: a presentational `DataTable` component plus a `useTableState` hook that derives
the visible rows from an already-loaded array. Screens keep their existing server components, queries
and actions untouched; they change only from hand-rolled card grids to a column definition plus the
shared component. Sorting is Arabic-aware via a cached `Intl.Collator`, search normalises Arabic
orthography before matching, and the responsive collapse is pure CSS (both layouts rendered, one shown
per breakpoint) so there are no resize listeners and no hydration mismatch. The hook also exposes the
filtered row set so screens that already report counts in headings, and the audit screen's export, stay
consistent with what the user sees.

Paging is client-side only, per the product owner's decision recorded in the spec. This plan therefore
improves findability, not load time or memory.

## Technical Context

**Language/Version**: TypeScript ~5.8 on Node >=20.9

**Primary Dependencies**: Next.js 16.3.5 (App Router), React 19.3, Tailwind 4, lucide-react. **No new
runtime dependency** — see [research.md](./research.md) R-001 (hand-rolled over TanStack Table).

**Storage**: None. This feature touches no data layer: no Prisma schema change, no migration, no query
change (FR-018).

**Testing**: No automated test framework exists. Verification is the standard gates
(`npm run typecheck`, `npm run lint`, `npm run build`) plus a per-screen matrix and a scripted
role-scoping comparison, detailed in [quickstart.md](./quickstart.md).

**Target Platform**: Arabic/RTL browser UI, desktop and phone; Node standalone server behind IIS.

**Performance Goals**: Sorting or filtering 1,000 rows updates without perceptible delay (SC-004);
paging renders at most one page of rows (default 25) into the DOM per layout.

**Constraints**: Rendering layer only — no change to queries, server rules, routes, or the records any
role can see. Every displayed value must be one the screen already shows, formatted as today (FR-023).

**Scale/Scope**: 9 view files, ~5,200 lines today. 12 record lists across 8 screens migrate (inventory
in [data-model.md](./data-model.md)); the dashboard's metric cards/charts and the hospital profile's
summary panels stay as they are.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Server-Only Data Access | The table and its hook are client-only presentation; they import no `@/server/*` module, receive already-serialised DTOs as props, and add no data access | **PASS** (design) |
| II. Layered Server-Side Authorization | No authorization surface changes. Client-side filtering is explicitly *not* a security control: every screen still receives only its role-scoped rows from existing scoped queries. Sorting/searching/paging operate inside that already-scoped set | **PASS** (design) |
| III. No Backdoors, No Fabricated Data | No seed or sample rows; FR-023 forbids inventing displayed values; absent values render as an explicit dash rather than a plausible number | **PASS** (design) |
| IV. Spec-Anchored Scope | Pure presentation change; the SRS's list+detail requirement (NFR 5.3) is preserved by keeping master-detail screens' detail panels. "Delete" row actions from the feature description are excluded because no delete operation exists — recorded in the spec, no new SRS deviation needed | **PASS** |
| V. Evidence Before Done | Gates plus a per-screen before/after matrix and a scripted role-scoping comparison for both roles; a diff check proving `src/server/**` and `prisma/**` are untouched | **PASS** (planned) |
| Constraint: audit trail | No mutations added, so no new audit entries; the audit *screen* keeps its export semantics | **PASS** |
| Constraint: Arabic/RTL | FR-014/FR-016 require Arabic RTL in both layouts, including paging and sort indicators | **PASS** (design) |
| Constraint: migrations | None required | **N/A** |
| Constraint: production data | None touched | **N/A** |

**Risk to manage, not a violation**: Principle II holds only if each migrated screen keeps passing the
same role-scoped data. The realistic failure mode of this feature is a screen accidentally rendering an
unscoped array while its markup is rewritten, so SC-006 verification is mandatory per screen rather than
sampled.

**Post-Phase-1 re-check**: no new violations; no dependency added, so Complexity Tracking stays empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-unified-data-table/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — presentation types + per-screen column inventory
├── quickstart.md        # Phase 1 output — validation guide
├── contracts/           # Phase 1 output
│   ├── data-table-component.md
│   └── screen-migration-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── table.ts                                # NEW: ColumnDef/RowAction/TableState types,
│                                               # Arabic collator + search normalisation helpers
├── components/
│   ├── table/
│   │   ├── DataTable.tsx                       # NEW: table + stacked-card rendering, RTL, a11y
│   │   ├── TableToolbar.tsx                    # NEW: search field + result count
│   │   ├── TablePagination.tsx                 # NEW: page controls + page-size selector
│   │   ├── TableEmptyState.tsx                 # NEW: "no records" vs "no matches"
│   │   ├── TableSkeleton.tsx                   # NEW: loading state
│   │   └── useTableState.ts                    # NEW: sort/search/page state → visible + filtered rows
│   └── views/
│       ├── HospitalsView.tsx                   # hospitals grid + coordinators directory → 2 tables
│       ├── VisitsView.tsx                      # master-detail list column → table
│       ├── TrainingsView.tsx                   # master-detail list column → table
│       ├── AssetsView.tsx                      # practitioners + equipment → 2 tables
│       ├── DocumentsView.tsx                   # policies / org-docs / doc-centre → 1 table, 3 configs
│       ├── ProgramsView.tsx                    # current-node contents → table, breadcrumb kept
│       ├── AuditView.tsx                       # existing table → shared table, export preserved
│       ├── DashboardView.tsx                   # hospital comparison table → shared table only
│       └── HospitalProfileView.tsx             # embedded record lists → tables; panels unchanged
└── app/(portal)/
    └── */loading.tsx                            # NEW (per migrated route): skeleton for route loading

docs/
└── CLAUDE_REFERENCE.md                          # note the shared table as the list-rendering convention
```

**Structure Decision**: The table lives in a new `src/components/table/` directory rather than beside
the views, because it is shared infrastructure rather than a screen. Pure logic (comparison, search
normalisation, types) goes in `src/lib/table.ts` so it is importable by both client components and the
verification harness without pulling React in. `loading.tsx` files satisfy FR-013 at the route level,
which is where loading actually occurs in this app — no screen fetches client-side (research.md R-006).

## Complexity Tracking

> No constitution violations require justification. No runtime dependency is added, and no
> architectural layer is introduced: one shared component plus one hook replaces nine bespoke list
> implementations, which reduces total surface rather than expanding it.
