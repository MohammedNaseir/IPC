# Feature Specification: Unified Data Table for Record Screens

**Feature Branch**: `main` (no dedicated feature branch created; spec directory: `specs/002-unified-data-table`)

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Replace every list-style screen in the app (Hospitals, Visits, Trainings, Practitioners, Equipment, Policies, OrgDocuments, DocumentCenterFiles, Programs, and any other screen currently rendering a list of records as cards or ad-hoc markup) with one unified, reusable data table component. The table must support: configurable columns per screen, sorting, search/filtering, pagination, per-row actions (view/edit/delete as applicable per screen), empty and loading states, full Arabic RTL layout, and responsive behavior — on narrow viewports it collapses into stacked cards instead of a horizontally-scrolling table, since the number of hospitals/visits/trainings is expected to grow significantly. This is a rendering-layer change only: no query, business logic, or route behavior may change while migrating a screen to the new table."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find one record in a long list (Priority: P1)

A central administrator opens the visits screen, which now lists hundreds of visits. They type part of a
hospital name to narrow the list, sort by visit date to bring the newest first, and step to the next page
when the record is further down. The record they want is on screen within seconds instead of after
scrolling through a wall of cards.

**Why this priority**: This is the whole point of the change. Card grids have no ordering, no search and
no paging, so they degrade the moment a screen holds more than a screenful of records. Delivering
sort + search + paging on one high-volume screen already removes the pain, and is a complete,
shippable slice.

**Independent Test**: Load a screen with 200+ records, search for a term matching a handful, sort by two
different columns, page forward and back, and confirm the expected record is reachable in a few
interactions with counts that stay consistent.

**Acceptance Scenarios**:

1. **Given** a screen with more records than fit one page, **When** the user opens it, **Then** the first
   page of rows is shown with a visible indication of how many records match in total.
2. **Given** a list of records, **When** the user types a term matching some of them, **Then** only
   matching rows remain, the displayed count reflects the filtered set, and paging restarts at page one.
3. **Given** a filtered list, **When** the user clears the search term, **Then** the full set returns and
   the count returns to its original value.
4. **Given** a sortable column, **When** the user activates its header, **Then** rows reorder by that
   column ascending, the header shows the direction, and activating it again reverses the order.
5. **Given** a multi-page list, **When** the user moves to the next page, **Then** a different set of
   rows appears, the current page is indicated, and the active sort and search are still applied.
6. **Given** a search term that matches nothing, **When** results are empty, **Then** a message says no
   records match the filter — distinct from the message shown when the screen holds no records at all.

---

### User Story 2 - The same table everywhere, with per-screen columns and actions (Priority: P2)

Every record screen — hospitals, coordinators, visits, trainings, practitioners, equipment, policies,
organisational documents, document centre files, programme contents, the audit log and the dashboard's
hospital comparison — presents its records through the same table, each with the columns that matter to
it and the row actions that screen already supports. A user who learns the table on one screen knows how
every other screen behaves.

**Why this priority**: Consistency is the durable benefit, but it only pays off after the mechanics from
User Story 1 exist. It is also where the regression risk lives, so it follows rather than leads.

**Independent Test**: Visit each migrated screen and confirm the same header, search box, sorting
affordance, paging control and empty state, with columns and actions appropriate to that screen — and
that the data shown is identical to what the screen showed before.

**Acceptance Scenarios**:

1. **Given** any migrated screen, **When** it renders records, **Then** the header, search field, sorting
   affordances, paging control, empty state and row layout are visibly the same mechanism as every other
   migrated screen.
2. **Given** a screen where a record can be opened for detail, **When** the user activates the row's view
   action, **Then** the same detail view opens that the previous card layout opened.
3. **Given** a screen where a record can be edited, **When** the user activates the row's edit action,
   **Then** the same edit dialog opens, pre-filled exactly as before.
4. **Given** a coordinator signed in for one hospital, **When** they open every migrated screen, **Then**
   they see exactly the records they saw before the change and no records belonging to another hospital.
5. **Given** a screen with sub-sections (practitioners vs equipment, or hospitals vs coordinators),
   **When** the user switches section, **Then** each section keeps its own sort, search and page position
   without leaking state into the other.
6. **Given** a screen that showed a record count in its heading, **When** a filter is applied, **Then**
   that heading count agrees with the number of rows the table reports.

---

### User Story 3 - Usable on a narrow screen (Priority: P3)

A coordinator opens the trainings screen on a phone. Instead of a table they must drag sideways to read,
each record becomes a stacked card showing its fields as labelled lines, with the same actions available.

**Why this priority**: Real use includes phones, and a horizontally scrolling table is the failure mode
this feature is meant to avoid. It is last because the desktop mechanics must exist first, and it is
independently demonstrable by resizing.

**Independent Test**: Open a migrated screen at a 400px-wide viewport and confirm no horizontal page
scrolling, every field readable as a labelled line, and the row actions still reachable.

**Acceptance Scenarios**:

