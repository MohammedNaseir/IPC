# Phase 0 Research: Unified Data Table for Record Screens

All Technical Context unknowns are resolved. No `NEEDS CLARIFICATION` items remain — the spec's one open
question (paging scope) was decided by the product owner before planning: client-side only.

## R-001 — Build the table or adopt a library

**Decision**: hand-roll a focused `DataTable` + `useTableState` in this repository. No new dependency.

**Rationale**: what this feature needs is narrow — single-column sort, substring search over chosen
columns, fixed-size paging, two layouts. A headless library would supply only the state logic, which is
roughly 120 lines here, while every cell, header, control and card in this app is bespoke RTL Tailwind
markup that the library cannot provide. The constitution's simplicity bias and the project's small
dependency surface both argue against importing a general-purpose table engine to use a tenth of it.

**Alternatives considered**:
- `@tanstack/react-table` (headless, ~14 kB, MIT) — the strongest option, and the right answer if
  column resizing, grouping, virtualisation or multi-sort ever become requirements. Rejected now: it
  brings a large API surface and its own mental model for capabilities the spec does not ask for, and it
  still leaves all RTL rendering to us. Revisit rather than reinvent if those needs appear.
- `mui-datatables` / AG Grid / any styled grid — rejected outright: they impose their own visual system
  and LTR-first layout, which would fight the existing Apple-derived design and the RTL requirement.
- Per-screen tables with no shared component — rejected: that is the status quo the feature exists to
  remove.

## R-002 — Arabic-aware sorting

**Decision**: compare with a single cached `Intl.Collator('ar', { numeric: true, sensitivity: 'base' })`
for text; compare dates as timestamps and numbers as numbers by declaring a column's value type. Records
with an absent value always sort last, in both directions.

**Rationale**: raw code-unit comparison orders Arabic text by byte value, which does not match alphabetical
expectation; `Intl.Collator` with the `ar` locale does, and `numeric: true` also fixes "10" sorting before
"9" inside mixed strings. Constructing a collator per comparison is measurably slow, hence one cached
instance. Keeping absent values pinned to the end in both directions means toggling direction never
scatters the dashes through the list, which is what users find confusing.

**Alternatives considered**:
- `String.prototype.localeCompare` per comparison — same result, but allocates a collator per call;
  rejected on the 1,000-row target (SC-004).
- Sorting absent values as empty strings — rejected: they would interleave at one end depending on
  direction, making a mixed column look sorted incorrectly.

## R-003 — Search matching for Arabic text

**Decision**: normalise both the search term and the searched values before matching: trim, lowercase,
strip Arabic diacritics (harakat) and tatweel, and unify alef variants (`أ إ آ ٱ` → `ا`). Match as a
substring. Display values are never modified.

**Rationale**: Arabic is typically typed without diacritics and with inconsistent alef hamza, so a naive
substring search fails on values entered with them — a coordinator searching `مستشفى` would miss
`مُستشفى`. This conservative set fixes the common misses.

**Alternatives considered**:
- Plain case-insensitive substring — rejected: misses the diacritic and alef cases that occur in real
  entered data.
- Also folding `ة`→`ه` and `ى`→`ي` — rejected for now: it broadens matching but introduces false
  positives between genuinely different words, and the spec asks only for case/whitespace insensitivity
  (FR-007). Revisit if users report misses.
- Fuzzy matching — out of scope; no requirement, and it makes "why did this row match?" unanswerable.

## R-004 — Responsive collapse to stacked cards

**Decision**: render both layouts and switch with Tailwind breakpoint classes (table visible from the
`md` breakpoint up, cards below). No JavaScript media queries, no resize listeners.

**Rationale**: the layout is then correct in the very first paint, server-rendered HTML matches the
client (no hydration mismatch), and it keeps working if JS is slow. The cost is duplicated DOM for the
visible page, which is bounded by the page size (25 rows), so it is negligible.

**Alternatives considered**:
- `window.matchMedia` with state — rejected: introduces a flash of the wrong layout on first paint and a
  hydration-mismatch risk in a server-rendered app.
- A horizontally scrolling table on phones — explicitly rejected by the feature description; it is the
  failure mode being designed out.
- Container queries — attractive (the table, not the viewport, is what matters) but unnecessary here
  since these tables always occupy the main column; revisit if the table is ever embedded in a narrow
  panel.

## R-005 — State ownership and reset rules

**Decision**: `useTableState` owns sort, search term and page for one table instance. Changing the search
term or the sort column resets to page one. Screens with independent sub-sections instantiate one table
per sub-section so state cannot leak. In master-detail screens the *selected record id* stays in the
parent screen, and the table receives it plus an `onSelect` callback.

