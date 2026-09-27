# Quickstart: Validating the Unified Data Table

How to prove the table works and that no screen changed behind it. Shapes live in
[data-model.md](./data-model.md) and [contracts/](./contracts/); this is the run guide.

## Prerequisites

- Dependencies installed (`npm install`). **No new dependency** is expected — if `package.json` gained
  one, decision R-001 was changed and should be re-justified.
- A scratch PostgreSQL database and a built server, as used for feature 001. Never the production Neon
  database.
- Environment: `DATABASE_URL`, `AUTH_SECRET`, `UPLOADS_DIR`.
- Seed data with enough volume to exercise paging: one central user, two hospitals each with a
  coordinator, and **at least 60 visits and 60 trainings across the two hospitals**, plus a handful of
  practitioners, equipment, policies, org documents, document-centre files and a programme with nested
  folders. Create them through the existing actions; no seed fixtures ship with the product.
- Include deliberately awkward values: names with Arabic diacritics (`مُستشفى`) and alef variants
  (`أحمد` vs `احمد`), a 150-character title, records with absent values (no compliance score, no licence
  number, no maintenance date), and two records sharing a name.

## 0. Gates and the rendering-only proof

```bash
npm run typecheck
npm run lint
npm run build
git diff --stat -- src/server prisma        # MUST be empty (FR-018, SC-005)
git diff --stat -- package.json             # expect no new dependency (R-001)
```

The `git diff` on `src/server` and `prisma` is the cheapest possible evidence for "rendering-layer only".
If it prints anything, stop and explain why before going further.

## 1. Table mechanics on the pilot screen (User Story 1)

On `/visits` as central, with 60+ records:

1. First page shows at most 25 rows and a total matching count.
2. Type a term matching a few hospitals → only those rows remain, the count updates, paging returns to
   page 1.
3. Clear the term → the full set and original count return.
4. Sort by visit date → ascending, header shows direction; activate again → descending.
5. Sort by a column containing absent values → dashes group at one end in **both** directions.
6. Sort by compliance score → 9 sorts before 10 (numeric, not lexical).
7. Sort by hospital name with `أحمد`/`احمد` present → Arabic alphabetical order, not byte order.
8. Search `مستشفى` → also matches a value written `مُستشفى` (diacritics ignored).
9. Page forward and back → different rows each page, sort and search still applied.
10. Search for nonsense → "no records match" message, *not* the "screen is empty" message.
11. 1,000 rows (temporarily seeded or synthesised in a scratch run): sorting and filtering update without
    perceptible delay (SC-004).

## 2. Every screen behaves the same (User Story 2)

For each of the 12 lists in the migration inventory, walk the 10-point per-screen acceptance list in
[contracts/screen-migration-contract.md](./contracts/screen-migration-contract.md). Record pass/fail per
screen in a table; a screen is not done until all 10 pass.

Particular traps:

- **Hospitals** and **Assets**: switch sub-sections after sorting and searching in one — the other must be
  untouched.
- **Visits** / **Trainings**: select a record, then sort, search, and page — the detail panel keeps the
  same record. Then filter it out — the detail area says so rather than showing stale content.
- **Programs**: drill into a folder → rows are that folder's contents, sort/search/page reset, breadcrumb
  still navigates back.
- **Audit**: filter, then export → the file contains exactly the filtered rows, as today.
- **Documents**: the same component with three configurations must show the right items on each of the
  three routes, and no cross-contamination.

## 3. Narrow viewport (User Story 3)

At a 400px-wide viewport on every migrated screen:

1. Records render as stacked cards with labelled fields; no horizontal page scrolling anywhere.
2. Search, sort and paging all still work and affect the cards.
3. Row actions are reachable in the card footer.
4. Layout and controls read right-to-left with Arabic labels.
5. Widen past the breakpoint → table rows with headers return.

## 4. Role-scoping regression (SC-006 — the important one)

Extend the feature-001 harness pattern: log in as coordinator A, coordinator B and central, fetch every
migrated screen, and assert per screen that

- coordinator A's payload contains A's markers and **zero** B markers (and vice versa),
- central's payload contains both,
- the record set per screen matches a baseline captured from the pre-migration build.

Capture the baseline **before** migrating (same seed data, same logins) so the comparison is real rather
than a restatement of the new behaviour. A screen that renders an unscoped array is the failure this step
exists to catch, and it is invisible in a screenshot.

## 5. Accessibility spot checks

- Tab through a table: every sort header and row action is reachable; Enter/Space activates.
- The active sort header exposes `aria-sort`; the narrow layout keeps each value associated with its
  label.
- Row activation on master-detail screens works from the keyboard, not only by mouse.

## 6. Pure helper checks

`compareValues` and `normalizeForSearch` in `src/lib/table.ts` carry no React dependency, so exercise them
directly in a small script: Arabic ordering, numeric ordering, date ordering, nulls last in both
directions, diacritic and alef normalisation, and that normalisation never alters the displayed value.

## 7. Documentation follow-through

- `docs/CLAUDE_REFERENCE.md` records the shared table as the convention for list rendering, so future
  screens do not reintroduce bespoke card grids.
- Note in the same place that paging is client-side and that server-side paging is a deferred follow-up,
  so nobody reads this feature as having solved large-list performance.
