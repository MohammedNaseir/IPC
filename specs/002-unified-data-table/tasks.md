---

description: "Task list for the unified data table across record screens"
---

# Tasks: Unified Data Table for Record Screens

**Input**: Design documents from `/specs/002-unified-data-table/`

**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md — all present

**Tests**: No automated test framework exists in this repository, and the spec does not request TDD. Per
constitution Principle V, verification tasks use the standard gates plus the per-screen matrix and the
scripted role-scoping comparison in [quickstart.md](./quickstart.md). They are blocking tasks, not extras.

**Organization**: Tasks are grouped by user story. The shared table is built once in Phase 2 with the wide
(table) layout; the stacked-card layout arrives in User Story 3, so each story stays independently
demonstrable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 per spec.md
- Exact file paths are included in every task

## Path Conventions

Single Next.js application at repository root: `src/lib/`, `src/components/table/`,
`src/components/views/`, `src/app/(portal)/`. No `tests/` directory exists.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The pure logic every table depends on, and the pre-migration baseline that makes the
role-scoping regression check meaningful

- [X] T001 [P] Create `src/lib/table.ts` with the presentation types and pure helpers from data-model.md: `ColumnDef<T>` (`key`, `header`, `value: (row) => string | number | null`, optional `render`, `type: 'text' | 'number' | 'date'` defaulting to `'text'`, `sortable` defaulting to `true`, `searchable` defaulting to `true` for text and `false` otherwise, optional `align: 'start' | 'end'`, optional `hideBelowMd`), `RowAction<T>` (`label`, `icon`, `onSelect`, optional `isAvailable`, optional `tone`) — and **no delete action type**, since no delete operation exists in the product
- [X] T002 [P] Add `compareValues(a, b, type)` and `normalizeForSearch(text)` to `src/lib/table.ts` per research.md R-002/R-003: one **module-level cached** `Intl.Collator('ar', { numeric: true, sensitivity: 'base' })` for `'text'`, timestamp comparison for `'date'`, numeric comparison for `'number'`, and `null` values sorted **last in both directions**; normalisation trims, lowercases, strips Arabic diacritics (U+064B–U+0652) and tatweel (U+0640), and unifies `أ إ آ ٱ` → `ا` — and must **not** fold `ة`→`ه` or `ى`→`ي` (rejected in R-003), and must never alter the displayed value
- [X] T003 Stand up the verification environment and **capture the pre-migration baseline** per quickstart.md §4 — scratch database, built server, one central user, two hospitals each with a coordinator, 60+ visits and 60+ trainings, plus practitioners, equipment, the three document types and a nested programme; include the awkward values quickstart.md demands (diacritics `مُستشفى`, alef variants `أحمد`/`احمد`, a 150-character title, records with absent compliance score / licence number / maintenance date, two records sharing a name). Record, per screen and per role, the rendered record set — this baseline MUST exist before any screen is migrated or SC-006 cannot be proven

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared table itself, wide layout only. No screen may be migrated until this is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `src/components/table/TableSkeleton.tsx` — loading placeholder sized like a table page, Arabic RTL, no data dependencies
- [X] T005 [P] Create `src/components/table/TableEmptyState.tsx` — two distinct Arabic messages, "this screen has no records" vs "no records match the current filter" (FR-012), chosen by the caller, never substituted for one another
- [X] T006 [P] Create `src/components/table/TableToolbar.tsx` — search input with Arabic placeholder plus the matching-record count
- [X] T007 [P] Create `src/components/table/TablePagination.tsx` — Arabic page controls showing current page, page count and matching total, with a page-size selector offering 10 / 25 / 50 / 100 (default 25)
- [X] T008 Create `src/components/table/useTableState.ts` (depends on T001, T002) returning the `TableState` in data-model.md: `query`/`setQuery`, `sort`/`toggleSort`, `page`/`setPage`, `pageSize`/`setPageSize`, `filteredRows`, `visibleRows`, `totalCount`, `filteredCount`, `pageCount`; setting `query` or changing the sort key MUST reset `page` to 1 (FR-009), and `page` MUST clamp into range when the filter shrinks the set so a blank page is impossible
- [X] T009 Create `src/components/table/DataTable.tsx` (depends on T004–T008) implementing the wide layout per contracts/data-table-component.md: real `<table>` with `<th scope="col">`, `aria-sort` on the active sortable header, sort controls as `<button>`s, trailing actions column, row activation via `onRowSelect`/`selectedRowKey` owned by the parent, `isLoading` rendering `TableSkeleton`, `onStateChange` reporting `filteredRows`/`filteredCount`, and null values rendering as an explicit dash. It MUST NOT import from `@/server/**`, mutate `rows`, call a Server Action, or derive any value the caller did not supply
- [X] T010 Verify the pure helpers directly per quickstart.md §6 with a throwaway script: Arabic alphabetical ordering, numeric ordering ("9" before "10"), date ordering, nulls last in both directions, diacritic and alef normalisation, and that normalisation leaves displayed values untouched

