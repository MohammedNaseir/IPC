# Feature Specification: Portal UI Overhaul

**Feature Branch**: `004-portal-ui-overhaul`

**Created**: 2026-09-29

**Status**: Ready for planning — all clarifications and decisions resolved 2026-09-29. Eight items; items 2, 3, 5, 6, 7 unblocked first.

**Input**: User description: a seven-part change covering the internal-training creation form, the strategic-programmes screen, notifications, the login page, the sidebar, fonts, and the shared record table. The brief requires the project to be inspected before any change, a per-item plan presented for approval, options offered wherever more than one exists, RTL and full Arabic throughout, no loss of existing functionality, and documentation of modified files after each change.

## Discovery Findings *(non-normative; recorded because the brief required inspection before planning)*

Established by reading the repository at `375eae6`, not assumed:

- **Stack**: Next.js 16.3.5 App Router with Turbopack, React 19.3, TypeScript 5.8, Tailwind CSS v4, Prisma 7.10 against PostgreSQL. `output: 'standalone'`, deployed to a Windows/IIS host.
- **Libraries**: the runtime dependency list is small — `lucide-react` (icons), `zod` (validation), `jose` (sessions), `bcryptjs`, `pg`/`@prisma/*`, `read-excel-file` (attendance import), `server-only`. **There is no notification, dialog, toast, animation, table, or component library of any kind.**
- **Design system**: a palette landed one commit ago (`375eae6`). One institutional hue — ink navy, OKLCH hue 254 — with three semantic meanings: `navy-*` for action, selection, wayfinding and the sealed record; `attn-*` (ochre) for a record awaiting someone; `danger-*` (red) for failure, error and the single irreversible act. Five semantic roles (`surface`, `raised`, `ink`, `muted`, `line`) and the browser surfaces (selection, caret, scrollbar, focus ring) are themed in `src/app/globals.css`. There are no hardcoded hex colours left in `src/`.
- **Fonts**: **Tajawal only**, loaded via `next/font/google` in `src/app/layout.tsx` with weights 300–900 and exposed as `--font-tajawal`. `globals.css` maps `--font-display`, `--font-body` and `--font-sans` all to that one family. Cairo is not present.
- **Tables**: **18 `<DataTable>` instances across 9 view files**, all rendering through one component (`src/components/table/DataTable.tsx`) with seven siblings — `TableToolbar`, `TablePagination`, `TableEmptyState`, `TableSkeleton`, `RecordSkeleton`, `useTableState`, `listStateStore`. Search, sort, filter and paging are client-side over already-loaded rows; sorting uses `Intl.Collator('ar', { numeric: true })` and search normalises harakat and alef variants. The wide table and a narrow `<dl>` card layout are both rendered server-side and switched by CSS.
- **Sidebar**: `src/components/shell/Sidebar.tsx`. Redesigned in `375eae6` from a dark admin-template slab to a light paper panel separated by a 1px rule, fixed to the right (RTL) at `w-64`, with four labelled nav groups, a role/scope chip, and a mobile drawer.
- **Login**: `src/components/auth/LoginView.tsx`. A single centred card, max-width `md`, with a dark navy gradient masthead, a shield glyph, email and password fields with inline icons and a show/hide toggle, an error region, and an access-guidance block. **Not** split-screen today.
- **Native dialogs**: **8 sites** — `window.alert` × 5, `window.confirm` × 3. One of them, `src/components/hooks/useActionRunner.ts:15`, is the shared error path every Server Action failure flows through, so it accounts for the majority of runtime occurrences.
- **Assets**: **`public/` is empty.** There is no logo, emblem, photograph, illustration or colour specification anywhere in the repository.
- **Trainee count**: the "internal training" creation form already has a **عدد المتدربين** field (`type="number" min="1"`, no `max`), bound to `attendeeCount`, validated server-side as an integer between 1 and `HEADCOUNT_MAX = 100_000`. Nothing currently prevents a large value. A separate cap, `MAX_ATTENDEE_NAMES = 1000`, governs *named* attendee lists on the training record page and is enforced in three places.
- **Previous programmes design**: recovered. `git show 11feba4:src/components/views/ProgramsView.tsx` is the pre-table version — 367 lines, zero `DataTable` references, a responsive folder/card grid (`grid-cols-1/2/3`) with folder-creation modals. The current version (429 lines) uses two `DataTable` instances.

