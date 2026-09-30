# Phase 0 Research: Portal UI Overhaul

**Feature**: `004-portal-ui-overhaul` | **Date**: 2026-09-29

Every finding below was verified against the repository at `375eae6`, against a live package registry, or against the Google Fonts API. Nothing here is assumed.

---

## R-001 — Notification library (item 3)

**Decision**: adopt **SweetAlert2 v11.26.25**, but never call it from a component. All eight sites call a single wrapper module.

**Verified facts**: version 11.26.25, MIT licence, **zero runtime dependencies**, ships `dist/sweetalert2.esm.all.js` as its ESM entry and its own `.d.ts`. It describes itself as an "accessible (WAI-ARIA)" replacement for native popups, and RTL is supported. No framework requirement is stated — it is vanilla JS, so it is framework-agnostic and React-version-independent.

**Rationale**: the brief names it, it is dependency-free, and it is the project's only new runtime dependency beyond icons.

**Risks and how the design answers them**:

| Risk | Answer |
|---|---|
| It ships an opinionated default theme that will fight the navy palette | Theme through `customClass` against project classes; do not accept the default look. FR-007 forbids shipping a third-party default appearance. |
| It is a client-only global that must not enter the server bundle | Import it dynamically inside a `'use client'` wrapper so it is never evaluated during server render. |
| RTL needs to be correct, not merely possible | Set direction explicitly on the popup and verify button order in the browser rather than trusting the library's auto-detection, which has a history of issues when direction is set via inline style rather than the document. |
| If it fails FR-007 to FR-010, replacing it must not mean touching eight sites again | **This is the load-bearing decision**: a single module, `src/lib/notify.ts`, exposes `notify.info()`, `notify.error()` and `notify.confirm()`. Components import only that. Swapping the implementation is then one file. |

**Alternatives considered**: a hand-built dialog component (more work, but full control and no dependency — kept as the documented fallback the spec already permits); `react-hot-toast` or similar (toasts cannot express a blocking confirmation, so the three `confirm` sites would still need something else); keeping native dialogs (rejected by the brief and by the design critique).

---

## R-002 — Font pairing (item 6)

**Decision**: load **Cairo** alongside Tajawal via `next/font/google`, expose it as `--font-cairo`, and map roles **in the token layer only**.

**Verified facts**: Cairo is live on Google Fonts (v31) and serves a full Arabic unicode range — `U+0600-06FF, U+0750-077F, U+0870-088E, U+FB50-FDFF, U+FE70-FEFC`, nine `unicode-range` blocks — confirmed by fetching the CSS2 API directly (HTTP 200). `next/font/google` draws from the same catalogue, so `Cairo({ subsets: ['arabic', 'latin'], weight: [...], variable: '--font-cairo' })` is valid.

**Rationale**: `globals.css` already funnels every text role through three tokens — `--font-display`, `--font-body`, `--font-sans` — all currently pointing at Tajawal. Q3's answer maps cleanly onto that: `--font-display` becomes Cairo (headings and labels), `--font-body` and `--font-sans` stay Tajawal (body and data). **This satisfies FR-035 without editing a single component**, because every component already inherits through `font-sans`/`font-display`.

**Open cost to resolve during implementation**: Tajawal currently loads **six weights** (300, 400, 500, 700, 800, 900). Adding Cairo at six weights roughly doubles the font payload on a portal whose users may be on hospital networks. The implementation must first measure which weights are actually referenced in `src/` and load only those, for both families. This is a task, not a guess.

**Alternatives considered**: `next/font/local` with self-hosted files (more control, but `next/font/google` already self-hosts at build time, so it adds nothing); a CSS `@import` from Google (rejected — FR-036 requires no runtime third-party stylesheet); Cairo everywhere (rejected by Q3 and by the `PRODUCT.md` commitment that Tajawal stays).

---

## R-003 — Login split-screen direction (item 4)

**Constraint that shapes all options**: the supplied asset is a **400×400 logo on opaque white**, not a hero image. It cannot be stretched, and it cannot sit on a coloured field without revealing its white box (FR-028a, FR-029a).

Current market patterns, from the research: a brand panel beside a short form is the default for admin products; the panel typically carries a gradient or dark field with editorial copy; forms carry field icons and a show/hide password toggle — both of which this login already has.