**Checkpoint**: The shared table works in isolation; no screen has changed yet

---

## Phase 3: User Story 1 - Find one record in a long list (Priority: P1) 🎯 MVP

**Goal**: Sorting, search and paging on the highest-volume screen, so a specific visit is reachable in
seconds instead of by scrolling cards

**Independent Test**: On `/visits` with 60+ records, search a term matching a few, sort by two different
columns, page forward and back, and confirm the record is reachable with counts that stay consistent

- [X] T011 [US1] Define the visits column set in `src/components/views/VisitsView.tsx` per data-model.md row 3: hospital, visit date (`type: 'date'`), team, status, compliance score (`type: 'number'`, dash when null), attachment count, response count — every value formatted exactly as the current cards format it (FR-023)
- [X] T012 [US1] Replace the visits list column markup in `src/components/views/VisitsView.tsx` with `<DataTable />`, keeping the existing left-list/right-detail arrangement and the existing status and hospital filter selects that already sit above the list
- [X] T013 [US1] Wire selection in `src/components/views/VisitsView.tsx`: keep the selected visit id in the view (not in the table), pass it as `selectedRowKey` with `onRowSelect`, and preserve the selection across sorting, searching and paging; when the active filter excludes the selected visit, the detail panel shows an Arabic notice instead of stale content (FR-021)
- [X] T014 [US1] Point the visits heading count in `src/components/views/VisitsView.tsx` at `filteredCount` via `onStateChange`, so the heading and the table agree under every filter (FR-006, SC-007)
- [X] T015 [US1] Add `src/app/(portal)/visits/loading.tsx` rendering `TableSkeleton`, satisfying FR-013 where loading actually occurs — the route transition (research.md R-006)
- [X] T016 [US1] Verify User Story 1 against a running build per quickstart.md §1 (all 11 checks, including the 1,000-row responsiveness target SC-004) and the keyboard checks in §5, and record the observed results

**Checkpoint**: Visits is fully usable with sort/search/paging — a complete, shippable slice

---

## Phase 4: User Story 2 - The same table everywhere (Priority: P2)

**Goal**: Every record screen presents its records through the same table, with per-screen columns and only
the row actions that screen already supports

**Independent Test**: Visit each migrated screen and confirm identical table mechanics, columns and actions
appropriate to that screen, and data identical to the pre-migration baseline