### Constraints inherited from project governance

- `PRODUCT.md` Brand Commitments: no Saudi government identity element, no national emblem, no imitation of MoH or Absher branding; **do not invent a logo or emblem** — the text wordmark stays until real assets are supplied; Arabic RTL only, formal register, Tajawal stays.
- Constitution Principle IV (Spec-Anchored Scope): the Arabic SRS is the requirements source of truth and any deviation must be recorded in `docs/CLAUDE_REFERENCE.md` §9 with its reason.
- Constitution Principle V (Evidence Before Done): `npm run typecheck`, `npm run lint` and `npm run build` must all pass, and claims must state what was verified.
- Constitution Principle I/II: this feature is presentation-only. Server authorization, scoping and the data layer must not change.

### Tensions the brief creates, surfaced rather than silently resolved

1. **"Split Screen like Metronic" (item 4) vs. the palette just shipped.** `375eae6` deliberately removed the Metronic palette from this product, and `PRODUCT.md` names that removal as an owner commitment. This spec therefore reads "like Metronic" as a reference to the **split-screen layout pattern only**, never its colours, gradients or branding.
2. **"Complete change, better and different from the current one" (item 5).** The sidebar *was* redesigned one commit ago. "Current" here means the light paper panel in `375eae6`, not the dark admin template it replaced.
3. **"Programs and Strategies" (item 2) renames a screen.** SRS terminology is fixed by Principle IV, so the rename is a recorded deviation, not a free edit.
4. **SweetAlert2 (item 3) is the project's first UI runtime dependency** beyond icons. It must be verified RTL-capable and themed to the navy palette rather than shipping its default look.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Every notification speaks the product's language (Priority: P1)

A coordinator uploads an oversized attendance file, or a supervisor's session expires mid-action. Today the failure arrives as an operating-system dialog rendered in the host's locale and left-to-right button order, with the origin string `127.0.0.1:3000 says` above it, and no relationship to the control that failed. After this change every notification and every confirmation is an in-product Arabic RTL dialog drawn in the portal's own palette and typography.

**Why this priority**: it is the only item that touches a *correctness* surface rather than an aesthetic one. Native dialogs are the single most jarring break in an Arabic-only product, they cannot be styled, and one of the eight sites is the shared error path for every Server Action — so this item has the widest reach per unit of work and the least design risk.

**Independent Test**: zero `window.alert`/`window.confirm` calls, except the one site `ProgramsView.tsx` owns, which US2 replaces. Trigger each of the seven sites replaced here (four informational, three confirmations) and observe an in-product Arabic RTL dialog with correct button order, focus handling and Escape-to-cancel.

**Acceptance Scenarios**:

1. **Given** a coordinator on the training record page with 1,000 named attendees entered, **When** they attempt to add another name, **Then** an in-product Arabic RTL notification states the limit and offers recording a total headcount instead, and no operating-system dialog appears.
2. **Given** a central user viewing an open visit, **When** they activate the archive control, **Then** an in-product Arabic RTL confirmation appears with the affirmative and cancelling actions in correct RTL order, and dismissing it leaves the visit unchanged.
3. **Given** any Server Action that fails validation, **When** the failure returns, **Then** the message is presented in the product's own dialog with the product's typography, and the user's form input is preserved.
4. **Given** a keyboard-only user, **When** a confirmation appears, **Then** focus moves into the dialog, `Escape` dismisses it as a cancellation, and focus returns to the control that opened it.

---

### User Story 2 — The programmes screen returns to a browsable repository (Priority: P1)

A central user opens the strategic-programmes screen to browse folders and documents. It currently renders as two data tables, which suits records but not a folder tree. The screen returns to its previous folder/card presentation and is renamed.

**Why this priority**: it is a reversal of a known-good previous design that still exists in version control, so the target state is unambiguous and the risk is low. It also removes one of the eighteen table instances before item 7 restyles the rest, which shrinks that item's blast radius.