**Three options to put to the owner**:

| Option | Composition | Trade-off |
|---|---|---|
| **L1 — Paper panel** | Presentational half in the same near-white paper as the app; logo at natural size centred on it; portal name in Cairo beneath; a one-line purpose statement; a faint navy geometric field (thin rules or a large soft shape) at low contrast | Logo sits on white, so no white-box problem at all. Calmest, most "official record". Least visually striking. |
| **L2 — Navy field with a logo plate** | Presentational half in deep navy; the logo placed on an explicit white rounded plate; portal name and purpose reversed out in white | Strongest brand presence and closest to the Metronic pattern the brief cites. The white plate is a deliberate device, not an accident. |
| **L3 — Split with a data motif** | Navy field carrying an abstract, non-fabricated motif drawn from the product itself — a rule grid, a seal mark, a repeating shield/lock lattice — with the logo on a plate, smaller | Most distinctive and most "this product". Highest design risk, and the motif must not imply real data, per Principle III. |

All three collapse to a single column below `lg`, with the form first (FR-026).

**Recommendation to present**: **L2**, as the best balance of the brief's "half image and text" against the asset's real constraints.

**Decision (2026-09-30): L2 — navy field with the logo on a plate.**

---

## R-004 — Sidebar direction (item 5)

**Constraint**: every destination, group, role chip and mobile behaviour is preserved (FR-030 to FR-033). Only appearance changes. The current state is the light paper panel from `375eae6`.

Research confirms the fixed vertical sidebar remains the default for admin products with stable, high-frequency destinations, that 256px collapsing to a ~64px icon rail is the common modern treatment, and that spatial stability matters more than novelty — users build spatial memory and stop hunting.

**Three options to put to the owner**:

| Option | Treatment | Trade-off |
|---|---|---|
| **S1 — Collapsible icon rail** | Keeps the paper panel but adds a collapse to a ~64px icon-only rail, with labels on hover/focus and the state remembered | The most functional change: reclaims ~200px on laptop screens for the wide tables. Icon-only nav is a known accessibility risk, so labels must remain reachable — and the design critique already flagged icon-only navigation as a first-timer failure. |
| **S2 — Deep navy panel** | Returns to a dark panel, but in the product's own navy at a proper contrast level rather than the old template's `#1e1e2d`, with the active item as a light plate | Strong anchor on the RTL right edge; visually the biggest change; reverses part of what shipped hours ago in `375eae6`. |
| **S3 — Floating inset card** | The panel becomes an inset rounded card with a margin around it, sitting on a tinted page field, with grouped sections as subtle cards | Most contemporary look; adds nesting, which the craft floor treats as a smell; costs horizontal space rather than saving it. |

**Recommendation to present**: **S1**, because it is the only one of the three that makes the product measurably better to use rather than merely different — and the brief's "better and different" invites that reading.

**Decision (2026-09-30): S1 — collapsible icon rail.**

---

## R-005 — Shared table redesign (item 7)

**Decision**: change only presentation inside `src/components/table/**`; leave every behaviour contract intact.

**Verified scope**: 18 instances across 9 files today. Item 2 removes the 2 in `ProgramsView`, so item 7 inherits **16** across 8 files. Sequencing item 2 first is therefore not arbitrary — it shrinks item 7's surface before it starts.

**Frozen behaviour** (FR-020 to FR-024): Arabic collation via `Intl.Collator('ar', { numeric: true })`; search normalisation that folds harakat, tatweel and alef variants but deliberately not `ة→ه` or `ى→ي`; client-side sort/filter/page over loaded rows; per-screen state retention via `listStateStore`; the dual wide-table / narrow-`<dl>` layout rendered server-side and switched by CSS; `th[scope]`, `aria-sort`, keyboard-operable sorting, row activation; both empty states; both skeletons.

**Directions to present**: (T1) denser ruled rows with a quieter header and stronger zebra separation, tuned for scanning 62 records; (T2) card-like rows with generous padding and a hairline divider, calmer but fewer rows per screen; (T3) a "document" treatment — ruled like a printed register, tabular numerals, heavier column-header rule — the closest to the "official record" register the owner chose.

**Recommendation**: **T3**, as the only direction that answers the design critique's finding that the record "looks like a form, not evidence".

