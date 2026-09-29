---

description: "Task list for full-page record views for visits and trainings"
---

# Tasks: Full-Page Record Views for Visits and Trainings

**Input**: Design documents from `/specs/003-full-page-record-views/`

**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md — all present

**Tests**: No automated test framework exists in this repository, and the spec does not request TDD. Per
constitution Principle V, verification tasks use the standard gates plus the scripted authorization probe
and the per-role record-set comparison in [quickstart.md](./quickstart.md). They are blocking tasks, not
extras. The authorization probe is the one this feature cannot ship without.

**Organization**: Tasks are grouped by user story. The scoped query layer and the list-state store are
built once in Phase 2 because both record pages need them; each story then delivers one record type end
to end.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 per spec.md
- Exact file paths are included in every task

## Path Conventions

Single Next.js application at repository root: `src/app/(portal)/`, `src/components/views/`,
`src/components/table/`, `src/server/queries/`, `src/lib/`. No `tests/` directory exists.

---

## Phase 1: Setup (Verification Environment and Baselines)

**Purpose**: The environment every later check runs in, and the two baselines that cannot be captured
after the change

- [X] T001 Stand up the verification environment per quickstart.md "Prerequisites": scratch PostgreSQL, a production build of the **current** code, and seed data created through the existing Server Actions — one central user, **a second central user**, two hospitals each with a coordinator, enough visits and trainings to fill several pages on both screens, at least one archived visit, at least one completed training, one visit carrying a report plus attachments plus responses, one training recorded by name list and another by headcount. Record the ids of a visit and a training belonging to hospital A and the equivalents for hospital B; the authorization probe needs them
- [X] T002 Capture the pre-change **per-role record-set baseline** for central, coordinator A and coordinator B across every screen, extending the marker-comparison harness from feature 002. This baseline MUST exist before any screen changes or SC-006 and SC-008 cannot be proven
- [X] T003 Capture the pre-change **content and action inventory** of the side panels per quickstart.md §2: for one archived visit, one open visit, one completed training and one pending training, list every field, panel, button, link and form the panel shows. **Capture the pre-change printed output of the visit panel as well** — print an open visit and an archived visit to PDF and record which sections appear, or at minimum record which elements carry `no-print` — because FR-020 requires the new output to be "at least as complete as what the side panel produced" and T024 has nothing to compare against otherwise. This is the list FR-009 to FR-012 and FR-020 are checked against, and it disappears the moment the panels do

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The scoped single-record queries and the list-state store. No record page may be built until
the queries exist and their scoping is proven.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Extract the existing visit row→DTO mapping out of `listVisits` into a shared mapper in `src/server/queries/visits.ts`, preserving every field and both orderings exactly: attachments by `uploadedAt` ascending, responses by `respondedAt` ascending. Two copies of this mapping would drift, and a record that reads differently on its own page than in the list is the bug this feature must not introduce
- [X] T005 [P] Extract the existing training row→DTO mapping out of `listTrainings` into a shared mapper in `src/server/queries/trainings.ts`, preserving `attendeeCount`, `attendeeNames`, `isInternal`, the attendance ordering by `id` ascending, the attachment ordering by `uploadedAt` ascending, and the `deriveTrainingStatus(stored, dueDate, now)` pass-through
- [X] T006 Add `findVisitForUser(user, visitId): Promise<VisitDTO | null>` and `listAuditLogsForVisit(user, visitId): Promise<AuditLogDTO[]>` to `src/server/queries/visits.ts` (depends on T004). The visit MUST resolve through `findFirst({ where: { id: visitId, ...hospitalScope(user) } })` with the same includes the list query uses, and MUST return `null` when there is no match. Per data-model.md: "`null` means the visit does not exist **or** it is outside the caller's scope. The caller cannot tell which, and must not try." `listAuditLogsForVisit` MUST confirm the visit is in scope before returning its entries, newest first
- [X] T007 Add `findTrainingForUser(user, trainingId): Promise<TrainingDTO | null>` to `src/server/queries/trainings.ts` (depends on T005), resolving through `findFirst({ where: { id: trainingId, ...hospitalScope(user) } })` with hospital name, template due date, attendances and attachments, returning `null` on no match with the same "absent or not yours are indistinguishable" rule
- [X] T008 Prove the scoping at the query layer before any page exists: a throwaway script that calls all three fetchers as the central user, as coordinator A and as coordinator B, against hospital A's ids, hospital B's ids and a fabricated id. Central MUST resolve every real id; each coordinator MUST resolve only their own and receive `null` for the other hospital's real id **and** for the fabricated id. Record the results
- [X] T009 [P] Create `src/components/table/listStateStore.ts`: a client-only keyed store holding `query`, `sort`, `page`, `pageSize` and `filters` (`Record<string, string>`, written by the list view rather than the table) per `stateKey`. Per contracts/list-state-contract.md it MUST be "neither read nor written on the server — module state on the server is shared across requests, so a server-side write would leak one user's view state into another user's render", and MUST be written only from client event handlers, never during a render
- [X] T010 [P] Add the `ListViewState` shape and the optional `stateKey` prop to the table types in `src/lib/table.ts`, documented as inert when unset
- [X] T011 Wire restore-and-persist into `src/components/table/useTableState.ts` (depends on T009, T010): when `stateKey` is set, initialise from the store guarded by a client check so a fresh full load still renders the default state on both server and client, and write back as the user searches, sorts and pages
- [X] T012 Pass `stateKey` through `src/components/table/DataTable.tsx` to the hook (depends on T011), changing nothing else about the component
- [X] T013 Confirm the table is unchanged when `stateKey` is absent: `npm run typecheck`, `npm run lint`, and a spot check of two existing screens (hospitals and the audit log) against feature 002's recorded behaviour