- [X] T017 [US2] Migrate trainings in `src/components/views/TrainingsView.tsx` to `<DataTable />` per data-model.md row 4 (title, hospital, kind central/internal, status, attendee count, due date), keeping master-detail selection and the attendance/execution panel exactly as they are
- [X] T018 [P] [US2] Migrate the practitioners list in `src/components/views/AssetsView.tsx` per data-model.md row 5 (name, role, licence number, hospital, email) with the existing edit action as a row action
- [X] T019 [P] [US2] Migrate the equipment list in `src/components/views/AssetsView.tsx` per data-model.md row 6 (name, type, serial number, hospital, status, last maintenance as `type: 'date'`) with the existing edit action; practitioners and equipment MUST each get their own table instance so sort/search/page state cannot leak between sub-sections (FR-020)
- [X] T020 [US2] Migrate all three document lists in `src/components/views/DocumentsView.tsx` per data-model.md rows 7–9 — one component, three column configurations (policies: title, category, version, size, uploaded at; org documents: title, type, uploaded by, size, uploaded at; document centre: title, uploaded by, size, uploaded at) — with the download link as the row action and the central-only upload button untouched
- [X] T021 [US2] Migrate the hospitals list in `src/components/views/HospitalsView.tsx` per data-model.md row 1 (name, type, location, coordinator, visit/training/practitioner/equipment counts, status) with the existing open-profile, edit and toggle-status row actions, `isAvailable` hiding any action a row cannot accept
- [X] T022 [US2] Migrate the coordinator directory in `src/components/views/HospitalsView.tsx` per data-model.md row 2 (coordinator name, hospital, email, status) with its existing edit-credentials, edit-hospital and assign-coordinator actions, as a separate table instance from T021 (FR-020)
- [X] T023 [US2] Migrate the programme contents list in `src/components/views/ProgramsView.tsx` per data-model.md row 10 and research.md R-009: the table lists the current node's children (folders first, then files) with a kind column; breadcrumbs, drilling in and the back affordance stay unchanged, and navigating to another node resets sort, search and page
- [X] T024 [US2] Migrate the audit log in `src/components/views/AuditView.tsx` per data-model.md row 11, replacing its hand-written `<table>`; the CSV export MUST emit the filtered-and-sorted set from `onStateChange`/`filteredRows`, preserving today's semantics exactly (research.md R-007) — neither the raw array nor the current page
- [X] T025 [US2] Migrate the hospital comparison table in `src/components/views/DashboardView.tsx` per data-model.md row 12 (name, type + location, coordinator, completed visits, compliance rate, status); the KPI cards, alert cards, bar chart and donut are out of scope and MUST remain untouched
- [X] T026 [US2] Migrate the embedded record lists in `src/components/views/HospitalProfileView.tsx` and the hospitals "comprehensive profile" (visits, trainings, practitioners, equipment for one hospital) to `<DataTable />` with narrower column sets; the surrounding summary panels stay as they are
- [X] T027 [US2] Verify the simple lists per contracts/screen-migration-contract.md's 10-point acceptance — trainings, practitioners, equipment and the three document lists — recording pass/fail per list
- [X] T028 [US2] Verify `src/components/views/HospitalsView.tsx` (both sub-sections) and `src/components/views/ProgramsView.tsx` against the 10-point acceptance in contracts/screen-migration-contract.md, with particular attention to sub-section state isolation and breadcrumb navigation resetting table state
- [X] T029 [US2] Verify `src/components/views/AuditView.tsx` and the comparison table in `src/components/views/DashboardView.tsx` against the 10-point acceptance in contracts/screen-migration-contract.md, and confirm the audit export contains exactly the filtered rows for at least two different filters
- [X] T030 [US2] Confirm every migrated screen reports its heading count from the filtered set, and that no screen retains bespoke list markup — `grep` the view files for leftover record-list `grid-cols` blocks and hand-written `<table>` elements (SC-002)

**Checkpoint**: All 12 lists render through the shared table; mechanics identical everywhere

---

## Phase 5: User Story 3 - Usable on a narrow screen (Priority: P3)

**Goal**: Below the small-screen breakpoint, records become stacked cards instead of a horizontally
scrolling table

**Independent Test**: Open every migrated screen at a 400px-wide viewport and confirm stacked cards, no
horizontal page scrolling, readable fields and reachable actions

- [X] T031 [US3] Add the stacked-card layout to `src/components/table/DataTable.tsx` per research.md R-004: render both layouts and switch with Tailwind breakpoint classes (cards below `md`, table from `md` up) — no `matchMedia`, no resize listener, so the first paint is correct and server and client markup agree
- [X] T032 [US3] In `src/components/table/DataTable.tsx`, render each card as a definition list so every value keeps its label programmatically (FR-022), place row actions in the card footer, and omit columns marked `hideBelowMd` (FR-015)
- [X] T033 [US3] Set `hideBelowMd` on the columns that are noise on a phone, editing the column definitions in `src/components/views/HospitalsView.tsx` (the four per-hospital counts from T021), `src/components/views/AuditView.tsx` (the entity id) and any other migrated view whose wide layout carries secondary fields, keeping every screen's primary identifying fields visible
- [X] T034 [US3] Verify User Story 3 per quickstart.md §3 on every migrated screen at 400px — stacked cards, no horizontal page scroll, search/sort/paging still functional, actions reachable, RTL Arabic labels throughout — and confirm the table layout returns above the breakpoint

