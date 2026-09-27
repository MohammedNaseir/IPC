# Contract: Per-Screen Migration

What migrating one screen is allowed to change, and what it must leave identical. Applies to each of the
12 lists in [../data-model.md](../data-model.md).

## Permitted changes

- Replace the screen's bespoke list markup (card grid, row stack, or hand-written `<table>`) with a
  `ColumnDef` array plus `<DataTable />`.
- Add sorting, searching and paging affordances that the screen did not previously have.
- Point the screen's heading count at the filtered count.
- Add a route-level `loading.tsx` that renders `TableSkeleton`.

## Forbidden changes

| Forbidden | Why |
|---|---|
| Any edit under `src/server/**` or `prisma/**` | FR-018, SC-005. A diff check enforces it |
| Changing which rows the screen receives, or adding client-side role filtering | FR-017, SC-006. Scoping stays server-side |
| New or altered Server Action calls | Rendering-layer only |
| New derived or reformatted values in cells | FR-023 — a cell shows what the screen shows today |
| Removing a detail panel, sub-section, breadcrumb, export or print behaviour | FR-019, SC-007 |
| Adding a delete action | No delete operation exists anywhere in the product |
| Changing a route, redirect or guard | Route behaviour is out of scope |

## Per-screen acceptance

Each migrated screen must satisfy all of these before it counts as done:

1. **Same records**: for both roles, the set of records rendered is identical to the pre-migration set —
   verified by comparing rendered payloads, not by eyeballing.
2. **No foreign records**: a coordinator's payload contains no marker belonging to another hospital.
3. **Heading count agrees** with the table's reported matching count, filtered and unfiltered.
4. **Row actions** open exactly the dialogs/panels the cards opened, pre-filled as before, and are absent
   on rows that cannot accept them.
5. **Sub-sections** keep independent sort/search/page state.
6. **Master-detail** screens keep their detail panel and selection across sort, search and page changes;
   a filtered-out selection is reported, not shown stale.
7. **Narrow layout** at 400px: stacked cards, every wide-layout field still readable, no horizontal page
   scroll.
8. **RTL and Arabic** across headers, search placeholder, paging, sort indicators and both empty states.
9. **Keyboard**: sort and row actions reachable and activatable; active sort announced.
10. **Screen-specific behaviour** preserved: audit export emits the filtered set; programme breadcrumbs
    navigate and reset table state per node; print output unchanged.

## Migration order

Pilot with **Visits** (highest volume, exercises master-detail and selection), then **Trainings**, then
the simpler lists (Practitioners, Equipment, Documents ×3), then **Hospitals** (two sub-sections, the
largest file), then **Programs** (breadcrumb explorer), and finally **Audit** and the **dashboard
comparison**, which already have tables and therefore carry the least risk and the least benefit.