**Checkpoint**: The scoped fetchers are proven at the query layer and the shared table accepts a key; no screen has changed yet

---

## Phase 3: User Story 1 - Read and act on a visit record in full (Priority: P1) 🎯 MVP

**Goal**: Every visit has its own page carrying the full record and every action it had in the side panel

**Independent Test**: Open a visit from the list on desktop and at 400px; confirm every item on the T003
inventory is present and actionable, the address opens directly, and another hospital's address is
indistinguishable from a fabricated one

- [X] T014 [US1] Extract the detail half of `src/components/views/VisitsView.tsx` into a new client component `src/components/views/VisitDetailView.tsx`, moving it unchanged: status badge and record id, hospital, visit date, visiting team, compliance score, the archived notice, the details text, the official report with its download and upload, the attachments gallery with its modal, the response thread with its form, the audit trail, the print action and the approve-and-archive action. Carry `useActionRunner` and every existing Server Action call across untouched (FR-012)
- [X] T015 [US1] Create `src/app/(portal)/visits/[id]/page.tsx` following contracts/record-page-contract.md's resolution order exactly: guard the session with the existing page guard, resolve through `findVisitForUser(user, id)` and `listAuditLogsForVisit(user, id)`, call `notFound()` when the record is `null` **before rendering anything**, then render `VisitDetailView`. There MUST be no branch between "does not exist" and "not yours"
- [X] T016 [P] [US1] Create `src/app/(portal)/visits/[id]/loading.tsx` rendering a record-shaped skeleton — not the table skeleton from feature 002, which would be a lie about what is coming (SC-004)
- [X] T017 [US1] Add the back affordance to `src/components/views/VisitDetailView.tsx`: a visible, keyboard-reachable link to `/visits` in the page header, in the composition the hospital profile already uses, marked `no-print` along with every action button (FR-004, FR-019)
- [X] T018 [US1] Strip the detail column from `src/components/views/VisitsView.tsx`: remove the `lg:col-span-5` / `lg:col-span-7` split so the list uses the full page width, and remove `selectedVisitId`, `selectedRowKey`, the `tableState.ids` mirror and the Arabic "الزيارة المحددة غير مطابقة للفلتر أو البحث الحالي" notice (FR-017, FR-018). Keep the heading count fed by `onStateChange`, the status and hospital filter selects, and the create-visit modal
- [X] T019 [US1] Make visit rows navigate in `src/components/views/VisitsView.tsx`: keep whole-row activation through the table's existing `onRowSelect`, and wrap the hospital cell's content in a real link to `/visits/{id}` so the destination carries link semantics, a status-bar preview, middle-click and open-in-new-tab (FR-005, research.md R-006)
- [X] T020 [US1] Make the embedded visits list on `src/components/views/HospitalProfileView.tsx` navigate to `/visits/{id}` the same way, leaving its columns, page size and surrounding summary panels untouched (FR-017a, FR-017b)
- [X] T021 [US1] Make the embedded visits list in the hospitals comprehensive profile in `src/components/views/HospitalsView.tsx` navigate to `/visits/{id}` the same way; its practitioner and equipment tables MUST NOT become navigable
- [X] T022 [US1] Run the authorization probe for `/visits/[id]` per quickstart.md §1 and record the evidence: as coordinator A, capture the full response for A's own visit, B's real visit, a fabricated id and a malformed id; assert the responses for B's real visit and the fabricated id are **identical** in status and body. Include all three positive controls — central resolves every id, A resolves A's own, signed-out redirects to sign-in — without which a row of 404s proves only that the route is broken
- [X] T023 [US1] Walk the 11-point acceptance in contracts/record-page-contract.md for the visit page against the T003 inventory, item by item, for both an open and an archived visit. On the archived visit, enumerate every interactive element rather than searching the page text: the prose "لم يتم رفع تقرير الزيارة بعد" contains the upload button's wording and will produce a false positive
- [X] T024 [US1] Verify the visit record page at a 400px viewport (top-to-bottom reading, no horizontal page scrolling, every action reachable); verify printing contains the record while excluding the sidebar, header, footer, back control and action buttons, losing no section recorded in the T003 print baseline (SC-001, SC-007, FR-020); and **measure the open-record navigation against SC-004** — under 1 second on the seeded set with a warm database, with the skeleton shown on anything slower. Warm the database with a prior request first, so a cold start is not what gets measured

