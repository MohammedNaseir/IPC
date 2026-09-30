# Quickstart: validating the Portal UI Overhaul

**Feature**: `004-portal-ui-overhaul` | **Date**: 2026-09-29

How to bring the environment up and prove each item works. No test framework is installed and none is added — verification is a real build against a real database, driven through a real browser (R-009).

## Prerequisites

- Node 20, already installed; `node_modules` present.
- The scratch PostgreSQL and CDP harness in the session scratchpad under `scratchpad/pgtest/`.
- **Never point this at the Neon database.** The scratch instance is seeded, isolated, and disposable.

## Bring the environment up

```bash
# 1. scratch PostgreSQL (port 54341, seeded: 3 hospitals, 62 visits, 101 trainings, 4 users)
cd <scratchpad>/pgtest && node start.mjs     # wait for READY

# 2. build and serve the app
cd <repo> && npm run build
source <scratchpad>/pgtest/env.sh && npm run start   # 127.0.0.1:38141
```

If Postgres refuses to start after a forced kill, recreate its ephemeral directories (`pg_notify`, `pg_serial`, `pg_stat*`, `pg_logical/*`, `pg_multixact/*`, `pg_wal/archive_status`) and remove a stale `postmaster.pid`. If it reports "pre-existing shared memory block is still in use", stop the orphaned `postgres` process first.

Accounts: `central@test.local` (central) and `coord.a@test.local` (hospital coordinator). Passwords are in `scratchpad/pgtest/secrets.json`.

## Gates — run for every item, before calling it done

```bash
npm run typecheck && npm run lint && npm run build
```

Constitution Principle V: an item is not done until these pass and the claim states what was verified and what was not. Stop the server before rebuilding — it locks `.next/standalone` on Windows.

## Per-item validation

### Item 3 — Notifications

```bash
grep -rn "window\.alert\|window\.confirm" src/   # must return nothing (SC-001)
```

Then in the browser, trigger all eight sites and check each dialog for: RTL direction and correct button order, project typography and colour, focus entering the dialog and returning to the trigger on close, `Escape` cancelling without executing, and form input surviving a failure. Confirm the archive confirmation still requires exactly one central user and adds no approver (FR-012).

### Item 2 — Programmes

Open the screen as both roles. Confirm no tabular layout; confirm the title, breadcrumb and sidebar all read «البرامج والاستراتيجيات»; enumerate every control before and after and compare (SC-007); check both empty states — no programmes, and an empty folder. Confirm the SRS deviation is recorded in `docs/CLAUDE_REFERENCE.md` §9.

### Item 7 — Shared table

Walk all 17 instances and compare columns, order and values against the pre-change capture. Re-run the feature-002 regression suite. Re-measure contrast and the Tab-walk focus probe. Check 400px on every list for horizontal scroll (SC-004).

### Item 1 — Remove trainee field

The only item touching a Server Action, so verify against the database, not the screen alone:

1. The creation form shows no trainee field; remaining fields unchanged.
2. Create an internal training. Query it: `status` is `pending` and it has **zero** `TrainingAttendance` rows (SC-013).
3. Post the action directly with an `attendeeCount` still in the payload, as a stale client would. Confirm no attendance row is written (FR-043).
4. Compare the trainings list and a record page's attendee figures against the pre-change capture, for trainings that already have attendance (SC-014).
5. Document attendance on the new training's record page by names, and again by total, and confirm both still work.

### Item 6 — Fonts

Confirm headings and interface labels resolve to Cairo and body and data to Tajawal, on every screen, via computed `font-family`. Confirm no screen falls back to a system font. Confirm Arabic joins correctly in both families. Compare font payload before and after — only weights actually used may be loaded (R-002).

### Item 8 — Product mark

Confirm the logo replaces the shield in the header and sidebar for both roles, is undistorted, and sits on a white or near-white plate wherever the chrome is not white (FR-047). Confirm the English line still reads "Contral" (FR-048). Then:

```bash
git revert --no-commit <item-8-commit> && git status   # must touch only the mark sites
```

This is SC-015. Item 8 lands **before** item 5 precisely so this revert stays clean (R-007).

### Item 5 — Sidebar

Approval gate first: present S1/S2/S3 from R-004. After implementing, visit every destination as both roles and confirm the entries, grouping and role-dependent items are identical; exactly one entry is current per route and not by colour alone; the scope chip names the right hospital; the mobile drawer opens, closes and dismisses on navigation; every entry is keyboard reachable.

### Item 4 — Login

Approval gate first: present L1/L2/L3 from R-003. Then sign in successfully and unsuccessfully at 1440px, 768px and 400px (SC-008). Confirm the split at wide widths and a single usable column at 400px with the form above the fold. Confirm the logo is not stretched beyond 400×400 and shows no white box against its background. Confirm the error message and email preservation are unchanged.

## Whole-feature checks

| Check | How |
|---|---|
| Scope boundary (SC-011) | `git diff --name-only -- prisma src/server` returns only `src/server/actions/trainings.ts`, and only for item 1 |
| Contrast (SC-006) | Harness contrast pass; body ≥4.5:1, large and indicators ≥3:1, `lab()` values normalised |
| Focus (SC-005) | CDP Tab-walk with real key dispatch. Programmatic `.focus()` does **not** arm `:focus-visible` in headless and will produce a false negative |
| No horizontal scroll (SC-004) | Full-page capture at 400px across every list |
| Render budget (SC-010) | Warm-database timings compared to the pre-change capture; ≤25% regression |
| Per-item record (SC-012) | Each item records its modified files and what changed |

## Tear down

Stop the app server, then the scratch PostgreSQL. On Windows the server holds `.next/standalone`; stop it before any rebuild.
