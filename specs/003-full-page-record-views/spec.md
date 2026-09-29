# Feature Specification: Full-Page Record Views for Visits and Trainings

**Feature Branch**: `003-full-page-record-views`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Replace the master-detail split-view layout for Visits and Trainings with a dedicated full-page view per record, matching the existing Hospital Profile pattern already used elsewhere in the app. Currently, clicking a row in the Visits list or Trainings list opens the record's details in a side panel next to the list (split view). This cramps the detail content (visit report, photos, hospital response, audit log trail for Visits; execution details and attendance for Trainings) into roughly half the screen, and collapses awkwardly on narrow/mobile viewports where most hospital coordinators will actually use the app. New behavior: clicking a row navigates to a dedicated full-page view for that record (e.g. /visits/[id], /trainings/[id]), not a side panel; the full-page view has a clear back/breadcrumb path to return to the list, and the list preserves its current search/sort/filter/page state when the user navigates back; all existing detail content and actions move into the new full-page view unchanged in function — this is a layout change, not a functional one; the list screens keep using the shared table from the previous feature, only the row-click destination changes; the print/PDF action for a Visit should work at least as well on a full page as it did in the split panel. This does not apply to any other screen currently using the shared table in list form (Hospitals, Practitioners, Equipment, etc.) — those stay as they are."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read and act on a visit record in full (Priority: P1)

A hospital coordinator receives notice of a supervisory visit. They open the visits list, find the
visit, and open it. The visit's record fills the screen: the official report, the field photographs, the
response thread, and the audit trail are all readable at their natural size, and the coordinator can
attach evidence and write a response without fighting a half-width column. A clear path returns them to
the list.

**Why this priority**: This is the pain the feature exists to remove, and visits carry the densest
content in the product — report, attachments, responses, and audit trail in one record. The visits
screen is also the highest-volume screen. Delivered alone, this story is already a complete improvement:
trainings can keep its current layout until the next slice lands.

**Independent Test**: Open a visit from the list on a desktop and on a 400px-wide viewport. Confirm every
piece of content that the side panel used to show is present, readable, and actionable, and that the
record's own address can be opened directly.

**Acceptance Scenarios**:

1. **Given** a coordinator on the visits list, **When** they activate a visit row, **Then** the
   application navigates to that visit's own page and the list is no longer occupying half the screen.
2. **Given** a visit with a report, three attachments, two responses and audit entries, **When** it is
   opened on its own page, **Then** all four are present and no content is truncated that was visible
   before.
3. **Given** a visit open on its own page, **When** the coordinator adds a response with an attachment,
   **Then** the response is recorded exactly as it was from the side panel and appears in the thread.
4. **Given** an archived (completed) visit, **When** it is opened on its own page, **Then** the record is
   read-only: the archived notice is shown and no edit, upload, attach, respond or approve affordance is
   present.
5. **Given** a visit open on its own page, **When** the coordinator prints it, **Then** the printed output
   contains the visit record without list chrome, navigation or table controls.
6. **Given** a 400px-wide viewport, **When** a visit record is open, **Then** the page reads top to bottom
   with no horizontal page scrolling.
7. **Given** a coordinator on their hospital profile screen, **When** they activate a row in its embedded
   visits list, **Then** the same visit record page opens as from the visits list.

---

### User Story 2 - Record a training's execution on its own page (Priority: P2)

A coordinator opens the trainings list, finds a required training, and opens it. The training's full
record fills the screen: its description, template status and due date, the execution details, the
attendance entry (names or headcount, including the spreadsheet import), and any attached evidence. They
record execution and attendance without the cramped column, then return to the list.

**Why this priority**: Trainings carry the second-densest record and the most involved data entry in the
product — the attendance name list and its import. The same cramping applies, but visits is the more
frequent and more content-heavy screen, so this follows it.

**Independent Test**: Open a training from the list, record an execution with a name list and with a
headcount, import an attendance sheet, and confirm each behaves exactly as it did in the side panel.

**Acceptance Scenarios**:

1. **Given** a coordinator on the trainings list, **When** they activate a training row, **Then** the
   application navigates to that training's own page.
2. **Given** a training open on its own page, **When** the coordinator records execution with a list of
   attendee names, **Then** the attendance is saved exactly as before and the training's status becomes
   completed.
3. **Given** a training open on its own page, **When** the coordinator imports an attendance sheet,
   **Then** the import summary (imported, skipped, reasons) is shown as it was in the side panel.
4. **Given** a central-issued training, **When** it is opened, **Then** its template origin, due date and
   status are shown as they were before.
5. **Given** central administration viewing a hospital's comprehensive profile, **When** they activate a
   row in its embedded trainings list, **Then** the same training record page opens.

---

### User Story 3 - Return to the list without losing your place (Priority: P3)

A coordinator searches the visits list, sorts it, moves to page three, and opens a record. When they
return to the list, their search term, sort column and direction, any filter selections, and their page
are all still applied. They can open the next record and come back again without re-establishing their
position each time.

**Why this priority**: Without it, the navigation change trades one frustration for another: reviewing
five records from page three of a filtered list would mean rebuilding the filter five times. It is
ranked third only because the two record pages must exist before there is anything to return from.

