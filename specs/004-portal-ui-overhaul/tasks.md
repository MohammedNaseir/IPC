---

description: "Task list for 004-portal-ui-overhaul"
---

# Tasks: Portal UI Overhaul

**Input**: Design documents from `/specs/004-portal-ui-overhaul/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No test framework is installed and none is added. Tests were not requested, and the spec's verification model is the browser/database harness in research.md R-009. Verification tasks below observe real results; they are not unit tests.

**Organization**: grouped by brief item. Phase order follows plan.md's delivery order rather than raw priority, because that order is dependency-driven: Item 2 removes one table instance before Item 7 restyles the rest, and Item 8 must land before Item 5 so it can be reverted independently (R-007).

## Vocabulary

Two numbering schemes are in play and they do **not** align — only Items 2 and 8 keep their number. This table is the bridge. Phase headings and prose below use **Brief Item** numbers; the `[USn]` task labels keep the spec's user-story IDs, because the checklist format requires them.

| Brief Item | User Story | Topic |
|------------|------------|-------|
| Item 1     | US3        | Trainee field removal |
| Item 2     | US2        | Programs screen |
| Item 3     | US1        | Notifications (SweetAlert2) |
| Item 4     | US5        | Login split-screen |
| Item 5     | US6        | Sidebar |
| Item 6     | US7        | Fonts (Cairo + Tajawal) |
| Item 7     | US4        | DataTable redesign |
| Item 8     | US8        | Logo replacement |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1–US8, mapping to spec.md
- Exact file paths are given in every task

## Path Conventions

Single Next.js App Router application. Source under `src/`, static assets under `public/`, docs under `docs/`. Verification scripts live in the session scratchpad and are never added to the repository.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependencies and a running environment. Nothing here changes product behaviour.

- [X] T001 Install `sweetalert2@11.26.25` as a runtime dependency in `package.json` and verify it reports zero transitive runtime dependencies
- [X] T002 [P] Confirm `public/ipc-hail-logo.jpg` is present and byte-identical to the owner's source file, 400x400, JPEG magic bytes `ff d8 ff`
- [X] T003 Start the seeded scratch PostgreSQL per quickstart.md and confirm it reports READY on port 54341
- [X] T004 Run `npm run build` and start the standalone server with the scratch environment, confirming it serves `/login` with HTTP 200 — **adapted**: the owner's review dev server is already running on `:3000` against the pre-change code and must stay up, so baselines are captured from it instead. Production build is deferred to the T028 gate. Consequence: T008 timings are dev-mode and are only valid dev-vs-dev, not against the production figures from `375eae6`

**Checkpoint**: environment reproducible; no source file changed yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: capture the pre-change truth. Once any item ships, "before" can no longer be measured.

**⚠️ CRITICAL**: no user story work may begin until this phase is complete. SC-003, SC-007, SC-010 and SC-014 are all before/after comparisons that are unverifiable without these captures.

- [X] T005 [P] Capture full-page screenshots of all portal screens at 1440px and 400px, for both the central and hospital roles, into a `before/` directory in the scratchpad
- [X] T006 [P] Capture the rendered column set, column order and first-page values for all 18 `<DataTable>` instances across the 9 view files, as structured JSON, for the SC-003 comparison
- [X] T007 [P] Capture the complete control inventory of the programmes screen for both roles — every button, link and menu item — for the SC-007 comparison
- [X] T008 [P] Capture per-screen warm-database render timings for the SC-010 budget (≤25% regression)
- [X] T009 [P] Capture the attendance figures currently reported by the trainings list and the training record page for trainings that already have attendance, for the SC-014 comparison
- [X] T010 [P] Capture the measured WCAG contrast pass and the CDP Tab-walk focus probe results as the accessibility baseline for SC-005 and SC-006
- [X] T011 Record which font weights are actually referenced anywhere in `src/` (`font-light` through `font-black` and any numeric weight utilities), to bound the Cairo and Tajawal weight sets in US7


**Phase 2 record (captured 2026-09-29, production build at `:38141`, seeded scratch database)**

Baseline artifacts: `scratchpad/pgtest/before004/baseline.json` plus 28 full-page screenshots.

- **T006 reached 18/18 named instances.** Each `<DataTable>` carries a unique `caption`, which becomes its `section[aria-label]`, so instances are identified by name rather than counted. Six are not visible on first paint: the equipment tab on `/assets`, the coordinators sub-tab on `/hospitals`, and four inside the hospital full-profile drill-in.
- **Two capture defects were found and fixed rather than worked around.** (1) Logout by clearing `document.cookie` silently fails because the session cookie is `httpOnly`, exactly as the constitution requires — replaced with CDP `Network.clearBrowserCookies`. (2) The first full-profile drill-in landed on `HOSP-C-3`, a hospital with no practitioners, equipment or visits, so three of its four regions rendered empty states with no `<table>` and were wrongly recorded as unreachable. Re-targeted at `HOSP-A-1`, which has data.
- **The dev server does not hydrate in this environment; the production build does.** Measured on `:3000`: zero React fibers on a button, and the client-side table filter does not change row count. The same probes on the production build at `:38141` show fibers present, the filter going 12 rows to 0, and tab clicks switching tables. Logging in works on both only because it is a plain form POST to a Server Action. **All baselines were therefore captured from the production build.** Consequence for T008: warm render times are ~520-950ms in production versus ~1200-2300ms in dev, so the dev figures recorded during the first attempt were discarded.
- **T011 found a pre-existing defect.** Weights actually used in `src/`: 500 (48 uses), 600 (9), 700 (275), 800 (14). Tajawal currently loads 300, 400, 500, 700, 800, 900 — so **300 and 900 are never used**, and **600 is used but never loaded**, meaning those nine `font-semibold` sites render synthetically bolded or fall back to 700. The weight set for T068 is therefore **400, 500, 600, 700, 800** (400 is the implicit body default): one fewer than today, and it closes the 600 gap.
- **T009**: record-page attendee figures captured as `11 حاضر`, `3 حاضر`, `13 حاضر`, matching database headcounts and name counts exactly. Trainings-list attendee column header is `الحاضرون`. Status counts before any change: 87 pending (all template-derived), 8 completed internal, 6 completed template.
- **T010**: contrast and focus baseline matches the state shipped in `375eae6` — 2/1/4/2 threshold failures across `/visits`, the visit record, `/dashboard` and `/trainings`, all of which are the known `sr-only` and disabled-control artifacts; 50 of 75 touch targets below 44px at 400px; no horizontal scroll anywhere.

**Checkpoint**: every before/after comparison in the spec now has its "before". User stories may begin.

---

## Phase 3: Item 3 — Notifications (Priority: P1) 🎯 MVP

**Goal**: replace all eight native dialogs with in-product Arabic RTL dialogs drawn in the portal's own palette and typography.

**Independent Test**: `grep -rn "window\.alert\|window\.confirm" src/` returns nothing, and triggering each of the eight sites shows an in-product RTL dialog with correct button order, focus handling and Escape-to-cancel.

**Why MVP**: widest reach per unit of work — one of the eight sites is the shared error path every Server Action failure flows through — and it carries the archive confirmation the design critique raised as a P0.

### Implementation

- [X] T012 [US1] Create `src/lib/notify.ts` as a `'use client'` module exposing exactly three functions — `notify.info(message, options?)`, `notify.error(message, options?)` returning `Promise<void>`, and `notify.confirm(options)` returning `Promise<boolean>` — per `contracts/notify.md`
- [X] T013 [US1] In `src/lib/notify.ts`, import SweetAlert2 dynamically inside the client boundary so it is never evaluated during server render, and confirm no server bundle references it
- [X] T014 [US1] In `src/lib/notify.ts`, theme every dialog through `customClass` against project tokens so no third-party default appearance ships (FR-007); destructive confirmations use the `danger` role, nothing else does
- [X] T015 [US1] In `src/lib/notify.ts`, set `dir="rtl"` explicitly on the popup rather than relying on the library's auto-detection, and require Arabic labels from the caller with no English default text reachable by a user (FR-003, FR-007)
- [X] T016 [US1] In `src/lib/notify.ts`, make cancellation the safe default: `Escape`, backdrop dismissal and browser-back all resolve `confirm` as `false` without executing the action (FR-008)
- [X] T017 [US1] In `src/lib/notify.ts`, verify focus moves into the dialog on open, is trapped while open, and returns to the triggering control on close (FR-009), and that each dialog carries an accessible name and a role appropriate to informational versus confirmation (FR-010)
- [X] T018 [US1] Replace `window.alert(result.error)` at `src/components/hooks/useActionRunner.ts:15` with `notify.error`, preserving the caller's form state (FR-011)
- [X] T019 [P] [US1] Replace the invalid-date-range `window.alert` at `src/components/views/DashboardView.tsx:69` with `notify.info`
- [X] T020 [P] [US1] Replace the no-file-chosen `window.alert` at `src/components/views/DocumentsView.tsx:203` with `notify.info`
- [X] T021 [P] [US1] Replace the two attendance-mode `window.confirm` calls at `src/components/views/TrainingDetailView.tsx:52` and `:55` with `notify.confirm`, keeping their existing Arabic wording
- [X] T022 [P] [US1] Replace the attendee-limit `window.alert` at `src/components/views/TrainingDetailView.tsx:68` with `notify.info`, keeping the message's reference to `MAX_ATTENDEE_NAMES`
- [X] T023 [US1] Replace the archive `window.confirm` at `src/components/views/VisitDetailView.tsx:104` with `notify.confirm` using the `danger` role, introducing no second approver, no review step and no role check beyond the existing central-role one (FR-012)
- [X] T024 [US1] Note that `src/components/views/ProgramsView.tsx:190` also holds a `window.alert`; leave it for US2, which rewrites that file, and record the dependency so it is not missed

### Verification

- [X] T025 [US1] Confirm `grep -rn "window\.alert\|window\.confirm" src/` returns zero results except the known `ProgramsView.tsx` site deferred to US2 (SC-001)
- [X] T026 [US1] Trigger all replaced sites in the browser and confirm RTL direction, correct button order, project typography and colour, focus entry and return, and Escape cancelling without executing
- [X] T027 [US1] Confirm every confirmation can be completed and cancelled by keyboard alone with focus returning to the trigger in 100% of cases (SC-002)
- [X] T028 [US1] Run `npm run typecheck`, `npm run lint` and `npm run build`, and record the files modified and what changed (FR-004, SC-012)


**Phase 3 record (2026-09-30, production build, verified in a real browser via CDP)**

- **`src/lib/notify.ts`** (new, 160 lines): `notify.info`/`notify.error`/`notify.confirm`, SweetAlert2
  loaded dynamically on first call. Every option used (`role` does NOT exist in this version's API —
  discovered by grepping the installed `sweetalert2.d.ts` before writing any code, not assumed) was
  checked against the real installed package, not remembered from training data or a web search.
- **Theming**: `src/app/globals.css` gained a `@import "sweetalert2/dist/sweetalert2.min.css"` (structural
  CSS only) plus an `.ipc-swal-*` override block. `buttonsStyling: false` in `notify.ts` strips the
  library's default colours; no third-party theme ships (FR-007).
- **Seven of the eight sites replaced**: `useActionRunner.ts` (the shared error path), `DashboardView.tsx`,
  `DocumentsView.tsx`, `TrainingDetailView.tsx` (×3: two confirms + one alert), `VisitDetailView.tsx` (the
  archive confirmation, the design critique's P0). The eighth, `ProgramsView.tsx:190`, is deliberately
  deferred to item 2/US2, which rewrites that file (T024).
- **`grep -rn "window\.alert\|window\.confirm" src/` returns exactly one result**, the deferred site —
  confirmed both before and after (SC-001 is verified at the US2 checkpoint per the F1 remediation).

**A real, narrow gap found and fixed during verification, not assumed away**: SweetAlert2 only wires
Enter-to-confirm for its own `input`-mode dialogs (`handleEnter` returns immediately when
`innerParams.input` is unset — verified by reading the installed bundle after the first keyboard test
failed). A plain `<button>` outside a `<form>` responds natively to Space but not to a bare Enter in this
Chromium build (proven by an isolated diagnostic: Space activated a focused SweetAlert2 button, Enter did
not, with the browser's own keydown listener confirmed to receive the event correctly either way — this
was not a CDP dispatch artifact). Space alone already satisfies "operable by keyboard" (SC-002), but Enter
is the more common reflex, so `notify.ts` now wires it up explicitly via `didOpen`, scoped to the
currently-focused button inside the popup only — proven safety-critical: on the danger (archive) dialog,
focus defaults to Cancel, and a reflexive Enter there closes the dialog **without** archiving, exactly the
"no accidental irreversible action" property the design critique asked for.

**Verified, not just implemented** (via a CDP-driven browser against the production build, `scratchpad/pgtest/verify-notify.mjs`):
RTL direction and Arabic-only text on every dialog; correct button order (DOM `[cancel, confirm]` via
`reverseButtons: true`, rendering cancel closer to the RTL start and confirm at the outer edge — matches
the pre-existing `VisitsView.tsx` create-visit modal convention); focus entering the dialog on open and
returning to the trigger on close; Escape, backdrop-click, and Tab+Enter/Space all exercised; a genuine
**positive control** for the confirm path (not just cancel — clicking/pressing Confirm was proven to
actually execute the guarded action, via a client-only state change safe to mutate, never against the
shared visit used elsewhere in the baseline); and the archive dialog specifically confirmed to introduce
no second approver and no role check beyond the existing central-role one (FR-012) — the guard is friction
on one click by the same user, nothing more.

**Harness defects found and fixed along the way** (recorded because each first looked like a product
failure, matching this project's established discipline): the dialog-button check counted SweetAlert2's
always-present-but-hidden `deny`/`loader` DOM nodes, producing false negatives on button count and order —
fixed by filtering to visible buttons only. A button-order inequality was written backwards (asserting
confirm should sit further right than cancel, the opposite of the design). The doc-center upload trigger's
label was guessed wrong (`رفع مستند` vs. the real `إضافة ملف للمستودع العام`, found in source). The
file-upload dialog check initially failed because the modal's `title` field is ALSO `required`, not just
the file input — relaxing only the file input's `required` still let native HTML5 validation block
submission; fixed by relaxing every `required` field in the open modal for that one isolated check. One
run out of four showed a single transient failure that did not reproduce on immediate re-run with no
code change; treated as CDP/timing noise given three consecutive clean runs, not chased further.

**A claim corrected rather than left standing**: `.next/server/chunks/ssr/` does contain files referencing
`sweetalert2` after the build. This is expected Turbopack behaviour — client components get one SSR pass
for the initial HTML, so their reachable dynamic imports get a possible SSR chunk too — not evidence the
library executes server-side. Verified directly: the production server's log carries no
`window`/`document is not defined` error, and the module's actual code only runs inside `notify.info`/
`error`/`confirm`, which nothing calls during render.

**Pre-existing, out of scope, reported rather than fixed**: the upload modal's file `<input required>`
(confirmed present before this feature via `git show HEAD`) means the browser's own constraint validation
blocks form submission before `handleUploadSubmit`'s `!file` check — and therefore `notify.info` — can ever
run through normal use. The original `window.alert` had the identical, equally-unreachable condition; this
feature preserves it byte-for-byte (FR-001/FR-002: presentation-only, no behaviour change). Fixing the
dead branch would be new behaviour this brief does not request.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass, after the Enter-key fix and after the
theming/CSS change.

**Checkpoint**: notifications are fully in-product and independently demonstrable.

---

## Phase 4: Item 2 — Programmes screen (Priority: P1)

**Goal**: return the programmes screen to a folder/card repository, rename it, and remove its table instance.

**Independent Test**: the screen shows folders and cards with no tabular layout; title, breadcrumb and sidebar all read «البرامج والاستراتيجيات»; every control available before is still available for both roles.

### Implementation

- [X] T029 [US2] Diff `git show 11feba4:src/components/views/ProgramsView.tsx` against the current `src/components/views/ProgramsView.tsx` to extract exactly what the table migration replaced, rather than checking the old file out wholesale (R-008)
- [X] T030 [US2] Restore the folder/card grid structure in `src/components/views/ProgramsView.tsx`, removing its single `<DataTable>` instance
- [X] T031 [US2] Re-tokenise the restored markup to the navy palette and semantic roles shipped in `375eae6`; the pre-change commit predates both the shared table and the palette, so none of its colours may be reintroduced (FR-014, FR-005a)
- [X] T032 [US2] Replace the `window.alert` at the restored file's no-file-chosen path with `notify.info` from US1, closing the site deferred by T024
- [X] T033 [US2] Rename the screen to «البرامج والاستراتيجيات» in the screen title and breadcrumb in `src/components/views/ProgramsView.tsx` (FR-015)
- [X] T034 [US2] Rename the sidebar entry to «البرامج والاستراتيجيات» in `src/components/shell/Sidebar.tsx`, keeping its route `/programs` and its group unchanged (FR-015)
- [X] T035 [US2] Provide two distinct empty states — "this screen has no programmes" and "this folder is empty" — with different messages, as the outgoing table design did (FR-018)
- [X] T036 [US2] Record the screen rename as a deviation from fixed SRS terminology in `docs/CLAUDE_REFERENCE.md` §9, with its reason (FR-016, Constitution Principle IV)

### Verification

- [X] T037 [US2] Compare the control inventory against the T007 capture, control by control, for both roles (SC-007)
- [X] T038 [US2] Exercise folder creation, document upload, document download, and navigation into and out of a folder, confirming each behaves identically to before (FR-017)
- [X] T039 [US2] Confirm the title, breadcrumb and sidebar entry all read «البرامج والاستراتيجيات» consistently, and that no tabular row-and-column layout remains
- [X] T040 [US2] Confirm no horizontal scroll at 400px on the restored screen (SC-004), and run the three gates, recording modified files (SC-012)


**Phase 4 record (2026-09-30, production build, verified in a real browser via CDP)**

- **`src/components/views/ProgramsView.tsx`** restored to the folder/card presentation from commit
  `11feba4` (367 lines pre-table), carried forward onto the navy palette shipped in `375eae6` rather
  than reintroducing that commit's teal — diffed the two versions directly rather than checking the
  old file out wholesale (R-008), confirming the only real differences were the content-rendering
  block (folder/file grids vs. the `<DataTable>`) and colour tokens; every handler, state variable,
  and both create/upload modals were already byte-identical.
- **A real, if narrow, defect caught while porting colours**: the old grid's file-card icon used
  `rose-*` (decorative red). The palette's own rule (FR-005a, `globals.css`) reserves red exclusively
  for failure, error and the one irreversible act — a plain file icon is none of those. My first pass
  mapped it to `danger-*`, perpetuating the same category error under a different token; caught before
  the gates ran and corrected to neutral `slate-*`, matching the fix already applied to the table
  version's own "ملف" type badge.
- **Renamed** to «البرامج والاستراتيجيات» in the screen title, the breadcrumb, and
  `src/components/shell/Sidebar.tsx`'s nav entry — verified via direct DOM query on all three, not
  string-matched against source.
- **`window.alert` replaced with `notify.info`**, closing the eighth and final dialog site deferred
  from item 3 (T024).
- **Two distinct empty states, corrected from a spec inaccuracy caught during implementation**: FR-018
  as written assumed the current design already distinguished "screen has no programmes" from "this
  folder is empty" — checking the actual code showed it uses one identical static message for both.
  Implemented the plain-English intent instead: `atRoot` selects between "لا توجد برامج استراتيجية
  مضافة بعد" (root, genuinely no programmes) and "هذا المجلد فارغ حالياً" (a specific empty folder) —
  verified live by creating a real folder and navigating into it.
- **§9 of `docs/CLAUDE_REFERENCE.md`** gained **D-002** (this rename, against the real binding SRS
  §3.9 "البرامج (Programs)", not the superseded OFFICIAL_SYSTEM_SPECIFICATIONS document) and, in the
  same edit, **D-003** (item 1's internal-training status change, ahead of that item's own
  implementation in Phase 6 — the deviation record and the code change are independent; only the
  record was written here).

**A real gap in the Phase 2 baseline, found and closed rather than worked around**: T007 was supposed
to capture the programmes control inventory for both roles, but the original sweep's coordinator route
list omitted `/programs` entirely. Since nothing was committed yet, `git stash push -- ProgramsView.tsx
Sidebar.tsx` isolated the two changed files, the pre-change build was rebuilt and captured against the
real stashed code (not reconstructed from memory or from reading source), then the stash was restored
and rebuilt again. Confirmed via that capture: a coordinator has 2 folder-open actions at root, can
navigate and download one level deep, and has zero create/upload controls at any depth — exactly
SRS FR-34's read-and-download-only rule.

**Verified with a genuine end-to-end positive control, not just assertions**: created a real programme
folder through the UI, navigated into it (observing the correct *subfolder*-empty message, not the
root message), uploaded a real file, confirmed a working download link, and navigated back out — all
against the live database, then confirmed the coordinator role sees the identical live folder set
(compared same-run, both roles, against the same DB state, rather than against a stale pre-test count
that my own test mutations would have invalidated) with no create/upload action leaking through, and
that a known pre-seeded populated programme ("البرنامج الوطني") still offers a working download one
level deep for that role. Test artifacts (3 stray `Program` rows accumulated across repeated
verification runs, one from an earlier crashed attempt) were cleaned up afterward via direct SQL,
respecting the schema's `onDelete: Restrict` chain (`ProgramFile` → `StoredFile` → `Program`, in that
order) rather than left in the shared scratch database — confirmed back to the original 2 seeded
programmes.

**Harness defects found and fixed along the way**: `realClick`'s default selector
(`button,a,[role=button]`) doesn't match the folder cards, which are plain `<div onClick>` — every
folder-navigation click needed an explicit broader selector. The coordinator comparison originally
checked a live post-mutation count against the stale pre-test baseline number, which my own T038
folder-creation test had already invalidated by design; rewritten to compare central and coordinator
live, in the same run, against the same current DB state — a strictly more rigorous test of the actual
question (does the coordinator see what central sees, minus the gated actions) than a cross-time count
comparison would have been.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass.

**Checkpoint**: 17 `<DataTable>` instances remain for Item 7.

---

## Phase 5: Item 7 — Shared table (Priority: P2)

**Goal**: one new table design authored once, inherited by the 17 remaining instances, with every behaviour frozen.

**Independent Test**: all 17 instances show identical data, columns and ordering to the T006 capture, with only the visual treatment changed.

**⚠️ Approval gate**: present directions T1 (dense ruled), T2 (calm cards) and T3 (printed register, recommended) from research.md R-005 and obtain a decision before T042.

### Implementation

- [X] T041 [US4] Present the three table directions to the owner and record the chosen one in `specs/004-portal-ui-overhaul/research.md` under R-005
- [X] T042 [US4] Apply the chosen visual treatment to `src/components/table/DataTable.tsx`, covering row density, rule weight, header treatment, row separation, hover and selected states, for both the wide table and the narrow `<dl>` card layout
- [X] T043 [P] [US4] Apply the treatment to `src/components/table/TableToolbar.tsx`, keeping the search input, its clear control and the live row-count region intact
- [X] T044 [P] [US4] Apply the treatment to `src/components/table/TablePagination.tsx`, preserving that in RTL "previous" sits on the right
- [X] T045 [P] [US4] Apply the treatment to `src/components/table/TableEmptyState.tsx`, keeping the two states distinct in icon, message and hint (FR-024)
- [X] T046 [P] [US4] Apply the treatment to `src/components/table/TableSkeleton.tsx` and `src/components/table/RecordSkeleton.tsx` so loading states match the new table (FR-024)
- [X] T047 [US4] Confirm no view file under `src/components/views/` carries bespoke table styling after the change; the treatment must live entirely in `src/components/table/**` (FR-019)

### Verification

- [X] T048 [US4] Compare all 17 instances against the T006 capture for identical columns, column order and values (SC-003)
- [X] T049 [US4] Confirm the frozen behaviours in `contracts/table.md`: Arabic collation via `Intl.Collator('ar', { numeric: true })`; search folding harakat, tatweel and `أ إ آ ٱ → ا` but **not** `ة→ه` or `ى→ي`; client-side paging; per-screen state retention with distinct `stateKey` values
- [X] T050 [US4] Confirm the wide table and narrow `<dl>` are both still rendered server-side and switched by CSS, not client-conditional, and that every value stays bound to its label (FR-022)
- [X] T051 [US4] Confirm table semantics survive: `th[scope="col"]`, `aria-sort` on the active column, keyboard-operable sorting and row activation, and a visible focus indicator on every stop (FR-023, SC-005)
- [X] T052 [US4] Confirm no list screen scrolls horizontally at 400px (SC-004), and re-measure contrast against the T010 baseline (SC-006)
- [X] T053 [US4] Run the three gates and record modified files (SC-012)


**Phase 5 record (2026-09-30, production build, verified in a real browser via CDP, both roles)**

- **Direction T3 (printed register)** applied across all 6 table subcomponents. The design: the
  container flattened from a floating card (`rounded-xl border shadow-2xs`) to a flat bordered page
  (`rounded-lg border-slate-300`, no shadow — registers don't float); the header's grey tint removed
  in favour of a heavier `border-b-2 border-slate-800` rule doing the separating a tinted fill used
  to; row dividers strengthened from `divide-slate-100` to `divide-slate-200`, ruled between every
  entry rather than zebra-striped (a colour doing a line's job); `tabular-nums` added at the table
  level so numeric columns align. Deliberately **not** touched: header text tracking/casing — the
  earlier design critique found positive letter-spacing breaks Arabic cursive joining, so no
  `tracking-wide`/`uppercase` was added despite that being a common "ledger" convention for Latin
  headers. `TableSkeleton.tsx` and `RecordSkeleton.tsx` updated to the same flat chrome so the loading
  state previews what's coming, not the old look.
- **T047 confirmed by construction, not just inspection**: `DataTableProps` carries no `className`
  field in its type signature, so no view could pass bespoke table styling even if one tried — the
  16 remaining `<DataTable` call sites (confirmed by count) have no escape hatch.

**T048 (SC-003, all 17 instances identical) uncovered a real problem in the *verification harness*,
not the product** — worth recording in full because of how it was resolved. Six of seventeen instances
initially showed "rows differ" against the T006/Phase-2 baseline. Investigating each individually
rather than accepting the failures:
- **Three were genuine, explained, non-regressions**: the hospitals list and the audit log differed
  only in whitespace-collapse (a literal uncollapsed run in the old capture, cleanly collapsed now)
  and — for the audit log specifically — legitimately newer rows, since it is append-only and this
  session's own extensive testing (logins, creates, every verification step, across a date rollover
  from Sep 29 to Sep 30) added real entries between the baseline capture and now.
- **Three (dashboard, practitioners, coordinators) traced to actual corruption in the original Phase 2
  baseline capture itself** — specific cells were missing a single letter (`prc.B.6@te t.local`
  instead of `prc.B.6@test.local`), identically across unrelated tables. Verified this was **not**
  caused by this redesign: `git stash`'d the table changes back to the confirmed pre-change code,
  rebuilt, and read the exact same cell three consecutive times at increasing settle delays — clean
  every time (`prc.B.6@test.local`). Since the extraction method was byte-identical to the one that
  produced the corrupted baseline hours earlier, the difference must be in what rendered at capture
  time, not in the method — a transient text-extraction race during the original Phase 2 sweep, not a
  reproducible product defect. Rather than paper over this with looser string-matching in the test, a
  **fresh, stability-checked baseline was captured** for exactly these three tables against the same
  confirmed pre-change code — reading each table twice, 500ms apart, and only accepting it once both
  reads agreed (`before004/baseline.json` now carries a `recapturedAt`/`recaptureNote` on each). The
  table redesign was then restored and compared cleanly against this corrected baseline: **all 17
  instances now match exactly**, with no tolerance heuristics needed.

**Verified, not just implemented**: Arabic-aware search folding (`أحمد` matches rows containing `احمد`,
confirmed by result count, not just that the input accepted the text) and column-header sort
(`aria-sort` toggling on click) both still work; the dual wide-table/narrow-card markup is confirmed
present in one DOM (not client-conditional, so hydration cannot mismatch); `th[scope=col]` and
keyboard-operable sort controls confirmed present; row keyboard activation confirmed by focusing a row
and pressing Enter, observing a real navigation to the record page; no horizontal scroll at 400px on
all seven list routes; contrast re-measured against the T010 baseline — the identical 2/1/4/2
threshold-failure pattern, all the same known `sr-only`/disabled-control artifacts, no new failures,
and the count of distinct background colours in use dropped slightly on every route (removing the
tinted header fill), consistent with the flatter design intent.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass.

**Checkpoint**: every list in the product shares one deliberate table design.

---

## Phase 6: Item 1 — Remove the trainee field (Priority: P2)

**Goal**: remove the trainee-count field from the internal-training creation path only, and create internal trainings as pending with no attendance.

**Independent Test**: the creation form has no trainee field; a created internal training is `pending` with zero attendance rows; the trainings list and record page report unchanged figures for trainings that already have attendance.

**⚠️ This is the only story touching `src/server/**`.** Constitution Principle V's stronger clause applies: verify against the database, not the screen alone.

### Implementation

- [X] T054 [US3] Remove the `internalCount` state, its `<input type="number" min="1">` and its label «عدد المتدربين» from `src/components/views/TrainingsView.tsx`, leaving the hospital, title, date, trainer and description fields unchanged
- [X] T055 [US3] Remove `attendeeCount: Number(internalCount)` from the `createInternalTraining` call in `src/components/views/TrainingsView.tsx`
- [X] T056 [US3] Remove the `attendeeCount` member from `internalTrainingSchema` in `src/server/actions/trainings.ts`, leaving `hospitalId`, `title`, `description`, `date` and `deliveredBy` untouched
- [X] T057 [US3] In `createInternalTraining` in `src/server/actions/trainings.ts`, change `status: 'completed'` to `status: 'pending'` and remove `attendances: { create: { headcount: data.attendeeCount } }` entirely, writing no attendance row (FR-042, FR-041)
- [X] T058 [US3] Confirm `createInternalTraining` still calls `requireActionUser()` and `assertHospitalAccess()`, still parses with zod, and still writes its `logAudit` entry inside the same transaction (Constitution Principles II and Security)
- [X] T059 [US3] Leave untouched: `TrainingDTO.attendeeCount` in `src/lib/types.ts`, the derivation `attendeeNames.length + headcount` in `src/server/queries/trainings.ts`, the trainings-list attendee column in `src/components/views/TrainingsView.tsx`, and the attendee figure on `src/components/views/TrainingDetailView.tsx` — these are a derived output, not the removed input (FR-040)
- [X] T060 [US3] Leave untouched the shared attendance bounds in `src/lib/attendance.ts`: `HEADCOUNT_MIN = 1`, `HEADCOUNT_MAX = 100_000`, `MAX_ATTENDEE_NAMES = 1000`, `ATTENDEE_NAME_MAX_LENGTH = 200`, all still enforced for the record page's execution form (FR-040)
- [X] T061 [US3] Record the internal-training status change as a behaviour deviation in `docs/CLAUDE_REFERENCE.md` §9, including the verified consequence that an internal training can never derive `late` and can never raise an overdue reminder because `dueDate` lives on `TrainingTemplate` (Constitution Principle IV, data-model.md)

### Verification

- [X] T062 [US3] Create an internal training through the form, then query the database and confirm `status = 'pending'` and **zero** `TrainingAttendance` rows for it (SC-013)
- [X] T063 [US3] Post the `createInternalTraining` action directly with an `attendeeCount` still in the payload, as a stale client would, and confirm no attendance row is written (FR-043)
- [X] T064 [US3] Confirm the per-row `CHECK` invariant still holds — a row is one `attendeeName` XOR one `headcount`, never both and never neither — and that at most one headcount row per training remains enforced
- [X] T065 [US3] Document attendance on the new training's record page by names, and again by total, confirming both modes still work and that attendance still carries no reference to `Practitioner`
- [X] T066 [US3] Compare the trainings list and a record page's attendee figures against the T009 capture for trainings that already have attendance (SC-014)
- [X] T067 [US3] Confirm `git diff --name-only -- prisma src/server` returns only `src/server/actions/trainings.ts` (SC-011), then run the three gates and record modified files (SC-012)


**Phase 6 record (2026-09-30, production build, verified against the database directly)**

- **Removed**: the `عدد المتدربين` field, its `internalCount` state, and the `attendeeCount` member of
  `internalTrainingSchema` — from the creation path only. The date field, left alone by the removal,
  was re-paired with the trainer-name field into the same two-column row rather than left solo in a
  now-half-empty grid.
- **`createInternalTraining`** now writes `status: 'pending'` with **zero** attendance rows, matching
  D-003 (recorded in Phase 4, ahead of this code change, since both edits landed in the same
  `docs/CLAUDE_REFERENCE.md` pass). Its audit-log wording changed from "تسجيل" (documented/recorded,
  which implied a completed act) to "إنشاء" (created), matching the wording the parallel
  `createTrainingTemplate` action already uses for a training that also starts `pending` — a small,
  directly-motivated correction, not scope creep.
- **T059/T060 satisfied by construction**: `TrainingDTO.attendeeCount` in `src/lib/types.ts`, its
  derivation (`attendeeNames.length + headcount`) in `src/server/queries/trainings.ts`, the trainings
  list's attendee column, the record page's attendee figure, and the shared bounds in
  `src/lib/attendance.ts` were not touched by this phase — confirmed by `git diff`, not merely
  asserted.

**Verified against the database, not the screen alone** (Constitution Principle V's stronger clause,
since this is the only phase touching a Server Action): created a training through the real form and
confirmed via direct SQL that its row is `status='pending'` with zero `TrainingAttendance` rows
(SC-013); called `createInternalTraining` directly over the wire with a stale `attendeeCount: 999`
still in the payload and confirmed the training was created normally (zod silently drops unknown keys
rather than rejecting the call) and that no attendance row resulted (FR-043); confirmed the
`TrainingAttendance_name_xor_headcount` CHECK constraint is unchanged; documented attendance on the new
training through the real execution form in headcount mode and watched it actually save and the status
transition toward completion; and compared attendee figures for pre-existing trainings before and after
— 12/12 in the trainings list, 4/4 on individual record pages, all unchanged (SC-014).

**Two harness bugs found and fixed, both self-inflicted false failures, neither a product defect**:
a dynamic DOM-setter helper built the wrong global constructor name (`HTMLTextareaElement` vs. the
real `HTMLTextAreaElement`) and crashed the script outright. Separately, a later "field is absent from
the form" check searched the *whole page* rather than the modal, and was defeated by my own earlier
test's description text — literally containing the prose "عدد المتدربين" as part of a sentence
describing what the test was doing — rendering in the list beneath the open modal; rescoped to the
modal `<form>` element only.

**Test data hygiene**: 8 trainings accumulated across repeated verification runs (`تدريب تحقق …` and
their `-stale` companions, plus their attendance rows) were deleted afterward via direct SQL. The
scratch database's `Training` count is confirmed back to 101, matching the very first Phase 1 check
(T003/T004).

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass. `git diff --name-only -- prisma
src/server` returns exactly `src/server/actions/trainings.ts` (SC-011).

**Checkpoint**: the only server-touching story is complete and independently verified.

---

## Phase 7: Item 6 — Font pairing (Priority: P3)

**Goal**: Cairo for headings and interface labels, Tajawal for body text and data, applied through the token layer.

**Independent Test**: every text role resolves to its assigned family on every screen, with no fallback system font and no increase in payload beyond the weights actually used.

### Implementation

- [X] T068 [US7] Using the T011 weight inventory, decide the minimum weight set for each family and record it; Tajawal currently loads six weights (300, 400, 500, 700, 800, 900) and adding Cairo at six would roughly double the font payload (R-002)
- [X] T069 [US7] Add `Cairo` from `next/font/google` in `src/app/layout.tsx` with `subsets: ['arabic', 'latin']`, the weight set from T068, `variable: '--font-cairo'` and `display: 'swap'`, and add its variable to the `<html>` className alongside Tajawal's
- [X] T070 [US7] Trim the Tajawal weight list in `src/app/layout.tsx` to the set from T068
- [X] T071 [US7] In `src/app/globals.css`, remap `--font-display` to `var(--font-cairo)` and leave `--font-body` and `--font-sans` on `var(--font-tajawal)`, so the split applies everywhere without editing a single component (FR-035)
- [X] T072 [US7] Confirm no component carries a per-component font override that would defeat the token mapping (FR-035)

### Verification

- [X] T073 [US7] Confirm via computed `font-family` that headings and interface labels resolve to Cairo and body and data to Tajawal, on every screen, for both roles
- [X] T074 [US7] Confirm Arabic renders with correct cursive joining in both families and that no screen falls back to a system font during normal loading (FR-037, FR-038)
- [X] T075 [US7] Compare font payload against the pre-change build and confirm only the weights from T068 are loaded (FR-036)
- [X] T076 [US7] Run the three gates, confirm the render budget against T008 (SC-010), and record modified files (SC-012)


**Phase 7 record (2026-09-30, production build, verified in a real browser via CDP)**

- **`src/app/layout.tsx`**: added `Cairo` from `next/font/google`, exposed as `--font-cairo`, alongside
  the existing `Tajawal` (`--font-tajawal`). `src/app/globals.css`'s `--font-display` token now points
  to `var(--font-cairo), var(--font-tajawal), system-ui, ...` (Cairo first, Tajawal as a same-language
  fallback rather than jumping straight to a Latin system font); `--font-body` and `--font-sans` stay
  on Tajawal. This satisfies FR-035 through the token layer alone — confirmed no component carries a
  per-component font override that would defeat it (T072).
- **A real font-catalogue fact caught by the type system, not assumed**: Tajawal has **no 600
  (semibold) weight file at all**. My Phase 2 T011 inventory correctly found `font-semibold` used nine
  times but never loaded, and I initially planned to "fix the gap" by adding 600 to Tajawal's weight
  array — `tsc` rejected it outright (`"600" is not assignable to ...`), and a direct request against
  Google's own font API for `Tajawal:wght@600` confirms the file silently doesn't exist in their
  catalogue either. This is unfixable within the family: those nine sites will keep synthesizing
  between 500 and 700, exactly as they did before this feature — not a regression, just a limit of the
  font itself. Cairo genuinely has 600, so the same weight class on a heading now renders as a true
  semibold rather than a synthesized approximation.
- **Weight sets, corrected from the six Tajawal originally loaded** (of which 300 and 900 were
  confirmed unused by T011): Tajawal now loads `400, 500, 700, 800`; Cairo loads `400, 500, 600, 700,
  800`.

**Verified, not just implemented**: on four representative routes, the heading (`h2`) resolves to
Cairo and the body resolves to Tajawal via `getComputedStyle` (FR-035); both webfonts report `loaded`
via `document.fonts.check`, checked at the **weight actually rendered** on each element rather than
the default 400 — a real correction found mid-verification, since every heading in this app carries an
explicit bold/extrabold class and Cairo's 400 file is therefore correctly never fetched at all (lazy
per-weight loading working as intended, confirmed by inspecting `document.fonts` directly and finding
`Cairo 400: unloaded` everywhere while `Cairo 700/800: loaded` wherever a heading actually renders);
Arabic cursive joining confirmed by measuring that a connected word renders narrower than the sum of
its isolated letters (joined glyphs share connecting strokes); and the render budget held within
tolerance on all three routes checked (SC-010) once a self-inflicted measurement bug was found and
fixed (below). Font payload across a full walk of every route: **10 unique font files, 137.8 KB total**
— corresponding exactly to the weight/family combinations actually rendered anywhere in the app, with
no evidence of an unused weight (300, 900, or an un-rendered Cairo weight) ever being fetched. No
precise pre-change network-transfer baseline exists to diff this against — T011 was a source-code
weight-usage inventory, not a captured transfer size — so this is reported as a verified absolute
figure rather than a fabricated before/after delta; per-file sizes (8-33 KB) show nothing anomalous.

**A real measurement bug in my own harness, not a product defect**: the first render-budget run showed
alarming regressions (129%, 41%, 43%) against the T008 baseline. Traced to `Network.setCacheDisabled:
true`, left in the script from an earlier draft that never ended up using the resulting request list —
disabling the cache forces every navigation to re-download every font file from scratch, which the T008
baseline (captured with normal caching) never had to do. Removed; the timings then landed within
tolerance, two of three routes actually faster than baseline.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass, after the Tajawal weight
correction.

**Checkpoint**: typography is one deliberate pairing.

---

## Phase 8: Item 8 — Product mark (Priority: P3)

**Goal**: the organisation's real logo replaces the generic shield glyph in the header and sidebar.

**Independent Test**: the logo appears in both chrome positions for both roles, undistorted; reverting this change alone leaves the sidebar redesign intact.

**⚠️ Ordering**: this MUST land before Item 5. If it ships after the sidebar redesign, reverting it means unpicking a hunk inside a file Item 5 rewrote (R-007, FR-046).

### Implementation

- [X] T077 [US8] Replace the `ShieldCheck` glyph in the sidebar masthead in `src/components/shell/Sidebar.tsx` with `public/ipc-hail-logo.jpg` via `next/image` with explicit `width` and `height`, at a size that keeps it legible and undistorted (FR-045, FR-047)
- [X] T078 [US8] Replace the corresponding generic mark in `src/components/shell/Header.tsx` with the same asset and treatment (FR-045)
- [X] T079 [US8] Because the asset is opaque white with no alpha, give the mark a white or near-white plate wherever the surrounding chrome is not white, rather than knocking it out (FR-047)
- [X] T080 [US8] Confirm the logo's English line is reproduced verbatim as "Contral" and is not corrected, masked, cropped out or replaced with re-typed text (FR-048)
- [X] T081 [US8] Commit US8 as its own isolated commit touching only the two mark sites, so it can be reverted independently (FR-046)

### Verification

- [X] T082 [US8] Confirm the mark renders correctly for both roles at 1440px and 400px, with no white box against a contrasting field and no distortion
- [X] T083 [US8] Run `git revert --no-commit` on the US8 commit and confirm it touches only the mark sites, then restore; this is the SC-015 check and must be done before US6 begins
- [X] T084 [US8] Run the three gates and record modified files (SC-012)


**Phase 8 record (2026-09-30, production build, verified in a real browser via CDP, both roles)**

- **`src/components/shell/Sidebar.tsx`**: the generic `ShieldCheck` glyph next to the wordmark replaced
  with `public/ipc-hail-logo.jpg` via `next/image`, on an explicit white plate (`bg-white border
  border-line`) so its opaque 400x400 field keeps a defined edge regardless of the sidebar's own
  near-white tone. Now-unused `ShieldCheck` import removed.
- **T078 corrected, not executed as originally written**: the task called for replacing "the
  corresponding generic mark in `Header.tsx`" — there isn't one. `Header.tsx`'s only `ShieldCheck` is
  the icon *inside* the flagged «المنصة الرسمية المعتمدة» badge, the exact element the owner said not
  to touch without their decision (recorded in `PRODUCT.md`, Brand Commitments). The spec's assumption
  that the header carried a separate, generic brand mark parallel to the sidebar's was wrong. `git diff
  --stat -- src/components/shell/Header.tsx` is empty, confirmed after the change, not just intended.
- **A real, pre-existing bug found and fixed, outside the two files this item planned to touch**:
  `next/image`'s request for the logo returned HTTP 400 "The requested resource isn't a valid image".
  Traced to `src/proxy.ts`: the auth middleware's matcher excluded `_next/static`, `_next/image`,
  `favicon.ico` and `robots.txt`, but nothing else — every other path, including a raw request for
  `/ipc-hail-logo.jpg` itself, was being redirected to `/login` (confirmed directly: an unauthenticated
  `curl` returned `307` with `location: /login`; the image optimizer's own internal fetch of that same
  path hit the identical redirect and received login-page HTML instead of JPEG bytes, hence "not a
  valid image"). This gap existed before this feature and was simply never exercised, since `public/`
  was empty until this feature added its first asset. Fixed by extending the matcher's exclusion to
  common static-file extensions — the standard, documented Next.js pattern for this exact situation,
  not a project-specific workaround — verified directly afterward: the raw asset and the optimizer
  endpoint both now return `200 image/jpeg`. `src/proxy.ts` sits outside `src/server/`, so this fix
  does not touch the directory FR-001/SC-011 restrict.
- **FR-048 (verbatim reproduction)**: satisfied by construction — the image is used as-is via `src`,
  never cropped, masked, or re-typed; no code path touches its pixels.

**Verified for both roles**, not just the one used to build it: the mark renders correctly (confirmed
`naturalWidth/naturalHeight: 48x48`, not a broken-image icon) for the central role at 1440px and for
the coordinator role inside the mobile drawer at 400px.

**T081/T083 (independent revertibility), addressed structurally rather than by an actual commit**:
nothing in this feature has been committed yet, matching the standing instruction that nothing lands
until the owner reviews it — consistent with every prior item. `git diff -- src/components/shell/
Sidebar.tsx` was inspected directly and confirmed the item-8 change (the `Image` import, the removed
`ShieldCheck` import, and the mark's JSX block) sits in a diff hunk with no line overlap against item
2's earlier rename of the same file's programmes nav label — the two remain cleanly separable whenever
commits are made, satisfying FR-046's intent without requiring a premature commit that would contradict
the review-before-commit instruction.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass, after the middleware fix.

**Checkpoint**: the product shows its own mark, revertibly.

---

## Phase 9: Item 5 — Sidebar (Priority: P3)

**Goal**: a visually distinct sidebar that preserves every destination, group, role chip and mobile behaviour.

**Independent Test**: every destination reachable before is reachable after, for both roles, with exactly one entry marked current per route.

**⚠️ Approval gate**: present S1 (collapsible icon rail, recommended), S2 (deep navy panel) and S3 (floating inset card) from research.md R-004 and obtain a decision before T086.

### Implementation

- [X] T085 [US6] Present the three sidebar directions to the owner and record the chosen one in `specs/004-portal-ui-overhaul/research.md` under R-004
- [X] T086 [US6] Apply the chosen design to `src/components/shell/Sidebar.tsx`, preserving every destination, its group, and its role-dependent entries including the central-only audit entry (FR-030)
- [X] T087 [US6] Preserve the role and scope chip, naming the coordinator's hospital or the cluster-wide scope (FR-032)
- [X] T088 [US6] Ensure exactly one entry is marked current per route and that the marking does not rely on colour alone — `aria-current="page"` plus a non-colour cue (FR-031)
- [X] T089 [US6] Preserve mobile drawer behaviour: open, close, dismiss on navigation, and the backdrop; keep every entry keyboard reachable (FR-033)
- [X] T090 [US6] Carry the US8 logo forward unchanged into the redesigned sidebar, without folding item 8's change into this one

### Verification

- [X] T091 [US6] Visit every destination as both roles and confirm entries, grouping and role-dependent items are identical to the T005 baseline (SC-009)
- [X] T092 [US6] Confirm exactly one entry is current per route, the scope chip is correct for each role, and the drawer opens, closes and dismisses on navigation
- [X] T093 [US6] Re-measure contrast and the Tab-walk focus probe against the T010 baseline (SC-005, SC-006), and run the three gates recording modified files (SC-012)

**Checkpoint**: navigation looks like this product and lost nothing.

**Phase 9 record (2026-09-30, production build, verified in a real browser via CDP, both roles)**

- **Direction S1 (collapsible icon rail)** applied to `src/components/shell/Sidebar.tsx`. New
  `src/components/shell/sidebarStore.ts` holds the collapse preference in `localStorage`, read via
  `useSyncExternalStore` (not `useEffect`+`setState`, which `react-hooks/set-state-in-effect`
  correctly rejects — an external mutable source needs the hook React ships for exactly this case).
  `src/components/shell/PortalShell.tsx` owns the collapsed flag and shrinks the content column's
  margin (`lg:mr-64` → `lg:mr-16`) in step with the rail, so the reclaimed space is not a dead gap.
- Central role: all 10 destinations present across the 3 groups plus the central-only audit entry;
  `/hospital-profile` correctly absent. Coordinator role: `/hospital-profile` present, `/hospitals`
  and `/audit` correctly absent. Both match the T005 baseline destination set.
- Scope chip: "الإدارة المركزية" + cluster-wide scope for central, "منسق مستشفى" + hospital name for
  coordinator; abbreviates to a single glyph ("مر"/"مس") at the collapsed rail width rather than
  disappearing.
- Exactly one `aria-current="page"` entry at a time, confirmed for both roles on different routes; the
  current entry is additionally bold (`font-weight: 700`), so the cue is not colour-only.
- Mobile drawer (400px): opens with a backdrop, navigating from it dismisses it, unaffected by the
  desktop collapse preference (always shows full content, as intended — an icon-only drawer inside an
  already-explicit overlay would remove information a touch user still needs).
- Collapse toggle: rail narrows 256px → 64px, labels hide but `aria-label` keeps the accessible name,
  a CSS tooltip (`role="tooltip"`) becomes visible on real keyboard Tab focus (verified via CDP
  `Input.dispatchKeyEvent`, not programmatic `.focus()` — this build does not arm `:focus-visible`
  from a synthetic call, the same class of artifact already documented for `.click()`), preference
  persists across a reload.
- Logo: present and rendered both expanded and collapsed, on its white plate.
- **Fix landed during verification**: `transition-[transform,width]` never actually animated the
  mobile drawer's slide, because Tailwind v4's `translate-x-*` utilities animate the standalone
  `translate` CSS property, not the `transform` shorthand — confirmed by direct computed-style
  inspection (`transitionProperty: "transform, width"` while the animated property was `translate`).
  The drawer was snapping open/closed instead of sliding. Changed to
  `transition-[translate,width]`; re-verified `translate` now changes from `100%` to `0px` across the
  animated property list.
- **T093**: contrast re-measured on the same four T010 pages (`/visits`, the visit record,
  `/dashboard`, `/trainings`) with the same probe methodology — 2/1/4/2 threshold failures, all the
  same known `sr-only` artifacts, no new failures; touch targets at 400px: 50/75 below 44px, no
  horizontal scroll — both numbers match the T010 baseline exactly. A genuine Tab-walk (real CDP
  keyboard events, not `.focus()`) through all 11 new sidebar interactive elements (toggle button +
  10 nav links) confirmed every one lands a visible `outline: solid 2px` on focus.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass. Diff scope confirmed: only
Item 1's `src/server/actions/trainings.ts` under `prisma`/`src/server`.

Modified/added files this phase: `src/components/shell/Sidebar.tsx`,
`src/components/shell/PortalShell.tsx`, `src/components/shell/sidebarStore.ts` (new).

---

## Phase 10: Item 4 — Login split screen (Priority: P3)

**Goal**: a split-screen login with the form on one half and a composed panel built around the logo on the other.

**Independent Test**: sign-in succeeds and fails with unchanged messages and redirects at 1440px, 768px and 400px, with the split at wide widths and one usable column at narrow.

**⚠️ Approval gate**: present L1 (paper panel), L2 (navy field with logo plate, recommended) and L3 (navy with data motif) from research.md R-003 and obtain a decision before T095.

### Implementation

- [X] T094 [US5] Present the three login directions to the owner and record the chosen one in `specs/004-portal-ui-overhaul/research.md` under R-003
- [X] T095 [US5] Restructure `src/components/auth/LoginView.tsx` into a two-half layout at wide viewports, form on one half and presentational panel on the other, ordered correctly for RTL (FR-025)
- [X] T096 [US5] Compose the presentational half per the chosen direction: the logo at its natural size as centrepiece, the portal name, a purpose line, and a quiet geometric field; do not stretch or upscale the logo beyond its native 400x400 (FR-029a)
- [X] T097 [US5] Ensure the panel contains no national emblem, no "official government website" trust mark and no imitation of MoH or Absher branding; the organisation's own logo is permitted (FR-028)
- [X] T098 [US5] Collapse to a single column below the chosen breakpoint, with the form fully usable, no horizontal scroll, and the presentational half not pushing the form below the fold (FR-026)
- [X] T099 [US5] Preserve authentication behaviour exactly: same fields, same validation, same Arabic error messages, same redirect on success, and preservation of the entered email on failure (FR-027)
- [X] T100 [US5] Set `priority` on the logo image here, since it is above the fold on this screen, unlike the chrome usage (R-007)

### Verification

- [X] T101 [US5] Sign in successfully and unsuccessfully at 1440px, 768px and 400px, confirming unchanged messages and redirects (SC-008)
- [X] T102 [US5] Confirm the logo shows no white box against its background and is not distorted or upscaled
- [X] T103 [US5] Confirm keyboard operability of the whole form with a visible focus indicator on every stop, and re-measure contrast (SC-005, SC-006)
- [X] T104 [US5] Run the three gates and record modified files (SC-012)

**Checkpoint**: all eight items complete.

**Phase 10 record (2026-09-30, production build, verified in a real browser via CDP, all three SC-008 widths)**

- **Direction L2 (navy field, logo on a plate)** applied to `src/components/auth/LoginView.tsx`.
  RTL flex row, form first in document order (lands on the right, matching where the shell's sidebar
  sits); presentational half `hidden` below `lg`, so the narrow layout is simply the form, full width,
  nothing pushed below the fold. Panel: two low-opacity blurred circles plus a faint 45° hairline
  repeat as the "quiet geometric field" (FR-029a) — no fabricated data visual. Logo at 160×160 inside
  a 40×40 (rem) white rounded plate (FR-028a); Next/Image served an optimised 256×256 asset for it at
  this DPR, still well under the native 400×400, confirmed non-upscaled and aspect-preserved in the
  browser. `priority` set on this usage only, per T100 — it is above the fold here, unlike the chrome.
- **Real defect found and fixed during verification, in scope, not a server-code change**: the email
  input had no preservation mechanism at all — neither in this file nor, checked via
  `git show HEAD:src/components/auth/LoginView.tsx`, in the committed baseline before this feature.
  React resets uncontrolled form fields once an action settles, including when it resolves with an
  `{ error }` object rather than throwing, so the field was silently going blank after every failed
  attempt (FR-027 was unmet before this change too — not a regression introduced by the redesign, but
  surfaced by actually testing FR-027 rather than assuming the unchanged JSX meant unchanged
  behaviour). Fixed by making the email input controlled (`useState`, entirely inside
  `LoginView.tsx`) rather than adding a field to `LoginState` in `src/server/actions/auth.ts`, which
  would have crossed the diff-scope boundary for no functional benefit. The password field is
  deliberately left uncontrolled/reset on failure — not repopulating a failed password is standard
  practice, and FR-027 only names the email.
- SC-008: sign-in succeeds and fails with the same Arabic messages and the same `/dashboard` redirect
  at 1440px, 768px and 400px; no horizontal scroll at any width.
- Panel text checked against both flagged strings ("المنصة الرسمية المعتمدة", "الموقع الحكومي
  الرسمي") — neither appears; only the portal name and the existing footer tagline.
- T103: a real Tab-walk (CDP keyboard events) through email → password → show/hide toggle → submit
  confirms every stop gets a visible focus ring. Contrast re-measured on `/login` itself at 1440px and
  400px with the same probe as T010/T093: 0 threshold failures at either width.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass. Diff scope confirmed: only
Item 1's `src/server/actions/trainings.ts` under `prisma`/`src/server`.

Modified files this phase: `src/components/auth/LoginView.tsx`.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T105 Confirm `git diff --name-only -- prisma src/server` across the whole feature returns only `src/server/actions/trainings.ts` (SC-011)
- [X] T106 [P] Re-run the full accessibility pass — contrast, focus, and keyboard reach — across every changed screen at 1440px and 400px for both roles (SC-005, SC-006)
- [X] T107 [P] Re-run the feature-002 table regression suite across all remaining list screens to confirm nothing regressed
- [X] T108 [P] Confirm no screen scrolls horizontally at 400px (SC-004) and that render times are within 25% of the T008 baseline (SC-010)
- [X] T109 Confirm both SRS deviations are recorded in `docs/CLAUDE_REFERENCE.md` §9 — the programmes rename and the internal-training status change (FR-016, T061)
- [X] T110 Update `docs/CLAUDE_REFERENCE.md` with the notification convention: components call `src/lib/notify.ts` and never a dialog library directly
- [X] T111 Confirm a per-item record exists for all eight items, naming the files modified and what changed in each (SC-012)
- [X] T112 Run the full quickstart.md validation end to end, then stop the app server and the scratch PostgreSQL

**Phase 11 record (2026-09-30, production build, verified in a real browser via CDP, both roles)**

- **T105**: `git diff --name-only -- prisma src/server` returns exactly `src/server/actions/trainings.ts` — the whole feature, across all eight items, never touched anything else under those two directories.
- **T106**: contrast re-measured across every changed screen (10 central routes, 4 coordinator routes,
  plus the visit record) at 1440px, both roles. Every failure found reduces to the same already-documented
  `sr-only` pagination-label artifact (pagination buttons' screen-reader-only text, ratio 1.93:1,
  present identically wherever `TablePagination` renders — the same class of artifact accepted since
  the original T010 baseline and reconfirmed in the Phase 5 record). **One pre-existing, out-of-scope
  finding surfaced by this sweep**: `/hospital-profile` (coordinator role) has three visible `dt`
  labels at `text-muted`, 11px, contrast 3.17:1 against a 4.5:1 requirement. `HospitalProfileView.tsx`
  is not in this feature's diff — confirmed via `git diff --name-only` — so this predates all eight
  items and is out of scope to fix here; flagged for the owner as a separate finding, not corrected as
  part of this feature.
- **T107**: the full feature-002 table regression suite re-run against the final build — all 17
  `<DataTable>` instances still match the T006 capture exactly (SC-003), search/sort/keyboard
  behaviour intact, no horizontal scroll at 400px on any of the 7 list routes checked.
- **T108**: no horizontal scroll at 400px confirmed on every changed route, both roles (14 checks).
  Render budget re-measured against the T008 baseline on every route with a recorded timing, both
  roles: every route came in at or faster than baseline except `/dashboard` (central, -27.9%, i.e.
  faster) — no route exceeded the 25% regression budget; several improved by double digits (e.g.
  coordinator `/hospital-profile` -40.0%), consistent with the flatter table styling and the removed
  per-row gradient/shadow work from item 7.
- **T109**: confirmed — D-002 (Programs rename) and D-003 (internal training pending-status) are both
  present in `docs/CLAUDE_REFERENCE.md` §9 with reason, supersession target and verified consequence.
- **T110**: added a "Notifications and confirmations (the convention, feature 004)" subsection under
  §7 of `docs/CLAUDE_REFERENCE.md`, documenting the `notify.ts` single-entry-point rule, the dynamic
  import, the RTL/palette override convention, and the `popstate` guard — checked directly against
  the shipped `src/lib/notify.ts` rather than written from memory.
- **T111**: confirmed — Phases 3 through 10 each carry a dated findings record in this file naming
  the files modified and what changed, covering all eight items.
- **T112**: the quickstart.md "Whole-feature checks" table was run end to end this phase (scope
  boundary, contrast, focus, no-horizontal-scroll, render budget, per-item record) — all six rows
  pass. Per-item quickstart sections for items 1, 2, 3, 6, 7 and 8 were validated in their own phase
  records (3 through 8); items 5 and 4 in Phase 9 and Phase 10. Tear-down (stopping the app server and
  the scratch PostgreSQL) is the last remaining action, performed after this record.

Gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass (last run in Phase 10, unchanged
since — this phase made no source edits, only documentation and verification).

Modified files this phase: `docs/CLAUDE_REFERENCE.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; **blocks every user story**, because it captures the "before" that four success criteria compare against
- **User stories (Phases 3–10)**: all depend on Phase 2
- **Polish (Phase 11)**: depends on all eight stories

### Item Dependencies

Most stories are independent. Four real dependencies exist and are not negotiable:

- **Item 2 → Item 3**: `ProgramsView.tsx` holds one of the eight dialog sites. Item 2 rewrites that file, so its dialog is deferred from T024 to T032. Doing it twice would be wasted work.
- **Item 7 → Item 2**: Item 2 removes one of the eighteen table instances, so Item 7 inherits seventeen. Reversing this order means restyling two instances that are about to be deleted.
- **Item 5 → Item 8**: Item 8 must land **first**. Reverting Item 8 after Item 5 has rewritten `Sidebar.tsx` means unpicking a hunk inside a rewritten file, which defeats FR-046 and SC-015.
- **Item 4, Item 5 → Item 6**: both appearance items should be designed against the final typography, not re-tuned after the fonts change.

### Within Each Story

Implementation tasks precede verification tasks. Verification is not optional — Constitution Principle V forbids calling an item done without observing the result.

### Parallel Opportunities

- All of Phase 2 (T005–T010) is parallel — independent captures
- Item 3: T019–T022 are parallel, four different view files
- Item 7: T043–T046 are parallel, four different table subcomponents
- Phase 11: T106–T108 are parallel

**Items are not parallel across a team here.** Item 3's `notify.ts`, Item 6's token remap and Item 7's table treatment all land in files the other items also touch, and the four dependencies above are sequencing constraints, not staffing ones.

---

## Parallel Example: Item 3 — Notifications

```bash
# After the notify module (T012–T018) exists, the four remaining view files are independent:
Task: "Replace the invalid-date-range alert in src/components/views/DashboardView.tsx:69"
Task: "Replace the no-file-chosen alert in src/components/views/DocumentsView.tsx:203"
Task: "Replace the two attendance-mode confirms in src/components/views/TrainingDetailView.tsx:52 and :55"
Task: "Replace the attendee-limit alert in src/components/views/TrainingDetailView.tsx:68"
```

---

## Implementation Strategy

### MVP (Item 3 — Notifications only)

1. Phase 1 Setup, Phase 2 Foundational
2. Phase 3 Item 3 — notifications
3. **Stop and validate**: eight native dialogs gone, replaced by in-product Arabic RTL ones, keyboard-operable
4. This alone is shippable: it fixes the product's most jarring break in an Arabic-only interface and closes the design critique's P0 archive confirmation

### Incremental delivery

Each item is a commit and a checkpoint: Item 3 → Item 2 → Item 7 → Item 1 → Item 6 → Item 8 → Item 5 → Item 4. Three items stop for approval before implementation (Item 7's table direction, Item 5's sidebar, Item 4's login). Nothing is committed until the owner reviews.

---

## Notes

- `[P]` means different files with no dependency on an incomplete task
- Every task names its file path; every item task carries its `[USn]` story label
- No test framework is added; verification observes real results in a real browser against a real database
- The palette from `375eae6` is fixed for all eight items (FR-005a) — the logo's green and tan do not enter the semantic scale
- Commit after each item, not after each task, so each item is separately reviewable and revertible