**Checkpoint**: Visits is fully migrated and its authorization proven — a complete, shippable slice

---

## Phase 4: User Story 2 - Record a training's execution on its own page (Priority: P2)

**Goal**: Every training has its own page carrying the full record, the execution form and attendance entry

**Independent Test**: Open a training from the list, record execution by name list and by headcount,
import an attendance sheet, and confirm each behaves exactly as it did in the side panel

- [X] T025 [US2] Extract the detail half of `src/components/views/TrainingsView.tsx` into a new client component `src/components/views/TrainingDetailView.tsx`, moving the whole `ExecutionForm` with it — the names/headcount toggle with its confirmation prompts, the name chips, the import dialog and its summary, the attendance template download, and the attachments — unchanged in function (FR-010, FR-011, FR-012)
- [X] T026 [US2] Create `src/app/(portal)/trainings/[id]/page.tsx` following the same resolution order: guard, `findTrainingForUser(user, id)`, `notFound()` on `null` before rendering, then `TrainingDetailView`
- [X] T027 [P] [US2] Create `src/app/(portal)/trainings/[id]/loading.tsx` rendering a record-shaped skeleton
- [X] T028 [US2] Add the back affordance to `src/components/views/TrainingDetailView.tsx`: a visible, keyboard-reachable link to `/trainings`, marked `no-print` with the action buttons
- [X] T029 [US2] Strip the detail column from `src/components/views/TrainingsView.tsx`: full-width list, and remove `selectedTrainingId`, `selectedRowKey`, the `tableState.ids` mirror and the "الدورة المحددة غير مطابقة للفلتر أو البحث الحالي" notice. Keep the heading count, the three filter selects, and both create modals
- [X] T030 [US2] Make training rows navigate in `src/components/views/TrainingsView.tsx`: row activation plus a real link on the title cell to `/trainings/{id}`
- [X] T031 [US2] Make the embedded trainings list on `src/components/views/HospitalProfileView.tsx` navigate to `/trainings/{id}`, leaving everything else about it untouched (shares a file with T020 — sequential)
- [X] T032 [US2] Make the embedded trainings list in the hospitals comprehensive profile in `src/components/views/HospitalsView.tsx` navigate to `/trainings/{id}` (shares a file with T021 — sequential)
- [X] T033 [US2] Run the authorization probe for `/trainings/[id]` per quickstart.md §1 with the same three positive controls, and record the evidence
- [X] T034 [US2] Walk the 11-point acceptance in contracts/record-page-contract.md for the training page against the T003 inventory, exercising attendance by names, attendance by headcount, the sheet import with its imported/skipped summary, and the template download
- [X] T035 [US2] Verify the training record page at 400px, confirm printing it produces no broken output even though printing is not a named requirement for trainings, and **measure the open-record navigation against SC-004** — under 1 second on the seeded set with a warm database, with the skeleton shown on anything slower