**Independent Test**: open the screen, confirm the folder/card presentation with no table markup, confirm the new title in the screen, the breadcrumb and the sidebar, and confirm every action available before the change is still available.

**Acceptance Scenarios**:

1. **Given** a central user on the programmes screen, **When** the screen loads, **Then** programmes and their documents are presented as folders and cards with no tabular row-and-column layout.
2. **Given** the renamed screen, **When** a user reads the screen title, the breadcrumb and the sidebar entry, **Then** all three read "البرامج والاستراتيجيات" consistently.
3. **Given** the previous design is restored, **When** a user creates a folder, uploads a document, downloads a document, or navigates into and back out of a folder, **Then** each action behaves exactly as it does before this change.
4. **Given** a hospital coordinator, **When** they open the screen, **Then** they see only what their role permitted before this change, with no new or removed capability.

---

### User Story 3 — The internal-training form stops asking for a number nobody has yet (Priority: P2)

A coordinator records an internal training session. The form currently demands a trainee total at the moment of creation — before the session's attendance is known or documented. That field is removed, so creation captures only what is actually known then.

**Why this priority**: it is the only item that changes data entry rather than presentation, so it carries the highest chance of unintended behaviour change. Removing the field is narrow in the form but has a consequence for the training's lifecycle that must be decided first (Decision D1 below).

**Independent Test**: open the internal-training creation form and confirm the trainee field is absent; create a training and confirm it is recorded correctly; then confirm the trainings list, the training record page and the central-template flow are all unaffected.

**Acceptance Scenarios**:

1. **Given** a coordinator on the internal-training creation form, **When** the form renders, **Then** no trainee-count field is present, and the remaining fields are unchanged.
2. **Given** the form is submitted, **When** the training is created, **Then** it is recorded without a fabricated attendance figure.
3. **Given** a stale client that still sends a trainee count, **When** the submission reaches the server, **Then** the extra value is rejected or ignored, never written.
4. **Given** the trainings list and a training record page, **When** they render attendance figures, **Then** they continue to show attendance derived from actual attendance records, exactly as before.
5. **Given** the training record page's execution form, **When** a coordinator documents attendance by names or by total, **Then** it behaves exactly as before this change.

---

### User Story 4 — The tables read as one deliberate system (Priority: P2)

Users across twelve list screens meet the same table. It gains a new visual design, applied once and inherited everywhere.

**Why this priority**: high visibility and, because all eighteen instances render through one component, a single point of change. It ranks below the notification and programmes work because the table is already functionally sound — this is presentation.

**Independent Test**: compare all eighteen instances before and after; confirm identical data, columns, sorting, searching, filtering, paging, row actions, row navigation, empty states and skeletons, with only the visual treatment changed.

**Acceptance Scenarios**:

1. **Given** the new table design, **When** any of the eighteen instances renders, **Then** it shows the same columns and values as before, in the same order.
2. **Given** a narrow viewport, **When** a list renders, **Then** the stacked-card layout still binds every value to its label, and no screen scrolls horizontally at 400px.
3. **Given** a keyboard-only user, **When** they reach a table, **Then** sorting, row activation and paging remain operable with a visible focus indicator on every stop.
4. **Given** an Arabic list, **When** a user sorts or searches, **Then** Arabic-aware collation and harakat/alef-insensitive matching behave exactly as before.

---

### User Story 5 — The login page presents the portal (Priority: P3)

A coordinator signs in. The page becomes a split screen: the form on one half, a presentational panel on the other.

**Why this priority**: it is the first impression but the least-used screen per session, and it is blocked on Clarification Q2 — `public/` is empty, and `PRODUCT.md` forbids inventing an emblem, so the presentational half has no asset to show yet.

**Independent Test**: sign in successfully and unsuccessfully at desktop, tablet and 400px widths; confirm the split at wide widths, a single usable column at narrow widths, and unchanged authentication behaviour.

**Acceptance Scenarios**:

1. **Given** a wide viewport, **When** the login page loads, **Then** the form occupies one half and the presentational panel the other, in correct RTL order.
2. **Given** a 400px viewport, **When** the page loads, **Then** the form is fully usable in one column with no horizontal scroll, and the presentational half does not push it below the fold.
3. **Given** wrong credentials, **When** a user submits, **Then** the same Arabic error appears as before, in the product's own styling, and the entered email is preserved.
4. **Given** the brand constraints, **When** the presentational half renders, **Then** it contains no national emblem, no government trust mark, and no invented logo.