1. **Given** a viewport narrower than the collapse threshold, **When** a migrated screen renders,
   **Then** records appear as stacked cards with labelled fields and no horizontal page scrolling.
2. **Given** the narrow layout, **When** the user searches, sorts or pages, **Then** all three still work
   and affect the stacked cards the same way they affect table rows.
3. **Given** a viewport wider than the threshold, **When** the screen renders, **Then** records appear as
   table rows with column headers.
4. **Given** either layout, **When** the interface renders, **Then** it reads right-to-left with Arabic
   labels, including the paging control and sort indicators.

---

### Edge Cases

- A screen holds zero records → the empty state explains the screen is empty, not that a filter matched
  nothing.
- A filter matches nothing on the last page → the view returns to a page that has rows rather than
  showing a blank page.
- Arabic text sorting → names order per Arabic alphabetical expectations, not raw byte order; mixed
  Arabic/Latin values order predictably.
- Values that are absent (no compliance score, no licence number, no maintenance date) → sorting places
  them consistently at one end rather than scattering them, and they display as an explicit dash.
- Dates sort chronologically, not as text; numbers sort numerically, not as text ("10" after "9").
- Very long Arabic names or file titles → the row truncates without breaking the layout, and the full
  value stays reachable.
- A record that cannot be edited (an archived visit) → that row offers no edit action rather than
  offering one that fails.
- Master-detail screens (visits, trainings) → the currently selected record stays selected while the user
  sorts, searches or pages; if a filter removes it, the detail panel says so instead of showing stale
  data.
- The programme explorer → the table lists the contents of the current folder; navigating into a folder
  replaces the rows and resets paging, and the breadcrumb trail still works.
- A screen is opened while its data is still arriving → a loading state occupies the table area instead
  of an empty-looking screen that suggests no records exist.
- The audit screen's export → exports the same rows the user currently sees filtered, as it does today.
- Printing a screen → the printed output keeps today's behaviour (controls hidden, content readable).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render every migrated record screen through one shared table mechanism,
  not per-screen copies of table markup.
- **FR-002**: Each screen MUST declare its own columns — the heading text, the value shown per record,
  and whether the column is sortable and searchable.
- **FR-003**: Users MUST be able to sort by any column marked sortable, in both directions, with the
  active column and direction visibly indicated.
- **FR-004**: Sorting MUST order Arabic text by Arabic alphabetical expectations, dates chronologically,
  and numbers numerically.
- **FR-005**: Sorting MUST place records with an absent value for the sorted column consistently at one
  end of the order.
- **FR-006**: Users MUST be able to filter records by typing a search term, matched across the columns
  each screen marks searchable.
- **FR-007**: Search MUST ignore differences in letter case and surrounding whitespace.
- **FR-008**: The system MUST page long lists, showing the current page, the total number of matching
  records, and controls to move between pages.
- **FR-009**: Applying or changing a search term MUST return the user to the first page.
- **FR-010**: Sorting, searching and paging MUST compose: applying one MUST NOT discard the others.
- **FR-011**: Each screen MUST be able to offer per-row actions limited to what that screen already
  supports today, and a row MUST NOT offer an action that record cannot accept.
- **FR-012**: The system MUST show a distinct empty state for "this screen has no records" and "no
  records match the current filter".
- **FR-013**: The system MUST show a loading state in place of rows while a screen's records are still
  arriving.
- **FR-014**: The table MUST present right-to-left with Arabic labels throughout, including sort
  indicators, paging controls, search placeholder, and both empty states.
- **FR-015**: On viewports narrower than the collapse threshold, records MUST render as stacked cards
  with labelled fields, and the page MUST NOT scroll horizontally.
- **FR-016**: Sorting, searching, paging and row actions MUST all work in the stacked-card layout.
- **FR-017**: Migrating a screen MUST NOT change which records that screen shows to which role — a
  coordinator MUST continue to see only their own hospital's records.
- **FR-018**: Migrating a screen MUST NOT change any data query, server-side rule, or route behaviour;
  the change is confined to how already-fetched records are presented.
- **FR-019**: Migrating a screen MUST preserve its existing behaviours that are not list rendering —
  detail panels, sub-section switching, breadcrumb navigation, record counts in headings, export
  actions, and print behaviour.
- **FR-020**: A screen with independent sub-sections MUST keep separate sort, search and page state per
  sub-section.
- **FR-021**: On master-detail screens, the selected record MUST remain selected across sorting,
  searching and paging; when a filter excludes it, the detail area MUST say so rather than show stale
  content.
- **FR-022**: Row actions and sorting MUST be reachable by keyboard, and the active sort MUST be
  announced to assistive technology.
- **FR-023**: Every value shown in a row MUST be one the screen already displays today, formatted as it
  is today — migration MUST NOT introduce new derived or computed fields.

### Key Entities

This feature adds no stored data. It introduces two presentation concepts:

- **Column definition**: per screen, a heading, the record value it shows, and its sortable/searchable
  flags.
