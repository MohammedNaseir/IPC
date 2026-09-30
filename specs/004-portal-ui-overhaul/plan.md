# Implementation Plan: Portal UI Overhaul

**Branch**: `main` (owner directed: no feature branch) | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-portal-ui-overhaul/spec.md`

## Summary

Eight items across the portal's presentation layer: replace every native dialog with an in-product Arabic RTL one, return the programmes screen to a folder/card repository and rename it, restyle the one shared table that sixteen lists inherit, remove a trainee-count field that asks for a number nobody has yet, pair Cairo with Tajawal, put the organisation's real logo into the chrome, redesign the sidebar, and split the login page.

Seven of the eight are presentation-only and touch no server code. The exception is item 1, which edits one Server Action. The palette shipped in `375eae6` — ink navy with three semantic meanings — is fixed for all eight (FR-005a); the supplied logo's green and tan stay out of the scale.

Two items stop for owner approval after options are presented: the login page (R-003) and the sidebar (R-004). Options for both are already drafted in `research.md`.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19.3, Node 20

**Primary Dependencies**: Next.js 16.3.5 App Router (Turbopack), Tailwind CSS v4, Prisma 7.10 + `@prisma/adapter-pg`, `zod` 4.6, `jose`, `bcryptjs`, `lucide-react`. **New**: `sweetalert2` 11.26.25 (MIT, zero runtime dependencies) and the `Cairo` family via `next/font/google`.

**Storage**: PostgreSQL. **No schema change in this feature** — `prisma/**` is empty in the diff.

**Testing**: no test framework is installed and none is added. Verification is the scratchpad harness described in R-009 — seeded scratch PostgreSQL, production build, CDP browser driver, screenshots at 1440px and 400px for both roles, measured WCAG contrast, a Tab-walk focus probe, and touch-target measurement — plus `npm run typecheck`, `npm run lint`, `npm run build`.

**Target Platform**: server-rendered web behind an authenticated session; deployed standalone to a Windows/IIS host. Arabic, RTL-only.

**Project Type**: single Next.js App Router application; no separate frontend/backend split.

**Performance Goals**: no screen regresses beyond its measured pre-change render time by more than 25% (SC-010). Font payload must not grow unnecessarily — only weights actually used are loaded, for both families (R-002).

**Constraints**: Arabic RTL throughout; no horizontal scroll at 400px; body text ≥4.5:1 and large text and focus indicators ≥3:1, measured on rendered output; no existing capability removed; each item separately reviewable with its modified files recorded.

**Scale/Scope**: 8 items, 8 user stories, 52 functional requirements, 15 success criteria. Touches ~21 source files plus the shared table and shell components; 17 table instances inherit item 7 after item 2 removes 1.

## Constitution Check

*GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design.*

| Principle | Status | Evidence |
|---|---|---|
| **I. Server-Only Data Access** | **PASS** | Only item 1 touches `src/server/**`, editing `src/server/actions/trainings.ts`, which keeps `import 'server-only'`. No client component gains a Prisma or driver import. The notification wrapper is explicitly client-side and dynamically imported so it never enters a server bundle (R-001). |
| **II. Layered Server-Side Authorization** | **PASS** | `createInternalTraining` retains `requireActionUser()`, `assertHospitalAccess()` and zod parsing; only one schema member is removed. No route gate, scope filter or guard changes. FR-001 forbids any authorization or scoping change. |
| **III. No Backdoors, No Fabricated Data** | **PASS** | FR-041 explicitly forbids inventing an attendance figure to replace the removed field — an absent value stays absent, which is this principle stated in the negative. The logo is a real owner-supplied asset, not an invented emblem, which is what discharges the `PRODUCT.md` wordmark constraint. FR-048 forbids silently correcting the asset. R-003's L3 option is bounded so no motif implies real data. |
| **IV. Spec-Anchored Scope** | **PASS, with two recorded deviations** | The screen rename is a deviation from fixed SRS terminology and FR-016 requires it recorded in `docs/CLAUDE_REFERENCE.md` §9. Item 1's status change — internal trainings created `pending` rather than `completed` — is a behaviour change from the shipped implementation, made by explicit owner decision D1, and must be recorded the same way. Item 8 is scope the brief did not contain, added by explicit owner decision. |
| **V. Evidence Before Done** | **PASS** | SC-010 requires all three gates green. Item 1 changes a Server Action, so Principle V's stronger clause applies: its verification must observe the actual result against a real database, not be inferred. R-009 names the harness. |

**Security & Data Integrity**: uploads, sessions, the audit trail and visit immutability are untouched. `logAudit` still runs inside the same transaction in `createInternalTraining`. The Arabic/RTL requirement is FR-003, and it covers every new element.

**No violations require justification.** The Complexity Tracking table is therefore omitted.

One item is worth tracking without being a violation: SweetAlert2 is the project's first UI runtime dependency beyond icons. R-001 contains it behind a single wrapper module so it is replaceable in one file, which is what makes the dependency acceptable rather than load-bearing.

## Project Structure

### Documentation (this feature)

```text
specs/004-portal-ui-overhaul/
├── plan.md              # This file
├── spec.md              # 8 user stories, 52 FRs, 15 SCs
├── research.md          # Phase 0 — R-001..R-009
├── data-model.md        # Phase 1 — entity impact
├── quickstart.md        # Phase 1 — validation guide
├── contracts/           # Phase 1 — UI contracts
│   ├── notify.md
│   └── table.md
├── checklists/
│   └── requirements.md  # 16/16 passing
└── tasks.md             # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
public/
└── ipc-hail-logo.jpg              # item 8, item 4 — already in place, byte-verified

src/
├── app/
│   ├── layout.tsx                 # item 6 — add Cairo, expose --font-cairo
│   └── globals.css                # item 6 — remap --font-display to Cairo
├── lib/
│   └── notify.ts                  # item 3 — NEW. the only module that knows about SweetAlert2
├── components/
│   ├── hooks/
│   │   └── useActionRunner.ts     # item 3 — the shared error path, 1 of 8 sites
│   ├── auth/
│   │   └── LoginView.tsx          # item 4 — split screen
│   ├── shell/
│   │   ├── Header.tsx             # item 8 — mark; item 3 — no dialogs here
│   │   └── Sidebar.tsx            # item 8 — mark (lands FIRST); item 5 — redesign (lands after)
│   ├── table/                     # item 7 — the single authoring point
│   │   ├── DataTable.tsx
│   │   ├── TableToolbar.tsx
│   │   ├── TablePagination.tsx
│   │   ├── TableEmptyState.tsx
│   │   ├── TableSkeleton.tsx
│   │   └── RecordSkeleton.tsx
│   └── views/
│       ├── ProgramsView.tsx       # item 2 — restore folder/card, rename, -2 table instances
│       ├── TrainingsView.tsx      # item 1 — remove the trainee field
│       ├── TrainingDetailView.tsx # item 3 — 3 of 8 sites
│       ├── VisitDetailView.tsx    # item 3 — the archive confirmation (critique P0)
│       ├── DashboardView.tsx      # item 3 — 1 site
│       └── DocumentsView.tsx      # item 3 — 1 site
└── server/
    └── actions/
        └── trainings.ts           # item 1 ONLY — remove one schema member, change status

docs/
└── CLAUDE_REFERENCE.md            # §9 — two recorded SRS deviations
```

**Structure Decision**: the existing single-application layout is kept unchanged. No new directory is introduced; the only new source file is `src/lib/notify.ts`, placed in `src/lib/` because that is where serializable, client-safe shared modules already live. `prisma/` does not appear above because it is untouched, which SC-011 asserts.

## Delivery Order and Gates

Ordered so each item shrinks or de-risks the next. Items 4 and 5 stop for approval; item 8 lands before item 5 for revert isolation (R-007).

| # | Item | Why here | Gate before starting |
|---|---|---|---|
| 1 | **3 — Notifications** | Widest reach per unit of work; one of its three confirmations is the archive dialog the design critique raised as a P0 and the owner has already approved fixing | none |
| 2 | **2 — Programmes** | Removes 1 of 18 table instances before item 7 restyles the rest | none |
| 3 | **7 — Shared table** | One authoring point; 17 instances inherit | present T1/T2/T3 |
| 4 | **1 — Remove trainee field** | Only item touching a Server Action; isolated so its verification is unambiguous | none |
| 5 | **6 — Fonts** | Global but low risk; lands before the appearance items so those are designed against final type | none |
| 6 | **8 — Product mark** | Small, isolated, and **must precede item 5** so it reverts cleanly | none |
| 7 | **5 — Sidebar** | Appearance only; carries the logo forward from item 6 | **approval required** — present S1/S2/S3 |
| 8 | **4 — Login** | Last; uses the logo and the final type | **approval required** — present L1/L2/L3 |

After each item: record the files modified and what changed (FR-004, SC-012), and run the three gates.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 artifacts were written. **Still passing.** The design introduced no new server surface, no schema change, no new authorization path and no fabricated data. The two Principle IV deviations identified before Phase 0 — the screen rename and the internal-training status change — are unchanged in nature and both are covered by an explicit requirement to record them. The `contracts/` artifacts are UI contracts, not network APIs, and introduce no new external interface.