**Independent Test**: Apply a search term, a sort, a filter and a page change on the visits list; open a
record; return; confirm all four are still in effect and the same rows are shown.

**Acceptance Scenarios**:

1. **Given** a filtered, sorted list on page three, **When** the user opens a record and returns via the
   page's own back affordance, **Then** the search term, sort, filters and page are unchanged.
2. **Given** the same state, **When** the user returns using the browser's back control, **Then** the
   list is restored identically.
3. **Given** a restored list, **When** the user opens a second record and returns again, **Then** the
   state is still intact.

---

### Edge Cases

- **A record address that is not the caller's to see**: a coordinator opens the address of a visit or
  training belonging to another hospital. The response must be identical to the response for an address
  that does not exist, so that guessing addresses cannot reveal whether a record exists.
- **A record that does not exist**, or one whose address is malformed: the user reaches a clear "not
  found" outcome, not an error page or a blank record.
- **A signed-out user opens a record address directly**: they are sent to sign in, as with any other
  screen.
- **A visit is archived by central administration while a coordinator has it open**: the next action the
  coordinator attempts is refused with the archived message rather than silently succeeding.
- **The user returns to a list whose restored filter no longer matches the record they just visited**:
  the list is shown as its filter dictates; nothing is highlighted that the filter excludes.
- **A record is opened directly from a bookmark or a pasted address** with no list state to restore: the
  page opens normally and its back affordance leads to the unfiltered list.
- **A record is opened from an embedded list** on the hospital profile or the comprehensive profile: the
  page's own back affordance leads to the record's list, while the browser's back control returns to the
  screen the user actually came from. The two paths differ by design and both must work.
- **Printing a training record**: printing is not a named requirement for trainings today, and the page
  must not produce broken output if a user prints anyway.
- **Very long content**: a 150-character training title, a 10,000-character visit detail, or an
  attendance list of 1,000 names must render on the page without breaking its layout.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation and addressing**

- **FR-001**: Activating a row in the visits list MUST navigate to a page dedicated to that visit; it MUST
  NOT open a side panel beside the list.
- **FR-002**: Activating a row in the trainings list MUST navigate to a page dedicated to that training.
- **FR-003**: Each visit and each training MUST have its own stable address that can be opened directly,
  bookmarked and shared with someone who is permitted to see that record.
- **FR-004**: Each record page MUST offer a clear, visible path back to its list, in addition to the
  browser's own back control.
- **FR-005**: The row activation MUST be reachable and operable from the keyboard, and the destination
  MUST be announced to assistive technology as a navigation, not as an in-place change.

**Authorization and record resolution**

- **FR-006**: A record page MUST show a record only to a user whose existing permissions already allow it:
  central administration for any record, a hospital coordinator only for their own hospital's records.
- **FR-007**: A request for a record that does not exist and a request for a record the caller may not see
  MUST produce the same outcome, revealing nothing about whether the record exists.
- **FR-008**: The permission decision MUST be made where the record is fetched, not by hiding content
  after it has been sent to the browser.

**Content and behaviour preservation**

- **FR-009**: The visit record page MUST present everything the side panel presented: status, hospital,
  visit date, visiting team, compliance score, the visit details text, the official report with its
  download, the attachments gallery, the hospital response thread, and the visit's audit trail.
- **FR-010**: The training record page MUST present everything the side panel presented: status, hospital,
  title, description, template origin and due date, execution date and trainer, attendee count and names
  or headcount, and attached evidence.
- **FR-011**: Every action available from the side panel MUST remain available on the record page and MUST
  behave identically: uploading the official report, attaching files, submitting a response, approving and
  archiving a visit, recording training execution, entering or importing attendance, and downloading the
  attendance template.
- **FR-012**: No action MUST be added, removed, or given a new approval, confirmation or permission step.
  This is a layout change only.
- **FR-013**: An archived visit MUST remain read-only on its record page, showing the archived notice and
  offering no edit affordance of any kind.
- **FR-014**: The record pages MUST be fully Arabic and right-to-left, in the same formal register as the
  rest of the product.

**Lists**

- **FR-015**: The visits and trainings lists MUST continue to render through the shared records table
  introduced in the previous feature, with its search, sorting, paging and empty states unchanged.
- **FR-016**: Returning from a record page to its list MUST restore the search term, sort column and
  direction, any filter selections, and the page position that were in effect when the user left.
- **FR-016a**: List state MUST NOT be carried in the list's address. A list's address stays constant as
  the user searches, sorts, filters and pages, and a shared or bookmarked list address opens the
  unfiltered list. Making filtered lists shareable is a separate decision, deliberately not taken here.
- **FR-017**: With the detail panel gone, the lists MUST use the full page width, and the columns each
  list shows MUST remain the columns it shows today.
- **FR-017a**: The embedded visit and training lists on the hospital profile screen and in the hospitals
  comprehensive profile MUST also navigate to the new record pages when a row is activated, so that a
  visit row opens a visit wherever a visit row appears.