**Checkpoint**: Both record types are migrated, both probes pass, and records open from all four lists

---

## Phase 5: User Story 3 - Return to the list without losing your place (Priority: P3)

**Goal**: A list's search, sort, filters and page survive the trip to a record and back

**Independent Test**: Apply all four on the visits list, open a record, return by both the page's back
control and the browser's, and confirm all four are still in effect with the same rows

- [X] T036 [US3] Give the visits and trainings tables their keys in `src/components/views/VisitsView.tsx` and `src/components/views/TrainingsView.tsx` — `visits` and `trainings` — and the four embedded tables their own keys in `HospitalProfileView.tsx` and `HospitalsView.tsx`: `hospital-profile-visits`, `hospital-profile-trainings`, `hospital-comprehensive-visits`, `hospital-comprehensive-trainings`. Per contracts/list-state-contract.md, "two tables never share a key" and no key may be derived from the caption, route or column set, because an accidental collision silently shares one table's state with another
- [X] T037 [US3] Make the screen-level filter selects survive the round trip too — visit status and hospital on `VisitsView`, status, type and hospital on `TrainingsView`. Per data-model.md's decision of 2026-09-28, they are kept "in the same `listStateStore`, under the same `stateKey` as that screen's table", in the `filters` field: "the table writes `query`, `sort`, `page` and `pageSize`; the list view writes `filters` directly." Do not introduce a second store, a second key, or a per-screen mechanism
- [X] T038 [US3] Verify restoration per quickstart.md §3 on both screens by walking the journey SC-003 actually names: from a filtered, sorted list on a later page, **open and return from five records in succession**, alternating the page's own back control and the browser's back control, and confirm the filter is re-established **zero** times across all five. Then confirm a reload resets to default as the accepted cost, and that the address bar string is unchanged throughout (SC-003, SC-009)

**Checkpoint**: All three stories complete and independently demonstrable

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T039 Re-run feature 002's full per-screen suite across all 18 table instances, because the shared table gained a prop. An additive prop that is inert when unset is cheaper to verify than to argue about
- [X] T040 Run the per-role record-set comparison against the T002 baseline for central, coordinator A and coordinator B across every screen (SC-006, SC-008). The visits and trainings screens will legitimately differ in markup; the assertion is on the set of record markers each role's payload contains
- [X] T041 Assert the scope of the change: `git diff --stat -- prisma` MUST be empty, `git diff --stat -- src/server/actions` MUST be empty, `git diff --stat -- package.json` MUST show no new dependency, and `git diff --stat -- src/server/queries` MUST list only `visits.ts` and `trainings.ts`. Then assert the changed view set with `git diff --name-only -- src/components/views`: it MUST be exactly `VisitsView.tsx`, `TrainingsView.tsx`, `HospitalProfileView.tsx`, `HospitalsView.tsx`, plus the two new files `VisitDetailView.tsx` and `TrainingDetailView.tsx` — six paths, no others. This is where scope creep would actually show up (FR-021, plan.md Constitution Check, quickstart.md §0)
- [X] T042 Run the navigation-semantics and accessibility checks in quickstart.md §5: the primary cell is a real link with an `href` that supports middle-click and open-in-new-tab, row activation still works by mouse and keyboard to the same address, the back control is tab-reachable, the two profile screens open the same pages while the browser's back returns to the profile, and practitioner and equipment rows are still not navigable
- [X] T043 [P] Update `docs/CLAUDE_REFERENCE.md`: record the per-record address convention, and state plainly that a record resolved by id is resolved with the caller's scope **inside the `where` clause** and 404s identically for absent and forbidden. Add that list state is restored from a client-side store and deliberately not addressable, so a future reader does not "fix" it by adding query parameters
- [X] T044 Run the gates and record their output: `npm run typecheck`, `npm run lint`, `npm run build` (constitution Principle V) — run `typecheck` continuously from Phase 2 onward rather than only here
- [X] T045 Record the completed verification matrix in the commit or PR description: the authorization probe results for both record types with their positive controls, the 11-point acceptance per record page, the role-scoping comparison, and the feature 002 regression result

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 first; **T002 and T003 must complete before any screen changes**, because neither baseline can be captured after the panels are gone
- **Foundational (Phase 2)**: T006 needs T004; T007 needs T005; T008 needs T006 and T007; T011 needs T009 and T010; T012 needs T011. Blocks every user story
- **US1 (Phase 3)**: needs Phase 2; delivers the MVP
- **US2 (Phase 4)**: needs Phase 2. Independent of US1, but shares two files with it — see below
- **US3 (Phase 5)**: needs Phase 2 for the store, and needs US1 and US2's lists to exist before there is anything to return from
- **Polish (Phase 6)**: T039–T042 and T044–T045 after the stories being shipped are complete; T043 any time after Phase 4