---

### User Story 6 — Navigation looks like this product (Priority: P3)

The sidebar is replaced with a visually distinct design, keeping the same destinations, grouping, role/scope chip and mobile behaviour.

**Why this priority**: purely aesthetic, on a surface redesigned one commit ago, and the item most likely to be iterated after the owner sees options. It is sequenced last so it does not collide with the table and palette work.

**Independent Test**: visit every destination as both roles; confirm identical entries, grouping, active-state accuracy, scope chip, mobile drawer, and keyboard reach.

**Acceptance Scenarios**:

1. **Given** the new sidebar, **When** a central user views it, **Then** every destination available before is present, in the same groups, and no destination is added or removed.
2. **Given** a hospital coordinator, **When** they view it, **Then** they see the coordinator's destinations only, and the scope chip names their hospital.
3. **Given** any route, **When** it loads, **Then** exactly one entry is marked current, and that marking is conveyed by more than colour alone.
4. **Given** a narrow viewport, **When** a user opens and closes the drawer and follows a link, **Then** it behaves as before.

---

### User Story 7 — Typography is one deliberate pairing (Priority: P3)

The project uses both Tajawal and Cairo under a stated rule.

**Why this priority**: lowest visual risk but it touches every screen at once, and it is blocked on Clarification Q3 — two families need a division of labour, which the brief does not state.

**Independent Test**: load every screen and confirm each text role resolves to the intended family, that no screen shows a fallback system font, and that added weight does not regress first paint.

**Acceptance Scenarios**:

1. **Given** the stated pairing, **When** any screen renders, **Then** each text role uses its assigned family consistently across all screens.
2. **Given** Arabic text in both families, **When** it renders, **Then** glyphs join correctly with no broken cursive connections and no missing Arabic-Indic numerals.

---

### User Story 8 — The portal shows its own mark (Priority: P3)

Until now the header and sidebar carried a generic shield glyph because no brand asset existed. The organisation's real logo is now supplied, so the product identifies itself.

**Why this priority**: high symbolic value, very small change, and deliberately kept separate from the sidebar redesign so it can be reverted on its own.

**Independent Test**: load any screen as either role and confirm the real mark appears in the header and sidebar, undistorted and legible, with the rest of the chrome untouched; revert this change alone and confirm item 5's sidebar redesign is unaffected.

**Acceptance Scenarios**:

1. **Given** any authenticated screen, **When** it renders, **Then** the header and sidebar show the organisation's logo rather than the generic glyph.
2. **Given** the logo's opaque white background, **When** it is placed on any chrome surface, **Then** no white box is visible against a contrasting field.
3. **Given** the logo's English line, **When** it renders at any size, **Then** it reads exactly as supplied, including "Contral", with no correction or masking.
4. **Given** this change is reverted alone, **When** the portal renders, **Then** the sidebar redesign from item 5 remains fully in place.

---

### Edge Cases

- A confirmation dialog is opened and the user navigates away, refreshes, or loses their session before answering — the underlying action must not execute.
- Two notifications are triggered in quick succession (a validation failure immediately followed by a session expiry) — they must not obscure each other or leave an unreachable dialog.
- A notification fires while a modal is already open — layering must keep both usable and keyboard focus unambiguous.
- The programmes screen with zero programmes, and with a folder containing zero documents — each needs a distinct empty state, since the current table distinguishes "nothing here" from "nothing matches".
- A programme title or document name long enough to overflow a card, and one containing Latin text or digits inside Arabic (bidirectional runs).
- A list of 500+ rows under the new table design, given that paging is client-side over already-loaded rows.
- The login page on a short landscape viewport, where a split screen can leave the form with almost no vertical room.
- Fonts fail to load from the network — text must remain readable and layout must not shift catastrophically.
- A trainee count entered as a non-integer, zero, negative, or with Arabic-Indic digits.
- The sidebar at a viewport between the mobile drawer and the fixed panel breakpoints.

## Requirements *(mandatory)*

