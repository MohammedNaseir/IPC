# Phase 1 Data Model: Unified Data Table for Record Screens

This feature stores nothing. There is no Prisma change, no migration, and no query change. What follows
are the presentation types it introduces and the inventory of lists that migrate.

## Presentation types (`src/lib/table.ts`)

### ColumnDef<T>

| Field | Type | Meaning |
|---|---|---|
| `key` | string | Stable identifier, used for sort state and as the React key |
| `header` | string | Arabic column heading, also the field label in the stacked-card layout |
| `value` | `(row: T) => string \| number \| null` | The sortable/searchable primitive for this cell |
| `render` | `(row: T) => ReactNode` *(optional)* | Presentation when the cell is more than text (badge, link, icon). Defaults to the `value` result, or a dash when null |
| `type` | `'text' \| 'number' \| 'date'` | Chooses the comparator (default `'text'`) |
| `sortable` | boolean | Default `true` |
| `searchable` | boolean | Default `true` for `'text'`, `false` otherwise |
| `align` | `'start' \| 'end'` *(optional)* | Numeric columns align to the end |
| `hideBelowMd` | boolean *(optional)* | Omit from the stacked card when the field is noise on a phone |

### RowAction<T>

| Field | Type | Meaning |
|---|---|---|
| `label` | string | Arabic action label, used as accessible name and tooltip |
| `icon` | LucideIcon | Existing icon vocabulary |
| `onSelect` | `(row: T) => void` | Invokes the screen's existing handler — no new behaviour |
| `isAvailable` | `(row: T) => boolean` *(optional)* | Hides the action for rows that cannot accept it (FR-011), e.g. an archived visit |
| `tone` | `'default' \| 'primary'` *(optional)* | Visual weight only |

No `delete` action type exists, because the product has no delete operation (see spec, flagged item 1).

### TableState (returned by `useTableState`)

| Field | Type | Meaning |
|---|---|---|
| `query` / `setQuery` | string | Search term; setting it resets `page` to 1 (FR-009) |
| `sort` / `toggleSort` | `{ key: string; direction: 'asc' \| 'desc' } \| null` | Active sort; toggling a new key resets `page` to 1 |
| `page` / `setPage` | number | 1-based |
| `pageSize` / `setPageSize` | number | Default 25; options 10 / 25 / 50 / 100 |
| `filteredRows` | `T[]` | All rows matching the search, sorted — the set the audit export uses (R-007) |
| `visibleRows` | `T[]` | The current page slice |
| `totalCount` | number | `rows.length` before filtering — drives the "screen is empty" state |
| `filteredCount` | number | `filteredRows.length` — drives heading counts and the "no matches" state |
| `pageCount` | number | Derived; the hook clamps `page` into range when the filter shrinks the set |

State lives per table instance and is not persisted between visits.

### Derived display rules

| Situation | Result |
|---|---|
| `totalCount === 0` | "Screen has no records" empty state |
| `totalCount > 0 && filteredCount === 0` | "No records match the filter" empty state |
| `value(row)` is `null` | Cell renders an explicit dash; row sorts last in both directions |
| Filter excludes the selected row (master-detail) | Table reports no selection; the screen's detail panel shows its own notice (FR-021) |

## Migration inventory

12 record lists across 8 screens. "Actions" lists only what the screen already does today.

| # | Screen | List | Columns (from today's cards) | Row actions today | Notes |
|---|---|---|---|---|---|
| 1 | HospitalsView | Hospitals | name, type, location, coordinator, visits count, trainings count, practitioners count, equipment count, status | open profile, edit, toggle status | Sub-section A |
| 2 | HospitalsView | Coordinator directory | coordinator name, hospital, email, status | edit credentials, edit hospital, assign coordinator | Sub-section B; separate table state |
| 3 | VisitsView | Visits | hospital, visit date, team, status, compliance score, attachment count, response count | select (drives detail) | Master-detail; selection preserved |
| 4 | TrainingsView | Trainings | title, hospital, kind (central/internal), status, attendee count, due date | select (drives detail) | Master-detail |
| 5 | AssetsView | Practitioners | name, role, licence number, hospital, email | edit | Sub-section A |
| 6 | AssetsView | Equipment | name, type, serial number, hospital, status, last maintenance | edit | Sub-section B |
| 7 | DocumentsView | Policies | title, category, version, file size, uploaded at | download | One component, three configs |
| 8 | DocumentsView | Org documents | title, type, uploaded by, file size, uploaded at | download | |
| 9 | DocumentsView | Document centre | title, uploaded by, file size, uploaded at | download | |
| 10 | ProgramsView | Current node contents | kind (folder/file), name, description or file size, uploaded at | open folder / download file | Breadcrumb navigation unchanged |
| 11 | AuditView | Audit log | entity type, action, performed by, timestamp, entity id | none | Already a table; export must keep filtered-set semantics |
| 12 | DashboardView | Hospital comparison | name, type + location, coordinator, completed visits, compliance rate, status | none | Only this table migrates from the dashboard |

Also in scope: the record lists embedded in `HospitalProfileView` and in the hospitals "comprehensive
profile" (visits, trainings, practitioners, equipment for one hospital) — same tables, narrower column
sets.

**Explicitly out of scope**: the dashboard's KPI cards, alert cards, bar chart and donut; the hospital
profile's summary panels; every modal and form; the login screen.

## Invariants the migration must preserve

- The rows a screen renders come from the same already-scoped props as today (FR-017, SC-006).
- Every displayed value and its formatting is unchanged (FR-023).
- Detail panels, sub-section switching, breadcrumbs, heading counts, exports and print behaviour survive
  (FR-019, SC-007).
- No file under `src/server/**` or `prisma/**` changes (FR-018, SC-005).