**Decision (2026-09-30): T3 — printed register.**

---

## R-006 — Removing the trainee field (item 1)

**Decision**: remove from exactly three places; leave four others untouched.

**Traced**: `attendeeCount` appears in seven locations. Three belong to the creation path and are removed — the form state and input in `TrainingsView.tsx`, the value passed to the action, and the `attendeeCount` member of `internalTrainingSchema` in `src/server/actions/trainings.ts`. The other four are a **derived** value, `attendeeNames.length + headcount`, computed in `src/server/queries/trainings.ts` from real attendance rows and consumed by the trainings list column and the training record page. **Those must not change** — removing them is precisely the "affects other screens" failure the brief warns against.

**The status change (D1 → A)**: `createInternalTraining` currently writes `status: 'completed'` and the attendance row in one transaction. It will instead write `status: 'pending'` with no attendance.

**Verified consequence, which corrects the rationale the decision was taken on**: an internal training can **never** derive `late` and can **never** raise an overdue reminder. `dueDate` lives on `TrainingTemplate`, not on `Training`; `deriveTrainingStatus` reads `template?.dueDate ?? null`; and the reminder query in `src/app/api/cron/notifications/route.ts` filters on `template: { dueDate: { lt: now } }`, an inner join a template-less training cannot satisfy. So a pending internal training appears in the dashboard's pending count, has no deadline, and nothing will ever chase it. Accepted as the lesser problem; giving internal trainings their own deadline is new behaviour this brief does not request.

**Also required**: FR-043 — a stale client still posting a count must not write one. zod strips unknown keys by default, so removing the schema member is sufficient; this must be asserted rather than assumed.

---

## R-007 — Keeping item 8 independently revertible

**Decision**: item 8 touches **only** the two mark sites — the shield glyph in `Header.tsx` and in `Sidebar.tsx` — plus the asset already in `public/`. It lands as its own commit, before item 5.

**Rationale**: FR-046 requires reverting item 8 alone to leave item 5 intact. If item 8 ships *after* the sidebar redesign, reverting it means reverting a hunk inside a file item 5 rewrote, which git will fight. Landing item 8 **first**, as a small isolated commit, means item 5's later rewrite simply carries the logo forward — and reverting item 8 is a clean single-commit revert. SC-015 is verified by checking the revert touches no file item 5 changed beyond the mark itself.

**Asset handling**: `public/ipc-hail-logo.jpg`, 400×400, opaque white, no alpha, no vector. At chrome sizes (~36px) it renders via `next/image` with explicit `width`/`height`. Because it has no transparency, FR-047 requires a white or near-white plate wherever the surrounding chrome is not white. The login use gets `priority` since it is above the fold; the chrome use does not.

---

## R-008 — Restoring the programmes design (item 2)

**Decision**: take the **structure** from `11feba4`, not its styling.

**Verified**: `git show 11feba4:src/components/views/ProgramsView.tsx` is 367 lines, contains **zero** `DataTable` references, and uses a responsive folder/card grid (`grid-cols-1/2/3`) with folder-creation modals. The current file is 429 lines with 2 `DataTable` instances.

**Rationale**: that commit predates both the shared table *and* the navy palette, so restoring it verbatim would reintroduce teal and the old token set. FR-014 requires the layout restored and the colours re-tokenised. The safest method is to diff the two versions to extract exactly what the table migration replaced, rather than checking the old file out wholesale.

**Rename**: «البرامج والاستراتيجيات» in the screen title, breadcrumb and sidebar entry, plus an SRS deviation record in `docs/CLAUDE_REFERENCE.md` §9 (FR-015, FR-016).

---

## R-009 — Verification approach

**Decision**: reuse the harness already in the session scratchpad rather than adding any test dependency to the project.

It provides a seeded scratch PostgreSQL, a production build, a CDP browser driver, full-page screenshot capture at 1440px and 400px for both roles, a WCAG contrast measurement pass with `lab()` normalisation, a CDP Tab-walk focus probe, and touch-target measurement. The palette work in `375eae6` was verified with exactly these, so before/after comparison is like-for-like.

**Constitution Principle V** requires `npm run typecheck`, `npm run lint` and `npm run build` to pass before any item is called done, and requires claims to state what was verified and what was not.