### Functional Requirements

**Scope boundary**

- **FR-001**: This feature MUST be presentation-only except where a clarified requirement explicitly changes data entry. `prisma/**` and `src/server/**` MUST be unchanged in the diff unless a clarification requires otherwise, and no authorization, scoping or audit behaviour may change.
- **FR-002**: No existing user-facing capability may be removed, and no new capability added, beyond what these requirements state.
- **FR-003**: Every screen MUST remain Arabic and fully right-to-left, in the existing formal register, including all new and replaced interface elements.
- **FR-004**: Each item MUST be delivered as a separately reviewable change that records the files it modified and what changed in each.
- **FR-005**: Wherever more than one reasonable design option exists, the options MUST be presented to the owner for a decision before that item is implemented.
- **FR-005a**: Ink navy remains the institutional palette for every item in this feature. The supplied logo's green and tan MUST NOT enter the semantic colour scale, which stays limited to its three meanings; the logo sits as-is on neutral surfaces.

**Notifications and confirmations (item 3)**

- **FR-006**: All eight native dialog sites MUST be replaced. `window.alert` and `window.confirm` MUST NOT appear anywhere in `src/` after this change.
- **FR-007**: Every notification and confirmation MUST render right-to-left with Arabic text, the product's typography and the product's palette, and MUST NOT ship a third-party default appearance.
- **FR-008**: Confirmation dialogs MUST place affirmative and cancelling actions in correct RTL order, and MUST treat dismissal by `Escape`, by backdrop, or by browser back as a cancellation that does not execute the action.
- **FR-009**: Dialogs MUST be reachable and operable by keyboard: focus moves into the dialog on open, is trapped while open, and returns to the triggering control on close.
- **FR-010**: Dialogs MUST be announced to assistive technology with an accessible name and a role appropriate to whether they are informational or a confirmation.
- **FR-011**: A failure notification MUST preserve the user's form input.
- **FR-012**: The confirmation for archiving a visit MUST continue to require exactly one central user and MUST NOT introduce a second approver, a review step, or any role check beyond the existing one.

**Programmes screen (item 2)**

- **FR-013**: The screen MUST present programmes and their documents without a tabular row-and-column layout.
- **FR-014**: The presentation MUST be restored from the pre-table design preserved at commit `11feba4`, adapted to the palette and tokens shipped in `375eae6` rather than reintroducing that commit's colours.
- **FR-015**: The screen MUST be renamed to "البرامج والاستراتيجيات", and the name MUST be consistent across the screen title, the breadcrumb and the sidebar entry.
- **FR-016**: The rename MUST be recorded as a deviation from SRS terminology in `docs/CLAUDE_REFERENCE.md` §9 with its reason.
- **FR-017**: Every action available on the screen before this change — folder creation, document upload, document download, navigation into and out of folders — MUST remain available and behave identically, for both roles.
- **FR-018**: The screen MUST distinguish "this screen has no programmes" from "this folder is empty", as the current design does.

**Shared table (item 7)**

- **FR-019**: The new table design MUST be authored once in the shared table component and inherited by all remaining instances; no instance may carry its own bespoke styling.
- **FR-020**: Every instance MUST render the same columns, in the same order, with the same values as before.
- **FR-021**: Searching, sorting, filtering, paging, page-size selection, row actions, row navigation and per-screen state retention MUST behave exactly as before, including Arabic-aware collation and harakat/alef-insensitive search.
- **FR-022**: The narrow-viewport stacked layout MUST be retained, keeping every value bound to its label, with no horizontal page scroll at 400px on any list screen.
- **FR-023**: Table semantics MUST be preserved: column headers with scope, sort state exposed to assistive technology, keyboard-operable sort controls and row activation, and a visible focus indicator on every focus stop.
- **FR-024**: Both empty states and both loading skeletons MUST be retained and restyled with the table.

**Login page (item 4)**