**Rationale**: resetting the page on filter change prevents the "empty page 4 of 1" state, which FR-009
requires and which is the most common paging bug. Keeping selection in the parent preserves FR-021 — the
detail panel is the parent's concern, and the table should not own what is selected, only report clicks.

**Alternatives considered**:
- One table state shared per screen with a sub-section discriminator — rejected: switching sections would
  carry a stale sort column that does not exist in the other section's columns.
- Selection inside the table — rejected: the detail panel would then depend on table internals, and a
  filtered-out selection could not be reported to the user as FR-021 requires.
- Persisting state in the URL or storage — out of scope by the spec's assumption that view state is not
  remembered; worth revisiting as a small follow-up since it would make links shareable.

## R-006 — What "loading state" means in this app

**Decision**: implement a `TableSkeleton` and use it from route-level `loading.tsx` files, not from a
client fetch state.

**Rationale**: every record screen is a server component that receives data as props; no screen fetches
on the client, so there is no in-component loading phase to represent. The real perceptible wait is the
route transition, which Next.js covers with `loading.tsx`. Building a fake client-side loading flag would
satisfy FR-013 in appearance while never actually rendering in production.

**Alternatives considered**:
- A `loading` prop toggled by the screens — rejected: nothing would ever set it true; it would be dead
  code pretending to be a feature.
- Skipping the loading state entirely — rejected: FR-013 is a real requirement, and route transitions on
  a slow connection currently show nothing.

## R-007 — Keeping the audit export honest

**Decision**: `useTableState` returns the filtered-and-sorted rows (not just the visible page) alongside
the page slice, and the audit screen exports that set.

**Rationale**: the audit screen today filters client-side and exports what the filter produced. If export
read the raw array it would silently export more than the user sees, and if it read the page slice it
would export less. Returning the filtered set makes the existing semantics expressible without the screen
reaching into table internals.

**Alternatives considered**:
- Exporting the current page only — rejected: changes today's behaviour.
- Screens re-implementing the filter for export — rejected: two filters that must agree forever is how
  they end up disagreeing.

## R-008 — Heading counts

**Decision**: screens that show a count in their heading read the filtered count from the table state and
label it as the number matching the current filter.

**Rationale**: SC-007 and FR-006 require the heading and the table to agree. Today those headings count
the unfiltered set, which was harmless because there was no filter; once filtering exists, an unchanged
heading would contradict the rows on screen.

## R-009 — The programme explorer

**Decision**: the table lists the children of the current node — folders first, then files — with a kind
column distinguishing them. Breadcrumbs, drilling in, and the back affordance are unchanged. Navigating
resets sort/search/page for the new node.

**Rationale**: the spec forbids changing navigation behaviour, and a flat table of every file in every
programme would be a different feature. Listing the current node's contents keeps the explorer's meaning
while still giving sorting and search within a folder.

**Alternatives considered**:
- A fully flattened table of all programme files with a path column — rejected: changes navigation
  semantics, and loses the folder structure the SRS requires (FR-32/FR-33).
- Leaving Programs on cards — rejected: the description names it explicitly.

## R-010 — Accessibility

**Decision**: real `<table>` semantics on the wide layout with `<th scope="col">`, `aria-sort` on the
active sortable header, sort controls as `<button>`s inside headers, and row actions as focusable
buttons. The narrow layout uses a definition list per card so each value keeps its label programmatically.

**Rationale**: FR-022 requires keyboard reach and an announced sort. Native table semantics give screen
readers row/column context for free, which a div grid would have to recreate with ARIA and usually gets
wrong.

## R-011 — Verifying a rendering change of this size without a test suite

**Decision**: three layers of evidence — the standard gates; a per-screen before/after matrix recorded by
hand (records shown, counts, detail panel, sub-sections, breadcrumbs, export, print); and a scripted
role-scoping comparison that logs in as a coordinator and as central and asserts the record sets per
screen are unchanged and contain no other hospital's markers. Plus a diff assertion that `src/server/**`
and `prisma/**` contain no changes (FR-018, SC-005).

**Rationale**: the dangerous failure here is invisible in a screenshot — a screen rendering an unscoped
array. The existing harness pattern from feature 001 already logs in as two coordinators and greps
payloads for foreign markers, so extending it is cheap and directly targets SC-006. The diff assertion is
the cheapest possible proof of "rendering-layer only" and removes the need to argue about it in review.

**Alternatives considered**:
- Introducing a component test framework as part of this feature — the right long-term answer and worth
  its own feature, but bundling it here would double the scope of an already large change.
- Manual clicking only — rejected: cannot demonstrate SC-006 credibly across 12 lists and 2 roles.