- **View state**: the current sort column and direction, search term, and page for one table instance —
  held per screen (and per sub-section), not persisted between visits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can locate a specific known record among 500 in under 15 seconds using search or
  sorting, on every migrated screen.
- **SC-002**: 100% of migrated screens render records through the one shared mechanism; zero screens
  retain their own bespoke list markup.
- **SC-003**: At a 400px-wide viewport, no migrated screen scrolls horizontally, and every field visible
  on the wide layout is still readable.
- **SC-004**: Sorting or filtering a 1,000-record list updates the visible rows without a delay the user
  notices.
- **SC-005**: Zero changes to data queries, server-side rules or routes accompany the migration,
  confirmed by review of the change set.
- **SC-006**: For every migrated screen, a hospital coordinator sees exactly the same record set before
  and after migration, and no record from another hospital.
- **SC-007**: Every screen behaviour that is not list rendering — detail panels, sub-sections,
  breadcrumbs, heading counts, exports, printing — still works after migration, verified screen by
  screen.

## Assumptions

- **Client-side operations**: sorting, searching and paging operate on the records the screen already
  loads, because FR-018 forbids query changes. Confirmed by the product owner's decision recorded in
  `Dependencies & Flagged Impacts` item 2; server-side paging is a separate future feature.
- **No delete actions**: the product has no delete capability for any record type today, so "delete" row
  actions are out of scope. Adding one would be new business logic, which this feature excludes.
- **Programme explorer keeps navigating**: the table lists the contents of the current programme or
  folder; breadcrumb navigation and drilling into folders are preserved rather than flattened.
- **Master-detail screens keep their detail panel**: the table replaces the list column only; the SRS
  requires the list + detail pattern, so it stays.
- **Aggregate screens are out of scope**: the dashboard's metric cards and charts, and the hospital
  profile's summary panels, are not record lists. The dashboard's hospital comparison table and the
  profile's embedded record lists are in scope.
- **Audit screen**: already a table; it is migrated for consistency and keeps its export.
- **Columns are configured by developers per screen**, not chosen by end users at runtime; no
  show/hide-column interface is part of this feature.
- **View state is not remembered** between visits to a screen or across sessions.
- **Default page size is 25 records**, with a small set of alternatives offered.
- **Collapse threshold is the project's existing small-screen breakpoint**, so behaviour matches the rest
  of the interface.
- **Row counts** already shown in screen headings continue to be shown, now reflecting the filtered set.

## Dependencies & Flagged Impacts

**1. "Delete" row actions cannot be delivered as specified.** The description asks for view/edit/delete
"as applicable per screen". Applicable is currently *nowhere*: the server layer contains no delete
operation for any entity, and two rules actively forbid deletion — completed visits are immutable, and
the audit log is append-only at the database level. Delete is therefore omitted. If deletion is wanted,
it is a separate feature with its own authorisation, audit and cascade decisions.

**2. Client-side paging does not solve the growth problem that motivates this feature.** The description
gives growth as the reason for paging, but also forbids query changes. Those pull in opposite directions:
paging applied to a fully-loaded list still transfers and holds every record, so a screen with 10,000
visits stays slow and memory-hungry even though it looks paged. Rendering-layer paging is a real
usability win now, and it is all that is possible without touching queries — but it is not the scalability
fix.

**Decision (2026-09-27, product owner)**: client-side paging only for this feature. Server-side paging is
deferred to a separate follow-up feature, keeping this change rendering-layer-only as originally scoped.
Consequence to accept knowingly: screens still load their full scoped record set, so this feature
improves findability, not load time or memory. The growth motivation is only partly addressed until the
follow-up lands.

**3. Screens are not uniform, and three are not flat record lists.** The programme screen is a
hierarchical explorer with breadcrumbs; visits and trainings are master-detail, where the list drives a
detail panel; the hospital profile and dashboard are aggregates. Treating them all as "a list of records"
would change navigation and layout semantics, so per-screen handling is specified above rather than
assumed away.

**4. Two screens already use real tables.** The audit log and the dashboard's hospital comparison already
render `<table>` markup with their own filtering and export. Migration must preserve the audit export's
current filtered-set semantics.

**5. Scope is large and regression-prone.** The nine view files total roughly 5,200 lines, and the
highest risk is not visual: it is accidentally changing which records a role can see while rewriting
list markup. FR-017 and SC-006 exist for that reason, and per-screen verification of role scoping is
required, not optional.

**6. No automated test framework exists.** Per the project constitution, verification is scripted or
manual with recorded evidence. A rendering change of this size across nine screens makes the absence of
a regression suite the main practical risk; introducing one is worth considering as its own feature.

**7. Heading counts and filter interaction.** Several screens display counts in their headings
("{n} منشأة", "{n} زيارة مسجلة"). These currently count the full set; once filtering exists they must
agree with the filtered rows (FR-006, SC-007) or the screen will contradict itself.