- **FR-025**: At wide viewports the login page MUST present a two-half layout: the authentication form on one half and a presentational panel on the other, ordered correctly for RTL.
- **FR-026**: Below a stated breakpoint the layout MUST collapse to a single column in which the form is fully usable without horizontal scroll and without being pushed below the fold by the presentational half.
- **FR-027**: Authentication behaviour MUST be unchanged: the same fields, the same validation, the same Arabic error messages, the same redirect on success, and preservation of the entered email on failure.
- **FR-028**: The presentational half MUST contain no national emblem, no "official government website" trust mark, and no imitation of MoH or Absher branding. The organisation's own supplied logo is permitted and is not an invented emblem.
- **FR-028a**: The supplied logo MUST be presented at a size and on a background that keeps it legible and undistorted. Because the supplied file is a 400x400 raster on an opaque white field with no transparency, it MUST NOT be stretched to fill the panel and MUST NOT be placed on a coloured background that would reveal its white box.
- **FR-029**: Reference login designs MUST be researched and 2–3 concrete options presented to the owner before implementation.
- **FR-029a**: The presentational half MUST be a composed panel: the supplied logo at its natural size as the centrepiece, the portal name, a purpose line, and a quiet geometric field. The logo MUST NOT be stretched, upscaled beyond its native 400x400, or placed on a background that reveals its opaque white field. No further asset is required and none is to be waited for.

**Sidebar (item 5)**

- **FR-030**: The sidebar MUST be visually redesigned while preserving every destination, its grouping, and its role-dependent entries.
- **FR-031**: Exactly one entry MUST be marked as current for any route, and that marking MUST NOT rely on colour alone.
- **FR-032**: The role and scope indicator MUST be retained, naming the coordinator's hospital or the cluster-wide scope.
- **FR-033**: Mobile drawer behaviour — open, close, dismiss on navigation, and the backdrop — MUST be preserved, and all entries MUST remain keyboard reachable.
- **FR-034**: Modern sidebar designs MUST be researched and more than one option presented to the owner before implementation.

**Fonts (item 6)**

- **FR-035**: Both Tajawal and Cairo MUST be available across the project. Cairo MUST be used for headings and interface labels; Tajawal MUST be used for body text and data. The assignment MUST be applied consistently on every screen through the existing token layer rather than per-component overrides.
- **FR-036**: Fonts MUST be self-hosted through the existing font pipeline rather than fetched from a third-party stylesheet at runtime, and only the weights actually used may be loaded.
- **FR-037**: Arabic text MUST render with correct cursive joining in both families, and numerals must render in a single consistent system within any one context.
- **FR-038**: No screen may display a fallback system font during normal loading.

**Product mark in the chrome (item 8) — added by owner decision, deliberately separate from item 5**

- **FR-045**: The generic shield glyph in the header and in the sidebar MUST be replaced by the organisation's supplied logo.
- **FR-046**: This MUST be delivered as its own change, independent of the sidebar redesign in item 5, so that it can be reverted on its own without touching item 5.
- **FR-047**: The logo MUST be rendered at a size that keeps it legible and undistorted, and MUST NOT be placed on a coloured background that would reveal its opaque white field. Where the chrome surface is not white, the mark MUST be given a white or near-white plate rather than being knocked out.
- **FR-048**: The logo's English line reads "Contral". It MUST be reproduced verbatim wherever the logo appears and MUST NOT be corrected, masked, cropped out, or replaced with re-typed text. Any correction is a separate owner decision requiring a re-supplied asset.

**Internal-training trainees (item 1) — resolved: remove, not increase**

- **FR-039**: The trainee-count field MUST be removed from the internal-training creation form, from that form's submission payload, and from the validation schema for that creation path only.
- **FR-040**: The removal MUST NOT affect any other screen or path that reports or records attendance. Specifically, the attendance figure shown on the trainings list and on the training record page is derived from actual attendance records and MUST continue to work; the record page's execution form, which records attendance by names or by a single total, MUST be untouched; and the shared headcount bounds used by that form MUST remain in force.
- **FR-041**: No attendance figure may be invented at creation time to replace the removed field. An absent value must remain absent.
- **FR-042**: A newly created internal training MUST be recorded with status `pending` and with no attendance rows. The coordinator documents attendance afterwards on the training record page, by names or by a single total, using the execution form that already exists.
- **FR-042a**: The behaviour change this causes is accepted and intended: creating an internal training no longer marks it complete, and it will appear in the dashboard's pending-training count until documented.
- **FR-043**: A submission that still carries a trainee count from a stale client MUST NOT result in a written attendance figure.
- **FR-044**: Validation MUST remain enforced on the server, not only in the form.

