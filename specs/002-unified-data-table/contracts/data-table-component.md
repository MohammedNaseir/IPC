# Contract: Shared Data Table Component

The UI contract every migrated screen programs against. Types are defined in
[../data-model.md](../data-model.md).

## `<DataTable<T> />` — `src/components/table/DataTable.tsx`

A client component. It imports nothing from `@/server/**`, performs no data access, and holds no
knowledge of any specific screen.

### Props

| Prop | Type | Required | Behaviour |
|---|---|---|---|
| `rows` | `T[]` | yes | Already-scoped records from the screen's props. The table never fetches |
| `columns` | `ColumnDef<T>[]` | yes | Column order is display order |
| `rowKey` | `(row: T) => string` | yes | Stable React key |
| `actions` | `RowAction<T>[]` | no | Rendered in a trailing actions column / card footer; a row omits any action whose `isAvailable` returns false |
| `onRowSelect` | `(row: T) => void` | no | Makes the whole row activatable; used by master-detail screens |
| `selectedRowKey` | `string \| null` | no | Highlights the selected row; supplied by the parent screen, never owned by the table |
| `searchPlaceholder` | string | no | Defaults to a generic Arabic "search" placeholder |
| `emptyMessage` | string | no | Overrides the "screen has no records" text |
| `noMatchMessage` | string | no | Overrides the "no records match" text |
| `initialSort` | `{ key: string; direction: 'asc' \| 'desc' }` | no | Per-screen default ordering, matching today's order where the screen has one |
| `pageSize` | number | no | Defaults to 25 |
| `isLoading` | boolean | no | Renders `TableSkeleton` instead of rows |
| `onStateChange` | `(state: { filteredRows: T[]; filteredCount: number }) => void` | no | Lets a screen mirror the filtered count in its heading and lets the audit screen export the filtered set |

### Behaviour

- **Sorting**: activating a sortable header sorts ascending; activating the active header reverses it. One
  column at a time. Text uses the cached Arabic collator, numbers compare numerically, dates compare as
  timestamps. Null values sort last in both directions.
- **Search**: one text field filters across columns where `searchable !== false`, matching normalised
  substrings (trim, lowercase, diacritics and tatweel stripped, alef variants unified). Setting a term
  returns to page 1.
- **Paging**: renders one page slice; shows the current page, page count, and the matching-record total.
  If the filter shrinks the set below the current page, the page clamps into range rather than showing a
  blank page.
- **Empty states**: "this screen has no records" and "no records match the current filter" are distinct
  and never substituted for each other.
- **Wide layout** (`md` and up): a real `<table>`; `<th scope="col">`; `aria-sort` on the active header;
  sort controls are `<button>`s; the actions column is last in DOM order.
- **Narrow layout** (below `md`): one card per row, each field a label/value pair in a definition list,
  actions in the card footer. No horizontal page scrolling. Columns marked `hideBelowMd` are omitted.
- **RTL**: the component assumes the page's RTL direction and does not reverse it locally; icons and
  paging controls follow reading order.
- **Keyboard**: sort headers and row actions are tab-reachable and activate on Enter/Space; when
  `onRowSelect` is set the row itself is reachable and activatable.

### Guarantees

- Presentation only: it never mutates `rows`, never calls a Server Action, and never derives a value the
  caller did not provide through `value`/`render`.
- Client-side filtering is **not** an access control. The caller is responsible for passing only rows the
  current role may see — as today's screens already do via role-scoped queries.

## `useTableState<T>` — `src/components/table/useTableState.ts`

Holds sort/search/page for one table instance and returns the `TableState` described in
[../data-model.md](../data-model.md). `DataTable` uses it internally; a screen may use it directly when it
needs `filteredRows` (audit export) or `filteredCount` (heading counts) without re-implementing the
filter.

## Supporting components

| Component | Responsibility |
|---|---|
| `TableToolbar` | Search input plus the matching-record count |
| `TablePagination` | Page controls and page-size selector, Arabic labels |
| `TableEmptyState` | The two distinct empty messages |
| `TableSkeleton` | Loading placeholder, used by route-level `loading.tsx` (research.md R-006) |

## Pure helpers — `src/lib/table.ts`

Exports the types plus `compareValues(a, b, type)` and `normalizeForSearch(text)`. These carry no React
dependency so the verification harness can exercise the comparison and normalisation rules directly.