### Within each user story

- Extract the detail component before creating the page that renders it (T014 → T015; T025 → T026)
- Create the page before pointing rows at it (T015 → T019; T026 → T030)
- Migrate before verifying (T014–T021 → T022–T024; T025–T032 → T033–T035)
- Run the authorization probe **before** the parity walk: if the page resolves the wrong records, comparing its content to a baseline is beside the point

### Parallel Opportunities

- T004 and T005 are different files and can run together; so can T009 and T010
- T016 and T027 are new files with no dependents and can be written alongside their story's page task
- **US1 and US2 both edit `HospitalProfileView.tsx` (T020, T031) and `HospitalsView.tsx` (T021, T032).** Those four are strictly sequential by file, even though the stories are otherwise independent. Two developers must not hold both stories' embedded-list tasks at once
- T036 touches four view files that US1 and US2 also touch — run it after both stories land rather than alongside them
- T043 is documentation and runs alongside anything in Phase 6

## Parallel Example: Phase 2

```bash
# Two query modules and two table-layer files, safe together:
Task: "Extract the visit row→DTO mapper in src/server/queries/visits.ts (T004)"
Task: "Extract the training row→DTO mapper in src/server/queries/trainings.ts (T005)"
Task: "Create src/components/table/listStateStore.ts (T009)"
Task: "Add ListViewState and stateKey to src/lib/table.ts (T010)"
```

## Implementation Strategy

### MVP (recommended scope)

1. Phase 1 Setup → Phase 2 Foundational → Phase 3 User Story 1
2. **STOP and VALIDATE**: the authorization probe for `/visits/[id]`, then the 11-point acceptance
3. Visits — the densest record and the screen coordinators use most — gets its own page, opens from all
   three places it is listed, and prints cleanly. Trainings still works exactly as it does today

### Incremental delivery

1. Setup + Foundational → scoped fetchers proven, shared table accepts a key, no screen changed
2. US1 → visits migrated → probe → parity → ship (MVP)
3. US2 → trainings migrated → probe → parity → ship
4. US3 → list state restored → verify → ship
5. Polish: regression suite, role-scoping comparison, diff assertions, accessibility, docs, gates

### Parallel team strategy

After Phase 2, one developer can take US1 and another US2, provided the four embedded-list tasks
(T020/T021 and T031/T032) are serialised between them — they edit the same two files. Whoever finishes
their story's record page first should take whichever embedded-list pair is free.

## Notes

- 45 tasks: 3 setup, 10 foundational, 11 + 11 + 3 across the three stories, 7 polish
- `[P]` means different files and no dependency on unfinished work — read the caveats above for
  `HospitalProfileView.tsx` and `HospitalsView.tsx`
- Verification tasks (T008, T013, T022–T024, T033–T035, T038–T042, T044) are blocking; there is no test
  suite to fall back on