### Key Entities

- **Training attendance**: already modelled as either one named attendee or one total headcount per row, never both, enforced by a database check constraint and a partial unique index. Item 1 must respect this; it does not introduce a new entity.
- **Programme folder and programme document**: the existing folder tree and its documents, re-presented by item 2 without schema change.
- **Notification / confirmation**: a presentation concern only. Nothing is persisted; no entity is introduced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of `window.alert` or `window.confirm` remain in `src/`, and all eight replaced sites present an Arabic RTL in-product dialog when triggered. **Verified at the US2 checkpoint, not at US1.** US1 replaces seven sites and deliberately defers the eighth, in `ProgramsView.tsx`, to US2, which rewrites that file; replacing it twice would be wasted work.
- **SC-002**: Every confirmation can be completed and cancelled using the keyboard alone, with focus returning to the triggering control in 100% of cases.
- **SC-003**: All 18 table instances show identical data, columns and ordering before and after the redesign, verified instance by instance.
- **SC-004**: No list screen scrolls horizontally at a 400px viewport width.
- **SC-005**: Every focus stop on every changed screen shows a visible focus indicator drawn from the product palette.
- **SC-006**: Text contrast on all changed surfaces meets 4.5:1 for body text and 3:1 for large text and focus indicators, measured on rendered output rather than estimated.
- **SC-007**: The programmes screen offers the same set of actions to each role as it did before the change, enumerated and compared control by control.
- **SC-008**: Sign-in succeeds and fails with unchanged messages and redirects at 1440px, 768px and 400px widths.
- **SC-009**: Every sidebar destination reachable before the change is reachable after it, for both roles, with exactly one entry marked current per route.
- **SC-010**: `npm run typecheck`, `npm run lint` and `npm run build` all pass, and no screen regresses beyond its measured pre-change render time by more than 25%.
- **SC-011**: `prisma/**` and `src/server/**` are empty in the diff, except for any change a resolved clarification explicitly authorises.
- **SC-012**: For each of the eight items, a record exists naming the files modified and what changed in each.
- **SC-013**: A newly created internal training is recorded as pending with zero attendance rows, and its attendance figure renders as an absent value rather than a fabricated zero-as-fact.
- **SC-014**: The trainings list and the training record page report the same attendance figures before and after item 1, for trainings that already have attendance.
- **SC-015**: Reverting item 8 alone leaves item 5's sidebar redesign intact, demonstrated by the revert touching no file item 5 changed.

## Assumptions

- "Metronic" in item 4 refers to the split-screen **layout pattern** only. The Metronic palette was deliberately removed in `375eae6` and recorded as an owner commitment in `PRODUCT.md`; it will not be reintroduced.
- "The current sidebar" in item 5 means the light paper panel shipped in `375eae6`, not the dark admin template that preceded it.
- The new table design and all other work builds on the navy/attn/danger tokens from `375eae6` rather than introducing new colours.
- Item 2's target state is the design at commit `11feba4`, restored in structure and layout but re-tokenised to the current palette. The owner does not need to supply the previous design — it was located in version control.
- SweetAlert2 is acceptable as a new runtime dependency for item 3, subject to it being themable to the palette and correct in RTL. If it cannot meet FR-007 through FR-010, an in-product dialog component satisfying the same requirements is an acceptable substitute.
- Items 4 and 5 each stop for owner approval after options are presented; implementation does not begin until an option is chosen.
- The archive confirmation dialog identified as a P0 in the design critique at `.impeccable/critique/` is treated as part of item 3, since it is one of the three `window.confirm` sites. Its content beyond a plain confirmation remains the owner's decision.
- **Corrected consequence of the pending decision, verified in code**: internal trainings can never derive the *late* status and can never raise an overdue notification. `dueDate` lives on `TrainingTemplate`, not on `Training`; `deriveTrainingStatus` reads `template?.dueDate ?? null`, and the reminder query filters on `template: { dueDate: { lt: now } }`, which is an inner join a template-less training cannot satisfy. So a pending internal training appears in the dashboard's pending count but has no deadline and nothing will ever chase it. This is accepted as the lesser problem than a training badged "completed and officially documented" showing zero attendees. Giving internal trainings their own deadline and reminder would be new behaviour that this brief does not request, and is left as a separate owner decision.
- The supplied logo's "Contral" spelling is reproduced verbatim by FR-048. The owner has said they will decide separately whether to re-supply a corrected asset.
- Item 8 exists because the supplied logo discharges the `PRODUCT.md` condition "keep the text wordmark until real assets are supplied". It is deliberately not folded into item 5 so the two can be reverted independently.
- Out of scope, and explicitly not addressed here: the Arabic type-size floor, the visits-list column redesign, the missing route-level error boundaries, and touch-target sizing. These were deferred by the owner and remain open.