**Checkpoint**: All three stories complete and independently demonstrable

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T035 Run the scripted role-scoping comparison per quickstart.md §4 against the T003 baseline: for coordinator A, coordinator B and central, assert each migrated screen's record set is unchanged and contains zero markers from another hospital (FR-017, SC-006) — this is the failure mode a screenshot cannot catch
- [X] T036 Assert the change is rendering-only: `git diff --stat -- src/server prisma` MUST be empty, and `git diff --stat -- package.json` MUST show no new dependency (FR-018, SC-005, research.md R-001)
- [X] T037 Run the accessibility spot checks in quickstart.md §5 on two migrated screens — tab reach for sort headers and row actions, `aria-sort` on the active header, keyboard row activation on a master-detail screen, and label association in the card layout
- [X] T038 [P] Update `docs/CLAUDE_REFERENCE.md`: record the shared table in `src/components/table/` as the convention for rendering record lists so future screens do not reintroduce bespoke card grids, and state plainly that paging is client-side with server-side paging deferred, so nobody reads this feature as having fixed large-list performance
- [X] T039 Run the gates and record their output: `npm run typecheck`, `npm run lint`, `npm run build` (constitution Principle V) — run `typecheck` continuously from Phase 2 onward rather than only here
- [X] T040 Record the completed per-screen verification matrix (12 lists × the 10-point acceptance from contracts/screen-migration-contract.md, walked per quickstart.md §2) in the PR description, together with the timing observations from T016 and the role-scoping result from T035

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001/T002 can start immediately; **T003 must complete before any screen is migrated**, because the baseline cannot be captured after the fact
- **Foundational (Phase 2)**: T008 needs T001+T002; T009 needs T004–T008. Blocks every user story
- **US1 (Phase 3)**: needs Phase 2; delivers the MVP
- **US2 (Phase 4)**: needs Phase 2. Independent of US1, though doing US1 first proves the mechanics on one screen before 11 more follow
- **US3 (Phase 5)**: needs Phase 2; extends `DataTable`, so it touches one shared file and is best done after the migrations settle
- **Polish (Phase 6)**: T035/T036/T039/T040 after the screens being shipped are migrated; T037/T038 any time after Phase 4

### Within each user story

- Column definitions before the markup swap that uses them (T011 → T012)
- Markup swap before selection wiring and heading counts (T012 → T013 → T014)
- Migration before that screen's verification task (T017–T026 → T027–T029)

### Parallel Opportunities

- T001 and T002 are the same file and MUST be sequential; T004–T007 are four separate files and can run together
- T018 and T019 are two lists but the **same file** (`AssetsView.tsx`) — marked `[P]` only because they are independent lists; if one developer takes both, do them sequentially. Two developers must not edit the file simultaneously
- T021 and T022 both edit `HospitalsView.tsx` — strictly sequential
- T031–T033 all edit `DataTable.tsx` (T033 touches view files too) — sequential
- T038 is documentation and runs alongside anything in Phase 6

## Parallel Example: Phase 2

```bash
# Four independent files, safe together:
Task: "Create src/components/table/TableSkeleton.tsx (T004)"
Task: "Create src/components/table/TableEmptyState.tsx (T005)"
Task: "Create src/components/table/TableToolbar.tsx (T006)"
Task: "Create src/components/table/TablePagination.tsx (T007)"
```

## Implementation Strategy

### MVP (recommended scope)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 User Story 1
2. **STOP and VALIDATE**: quickstart.md §1 plus the role-scoping check for visits only
3. Visits — the highest-volume screen — becomes searchable, sortable and paged, which is the pain that
   motivated the feature. Every other screen still works exactly as before

### Incremental delivery

1. Setup + Foundational → shared table exists, no screen changed
2. US1 → visits migrated → validate → ship (MVP)
3. US2 → remaining 11 lists, in the risk order of contracts/screen-migration-contract.md (trainings →
   simple lists → hospitals → programmes → audit/dashboard) → validate per family → ship