- T002 and T003 are the tasks with no second chance: capture both before touching a view
- No task may edit `prisma/**` or `src/server/actions/**`; T041 enforces it
- T008 is deliberately a query-layer check that runs before any page exists. If the scoping is wrong
  there, every later check is measuring the wrong thing

---

## Implementation status — complete (2026-09-28)

All 45 tasks done. Gates green: `npm run typecheck`, `npm run lint`, `npm run build`.

### Verification record (T045)

Scratch PostgreSQL rebuilt from empty; production builds; never the Neon database. The pre-change
baseline was captured from a **git worktree at `a0c903c`** with its own `npm ci` and build, seeded through
the existing Server Actions.

| Suite | What it proves | Result |
|---|---|---|
| T008 query-layer scoping | The three fetchers resolve only in-scope records; foreign and fabricated return the identical value; single-fetch DTO is byte-identical to the list DTO | **23/23** |
| T022/T033 authorization probe | Both record addresses 404 for another hospital's real record and for a same-length fabricated id, with identical byte lengths, the 404 marker in both, no record data in either | **22/22** |
| T040 role-scoping vs. pre-change baseline | 33 screen/role payloads identical to `a0c903c`; zero cross-hospital markers; positive control green | **all match** |
| T023/T034 content and action parity | Every V1–V20 / VA1–VA10 and T1–T10 / TA1–TA12 item from the T003 inventory | **56/56** |
| T024/T035/T038/T042 record pages | Archived read-only by control enumeration, print excludes chrome, 400px with no horizontal scroll, RTL, keyboard, five-record journey, SC-009 | **20/20** |
| Step 2 list routes | Skeletons intact (RSC payload), table mechanics, row navigation, back link | **16/16** + 4 boundary assertions |
| T039 feature 002 regression | All 12 lists, 18 table instances, after the shared table gained `stateKey` | **155/155** |
| T041 scope assertions | `prisma` empty, `src/server/actions` empty, `package.json` untouched, `src/server/queries` only the two modules, `src/components/views` exactly six files | **pass** |
| SC-004 render budget | Visit record 246 ms, training record 235 ms, warm database, 1 s budget | **pass** |

### Defects found and fixed

1. **`notFound()` answered 200, not 404.** Feature 002's `visits/loading.tsx` created a Suspense boundary
   over the whole `visits` subtree including `[id]`, so Next flushed a 200 shell before the record page
   resolved. Fixed by the `(list)` route-group restructure plus `[id]/layout.tsx` (research.md R-012).
   Caught only by the authorization probe; invisible on screen.
2. **`PageProps<'/visits/[id]'>` cannot typecheck for a new route** — `AppRoutes` is generated from the
   existing route tree. Replaced with the explicit `{ params: Promise<{ id: string }> }`.

### Harness defects found and fixed (recorded because each first looked like a product failure)

3. Probe compared a 29-character fabricated id against a 25-character cuid and reported the echoed
   difference as an existence oracle. Now uses a same-length id.
4. Probe then demanded byte-identical bodies; Next assigns RSC row numbers by emission order, so the same
   foreign id is not byte-equal to *itself* across two runs. Replaced with assertions on what can leak.
5. Parity walk assumed PDF attachments would render `<img>`, that a stored-`pending` training displays as
   pending (FR-22 derives **late** once the due date passes), and that the names-mode controls are always
   on screen (a training with no attendance opens in headcount mode, as the panel did).
6. Three list-suite defects: regex escaping in a `Write`-authored file, asserting on a page before the
   client navigation rendered, and treating a prefetch-instant transition as a missing skeleton.

### Recorded risks from the blind-written phase that did **not** materialise

- `as const` on the shared Prisma include objects typechecked and ran.
- Dropping the audit-log fetch from `/visits` did not change its marker set (67→67); T040 needed no
  scoping adjustment.
- The internal-training modal's submit label was reconstructed from memory as `حفظ التدريب الداخلي`.
  **Verified against `git show a0c903c:src/components/views/TrainingsView.tsx`: it matches exactly.**

### Open items

- `src/lib/training-status.ts` is a new file outside plan.md's original structure section, holding the
  status helpers both the trainings list and the training record page need. T041's assertion is unaffected.