## Clarifications — resolved 2026-09-29

- **Q1 → Custom: remove, do not increase.** The trainee-count field is removed from the internal-training creation form, its payload and its validation, scoped to that path only. Captured in FR-039 to FR-044 and User Story 3. Raised Decision D1 below.
- **Q2 → B: the owner supplied an image.** Located at `Desktop/logo1.jfif`, verified as a JPEG (`ff d8 ff e0`) and copied byte-identically to `public/ipc-hail-logo.jpg` — a rename, not a conversion, which matters because no image converter is installed. Raised Decisions D2 and D3 below.
- **Q3 → A: Cairo for headings and interface labels, Tajawal for body text and data.** Captured in FR-035.

Recorded about the supplied asset, because it changes more than one item:

- It is the organisation's own logo — «إدارة مكافحة العدوى بصحة حائل» / "Hail Infection Prevention and Contral Directorate" — not a photograph or a decorative image.
- **This satisfies the `PRODUCT.md` condition "keep the text wordmark until real assets are supplied."** A real asset now exists, so the wordmark-only constraint is discharged and the logo may be used in the product chrome.
- It is 400x400, raster, on an **opaque white background with no transparency**, and there is no vector or alpha version. That bounds where it can be placed.
- Its own palette is **green and tan/gold**, which is in direct tension with the ink-navy palette shipped in `375eae6` — see Decision D2.
- The English line in the logo reads "Contral", not "Control". This is in the owner's asset and will be reproduced verbatim wherever the logo appears; it is reported, not corrected.

## Decisions — resolved 2026-09-29

- **D1 → A.** A new internal training is created as `pending` with no attendance; the coordinator documents attendance afterwards on the record page. The behaviour change is accepted as intended. See FR-042 and FR-042a, and the verified consequence recorded in Assumptions.
- **D2 → A.** Ink navy stays the palette. The logo's green and tan do not enter the semantic scale. See FR-005a.
- **D3 → A.** The login's presentational half is a composed panel built around the logo at its natural size. No further asset is required or awaited. See FR-029a.
- **Bonus → its own item.** Replacing the generic shield glyph with the real logo becomes item 8, deliberately separate from item 5 so it can be reverted independently. See User Story 8 and FR-045 to FR-048.
- **Logo typo → reproduce verbatim.** FR-048. The owner will decide separately whether to re-supply a corrected asset.

## Delivery Order

Items 2, 3, 5, 6 and 7 were unblocked first and go to planning together. Items 1, 4 and 8 follow once these answers are folded in — which they now are, so all eight are specified.

| Order | Item | Priority | Notes |
|---|---|---|---|
| 1 | 3 — Notifications | P1 | Widest reach; one of the three sites is the archive confirmation the design critique raised as a P0. |
| 2 | 2 — Programmes screen | P1 | Removes one table instance before item 7 restyles the rest. |
| 3 | 7 — Shared table | P2 | One authoring point, sixteen remaining instances inherit. |
| 4 | 1 — Remove trainee field | P2 | The only item touching a Server Action. |
| 5 | 6 — Fonts | P3 | Global but low risk; lands before the two appearance items so they are designed against final type. |
| 6 | 8 — Product mark | P3 | Small and independently revertible. |
| 7 | 5 — Sidebar | P3 | Options presented before implementation. |
| 8 | 4 — Login split screen | P3 | Options presented before implementation. |
