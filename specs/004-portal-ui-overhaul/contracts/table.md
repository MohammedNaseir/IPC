# Contract: the shared table

**Modules**: `src/components/table/**` | **Covers**: FR-019 to FR-024, item 7

Item 7 changes how the table **looks**. Everything below is what it must still **do**, unchanged, at all 16 inheriting instances. This is a freeze list: anything on it that changes is a regression, not a redesign.

## Inheritance

One authoring point. No view may carry bespoke table styling (FR-019). After item 2 removes the single instance in `ProgramsView`, the inheriting set is **17 instances across 8 files**: `AssetsView`, `AuditView`, `DashboardView`, `DocumentsView`, `HospitalProfileView`, `HospitalsView`, `TrainingsView`, `VisitsView`.

## Frozen data behaviour

| Behaviour | Contract |
|---|---|
| Columns | Same columns, same order, same rendered values as before, instance by instance (FR-020, SC-003) |
| Sorting | Arabic-aware via `Intl.Collator('ar', { numeric: true })`. Sort state round-trips through the per-screen store |
| Search | Normalisation folds harakat, tatweel and the alef variants `أ إ آ ٱ → ا`, and **deliberately does not** fold `ة→ه` or `ى→ي`. Changing this is a behaviour change, not a style change |
| Filtering | Screen-level filter selects persist under the same `stateKey` as the table they belong to |
| Paging | Client-side over already-loaded rows. Page size options unchanged. In RTL, "previous" sits on the right |
| State retention | Per-screen via `listStateStore`, keyed by `stateKey`. Distinct keys must stay distinct — a shared key across sub-tabs caused a real cross-tab leak in feature 002 |
| Row actions | Same actions, same order, same permissions |
| Row navigation | Row activation still navigates; the primary cell's link still stops propagation so it does not double-fire |

## Frozen structural behaviour

| Behaviour | Contract |
|---|---|
| Dual layout | Both the wide table and the narrow `<dl>` card list are rendered **server-side** and switched by CSS. They must not become client-conditional — that would reintroduce a hydration mismatch the current design specifically avoids |
| Narrow layout | Every value stays bound to its label as a `<dt>`/`<dd>` pair. No value may be orphaned or dropped (FR-022) |
| No horizontal scroll | No list screen scrolls horizontally at 400px (SC-004). Screen-level filter rows must keep wrapping |
| Empty states | Two distinct states — "this screen has no records" and "nothing matches your filter" — with different icons, messages and hints. Conflating them is the single most common empty-state bug and this codebase deliberately refuses it (FR-024) |
| Skeletons | Both `TableSkeleton` and `RecordSkeleton` retained and restyled with the table |

## Frozen accessibility

| Behaviour | Contract |
|---|---|
| Semantics | Real `<table>` with `th[scope="col"]`; the labelled region wrapper is retained |
| Sort state | `aria-sort` on the active column, updated as it changes |
| Keyboard | Sort controls activate by keyboard; rows activate by keyboard; paging is reachable |
| Focus | A visible focus indicator on every focus stop, drawn from the palette (SC-005). As of `375eae6` this comes from a global `:focus-visible` rule plus explicit rings on opted-in controls; the redesign must not reintroduce a `outline: none` without a replacement |
| Contrast | Body text ≥4.5:1, large text and UI indicators ≥3:1, measured on rendered output (SC-006) |

## Design latitude

What item 7 **may** change: row density and padding, rule and divider weight and colour, header treatment, zebra or hairline separation, numeral treatment in data columns, badge and chip styling, hover and selected treatment, the toolbar and pagination chrome, and the card layout's visual grouping.

Three directions are drafted for owner approval in `research.md` R-005 (T1 dense ruled, T2 calm cards, T3 printed register). **T3 is recommended**, as the only one that answers the critique's finding that records look like forms rather than evidence.

## Verification

Compare all 17 instances before and after: same data, same columns, same ordering. Re-run the feature-002 regression suite, which covers every list and every table instance. Re-measure contrast and focus with the harness in R-009.