4. US3 → stacked-card layout → validate at 400px → ship
5. Polish: role-scoping comparison, rendering-only assertion, docs, gates

### Parallel team strategy

After Phase 2, one developer can take US1 (visits) while another takes the simple lists in US2
(practitioners, equipment, documents), since those touch different view files. Hospitals and programmes
should go to whoever finishes first rather than being split — `HospitalsView.tsx` is a single 1,131-line
file with two lists in it.

## Notes

- 40 tasks: 3 setup, 7 foundational, 6 + 14 + 4 across the three stories, 6 polish
- `[P]` means different files and no dependency on unfinished work — read the caveats above for
  `AssetsView.tsx` and `HospitalsView.tsx`
- Verification tasks (T010, T016, T027–T030, T034–T037, T039) are blocking; there is no test suite to
  fall back on, and this change rewrites list rendering across ~5,200 lines of views
- T003's baseline is the one task with no second chance: capture it before migrating anything
- No task may edit `src/server/**` or `prisma/**`; T036 enforces it

---

## Verification record (T040)

Run against a scratch PostgreSQL database and a production build (`output: 'standalone'`), never Neon.
Seed: 3 hospitals (2 with coordinators), 62 visits, 101 trainings, 12 practitioners, 12 equipment,
5 policies, 3 org documents, 4 doc-centre files, 2 programmes with 4 folders and 5 files — including the
awkward values quickstart.md demands (diacritics, alef variants, a 150-character title, absent compliance
scores / licence numbers / maintenance dates, two practitioners sharing a name).

| Suite | What it proves | Result |
|---|---|---|
| Pure helpers (quickstart §6) | Arabic collation, numeric and date ordering, nulls last both ways, normalisation | **23/23 pass** |
| User Story 1 (quickstart §1, §5) | Sorting, search, paging, both empty states, selection, keyboard on `/visits` | **26/26 pass** |
| Per-screen acceptance (quickstart §2) | The 10-point contract across all 12 lists, both roles | **157/157 pass** |
| Narrow viewport (quickstart §3) | 14 tables at 400px: cards, labels, no page scroll, sort/search/paging, RTL, table returns ≥ md | **126/126 pass** |
| Role scoping vs. pre-migration baseline (quickstart §4) | 33 screen/role payloads identical; zero cross-hospital markers; positive control | **all match** |
| Accessibility (quickstart §5) | `th[scope]`, single `aria-sort`, named buttons, Space/Enter row activation, `dt`/`dd` cards | **13/13 pass** |
| Heading counts | Every heading that carries a count follows the filter | **5/5 pass** |
| Volume (SC-004) | 1,000 visits: sort 127–160 ms, filter 131–146 ms, page 101 ms (end to end, incl. paint) | **pass** |
| Gates | `npm run typecheck`, `npm run lint`, `npm run build` | **all clean** |
| Rendering-only proof (FR-018, SC-005) | `git diff --stat -- src/server prisma` empty; `package.json` unchanged | **empty / unchanged** |

Three defects were found and fixed during verification:

1. **Sub-section state leaked between tabs.** `AssetsView` renders a `DataTable` at the same tree position
   for both sub-sections, so React reused one instance and carried the search term and sort across tabs —
   an FR-020 violation invisible in a screenshot. Fixed with distinct React `key`s on each instance
   (`HospitalsView`'s two tables were keyed for the same reason).
2. **Horizontal page scroll on `/trainings` at 400px.** The three filter selects cannot shrink below their
   intrinsic width, overflowing the viewport by 52px. Fixed by letting that row wrap.
3. **A page-size control that changed the wrong thing.** (Harness defect, not product: the helper picked the
   card layout's sort select. Recorded because it initially looked like a product failure.)

Observations recorded rather than fixed:

- At 100 rows per page the same 1,000-row interactions cost ~320–355 ms, because both layouts are rendered
  and switched by CSS (research.md R-004). SC-004 is measured at the default 25-row page.
- ICU's Arabic collation keeps `آ` distinct from `أ`/`ا`, so `آ`-initial values sort before them. Search
  normalisation unifies all three; sorting deliberately does not.