- **FR-017b**: Those embedded lists MUST keep everything else about them unchanged: their narrower column
  sets, their page size, their own search and sort state, and the summary panels around them. Their
  embedded practitioner and equipment lists MUST NOT become navigable.
- **FR-018**: The lists MUST no longer carry a selected-row highlight or a "the selected record is outside
  the current filter" notice, both of which existed only to serve the side panel.

**Printing**

- **FR-019**: Printing a visit record page MUST produce output that contains the visit record and excludes
  navigation, the sidebar, the header, the footer and any list or table controls.
- **FR-020**: Printed output MUST be at least as complete as what the side panel produced — no section
  that previously printed may be lost.

**Scope boundaries**

- **FR-021**: Exactly six surfaces may change: the visits list, the trainings list, the two new record
  pages, and the embedded visit and training lists on the hospital profile screen and in the hospitals
  comprehensive profile. The hospitals list, the coordinator directory, practitioners, equipment, the
  three document libraries, programmes, the audit log, the dashboard comparison table, and every summary
  panel and metric tile on the hospital profile MUST be left exactly as they are.
- **FR-022**: No change may be made to how records are stored, what they contain, who may see them, or
  what any existing action does.

### Key Entities

This feature stores nothing new. The entities below are views over records that already exist.

- **Visit record page**: one supervisory visit presented in full — its own identity and status, the
  report, attachments, response thread and audit trail — addressed individually.
- **Training record page**: one training presented in full — its own identity and status, template
  origin, execution details, attendance and evidence — addressed individually.
- **List view state**: the search term, sort column and direction, filter selections and page position a
  user has established on a list, which must survive a trip to a record and back.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 400px-wide viewport, a coordinator can read a visit's report, photographs, response
  thread and audit trail, and submit a response, without any horizontal page scrolling.
- **SC-002**: Every piece of content and every action available in the old side panel is present on the
  corresponding record page — verified item by item against a list captured before the change, with zero
  omissions.
- **SC-003**: A coordinator reviewing five records from a filtered, sorted list re-establishes their
  filter zero times.
- **SC-004**: Opening a record from the list renders the record page within 1 second on the seeded set
  against a **warm database**, and any navigation slower than that shows the loading skeleton rather than
  a blank screen. "Warm" is stated deliberately: a serverless database cold start can take several
  seconds and is not what this criterion measures.
- **SC-005**: A coordinator who opens the address of another hospital's record learns nothing about
  whether it exists; the outcome is identical to opening an address that never existed. Verified for both
  record types and for both a real foreign record and a fabricated address.
- **SC-006**: The records each role can see on the visits and trainings screens are identical to what that
  role could see before the change — verified per role against a baseline captured beforehand.
- **SC-007**: A printed visit record contains every section the side panel printed and no navigation,
  sidebar, header, footer or table controls.
- **SC-008**: No screen outside the six in scope differs from its pre-change behaviour, and within the
  two profile screens nothing changes except that visit and training rows now navigate.
- **SC-009**: A list's address is the same string before and after a user searches, sorts, filters and
  pages it, and opening that address in a fresh session shows the unfiltered list.

## Assumptions

- **The Hospital Profile pattern is a visual reference, not an existing address scheme.** The current
  hospital profile is a single page for the signed-in coordinator's own hospital, and the "comprehensive
  profile" on the hospitals screen is an in-page view rather than an addressable page. This feature
  introduces the product's first per-record addresses; it borrows the full-width page composition, header
  bar and back affordance from that pattern rather than an existing addressing convention.
- **Whole-row activation is retained.** Rows open on click and on keyboard activation, as they do today,
  rather than requiring a separate "open" action in an actions column. Visits and trainings rows carry no
  other row action, so there is no ambiguity about what activating a row does.
- **Notifications continue to link to the list**, not to the individual record. Deep-linking notifications
  to specific records is a plausible follow-up but is not part of this layout change.
- **List state is restored, not shared** (owner decision, 2026-09-28). Restoration on return is the
  requirement; filtered lists are not made addressable, bookmarkable or shareable. Revisiting that is a
  separate feature.
- **Embedded visit and training lists navigate too** (owner decision, 2026-09-28). The hospital profile
  screen and the hospitals comprehensive profile open the same record pages from their embedded visit and
  training rows. Their practitioner and equipment lists, and the dashboard's comparison table, do not
  change.
- **A record page's back affordance returns to the record's own list**, regardless of which screen the
  user arrived from. The browser's back control is what returns them to where they came from.
- **Print remains the browser's own print-to-PDF**, as it is today. No server-generated document is
  introduced.
- **Row density and column sets stay as the previous feature established them.** Widening the lists to
  full width does not license new columns.

## Resolved Decisions

- **Q1 — Should a filtered list be addressable?** Resolved 2026-09-28: **no**. List state is restored on
  return and is not carried in the address. Recorded as FR-016 and FR-016a.
- **Q2 — Do the embedded visit and training lists elsewhere also navigate?** Resolved 2026-09-28:
  **yes**. The hospital profile screen and the hospitals comprehensive profile navigate from their visit
  and training rows to the same record pages. Recorded as FR-017a, FR-017b and FR-021.
