# Feature Specification: Training Attendance Without Practitioner Linkage

**Feature Branch**: `main` (no dedicated feature branch created; spec directory: `specs/001-training-attendance-names`)

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "Redesign training attendance to remove any link to the Practitioner table. Practitioner records represent the hospital's IPC committee members only — a narrow, specific group — and are unrelated to who actually attends a training session. Attendance must never reference Practitioner going forward, even if an attendee happens to also be a registered practitioner; treat that as coincidence, not a link. Attendance for a training must be exactly one of: (1) a bare headcount number (no names at all), or (2) a list of named attendees, entered by either manual entry (one attendee row at a time by typing a name) or bulk import (an 'Import from Excel' action with a downloadable template — single column 'الاسم', header row included; on upload, create one attendance row per non-empty name, skip blank rows, and show an import summary (rows imported / skipped) with clear errors for invalid files). Remove the existing practitioner-linked attendance mode and its schema field entirely (write the migration). If any other part of the system still depends on attendance-to-practitioner linkage, flag it instead of silently breaking it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record named attendees by typing them (Priority: P1)

A hospital coordinator documents a completed training session. Instead of picking from the
hospital's IPC committee list, they type each attendee's name, one row at a time, and save. The
saved attendance shows exactly the names they typed, with a count derived from those names. No
part of the record ties an attendee to a committee member, even when the typed name matches one.

**Why this priority**: This is the core correction. Today the only way to record names is to
select committee members, which misrepresents who attended — nurses, cleaners, and visiting
staff attend sessions and are not committee members. Manual entry alone makes the attendance
record truthful and is a complete, shippable slice.

**Independent Test**: Open a training, add three typed names, save, reopen the training, and
confirm the three names and a count of 3 appear, with no committee-member selection control
anywhere on the screen.

**Acceptance Scenarios**:

1. **Given** a training with no attendance recorded, **When** the coordinator adds the names
   "سارة العتيبي", "محمد الزهراني", "نورة القحطاني" and saves, **Then** the training shows those
   three names and an attendee count of 3.
2. **Given** a saved attendance list of 3 names, **When** the coordinator removes one row and
   saves, **Then** the training shows the remaining 2 names and a count of 2.
3. **Given** a typed attendee name identical to a registered practitioner's name, **When** the
   attendance is saved, **Then** the record stores only the text of the name and no reference to
   that practitioner, and deleting or renaming that practitioner later leaves the attendance
   unchanged.
4. **Given** the coordinator is adding attendance, **When** they inspect the screen, **Then** no
   control exists for selecting practitioners or committee members as attendees.

---

### User Story 2 - Bulk import attendees from an Excel file (Priority: P2)

For a session with dozens of attendees, the coordinator downloads the provided template, fills
one name per row under the single "الاسم" column, uploads the file, and sees a summary stating
how many rows were imported and how many were skipped. Each imported name becomes one attendee
row on that training.

**Why this priority**: Manual entry (P1) already delivers correct records; import removes the
bottleneck for large sessions. It depends on the named-attendee model existing, so it follows P1.

**Independent Test**: Download the template, enter 10 names with 2 blank rows interspersed,
upload it, and confirm the summary reports 10 imported and 2 skipped and that 10 names appear on
the training.

**Acceptance Scenarios**:

1. **Given** the coordinator is recording attendance, **When** they choose the import action,
   **Then** they can download a template containing a header row with a single column titled
   "الاسم".
2. **Given** a filled template with 10 non-empty names and 2 blank rows, **When** it is uploaded,
   **Then** 10 attendee rows are created, the 2 blank rows are skipped, and the summary reports
   "10 imported / 2 skipped".
3. **Given** a file that is not a recognised spreadsheet, **When** it is uploaded, **Then** no
   attendance changes are saved and a message states that the file type is not supported and
   which types are accepted.
4. **Given** a spreadsheet whose first column header is not "الاسم", **When** it is uploaded,
   **Then** no attendance changes are saved and a message states the expected column and offers
   the template.
5. **Given** a spreadsheet with a header row but no non-empty names, **When** it is uploaded,
   **Then** no attendance changes are saved and a message states that no names were found.
6. **Given** an import that succeeds, **When** the coordinator reviews the list, **Then** every
   imported name is individually visible and removable like a manually added one.

---

### User Story 3 - Keep headcount-only attendance, and keep the two modes exclusive (Priority: P3)

For a session where names were not collected, the coordinator records only a total number of
attendees. A training's attendance is either a headcount or a list of names — never both. When
the coordinator switches modes, the system states plainly that the other mode's data will be
replaced before it happens.

**Why this priority**: Headcount recording already exists and must survive the change; the new
work is enforcing exclusivity and making the switch non-surprising. Lowest risk of the three, but
required for the record to stay unambiguous.

**Independent Test**: Record a headcount of 50 on a training, confirm no name rows exist, then
switch to named mode, confirm the warning appears and the headcount is cleared once names are
saved.

**Acceptance Scenarios**:

1. **Given** a training with no attendance, **When** the coordinator enters a headcount of 50 and
   saves, **Then** the training reports 50 attendees and holds no attendee names.
2. **Given** a training recorded as a headcount of 50, **When** the coordinator switches to named
   entry and saves 4 names, **Then** the training reports 4 attendees, holds those 4 names, and no
   longer holds the headcount.
3. **Given** a training recorded with 4 names, **When** the coordinator switches to headcount and
   saves 40, **Then** the training reports 40 attendees and holds no names, after a confirmation
   that the 4 names will be discarded.
4. **Given** the coordinator saves attendance, **When** neither a headcount nor at least one name
   is provided, **Then** the save is refused with a message asking for one of the two.

---

### Edge Cases

- A name cell contains only spaces → treated as blank, skipped, and counted as skipped.
- Leading and trailing spaces around a name → trimmed before saving.
- The same name appears twice (typed or imported) → both rows are kept, because two attendees can
  genuinely share a name; the count reflects both.
- An import exceeds the per-training attendee limit → nothing is saved and the message states the
  limit and how many rows the file held.
- A spreadsheet with extra columns beyond the first → the extra columns are ignored, provided the
  first column header is "الاسم".
- A spreadsheet with multiple sheets → only the first sheet is read, and the summary says so.
- An empty file, or a file that cannot be opened → no changes saved, message names the problem.
- A very long name (beyond the allowed length) → that row is rejected and reported as skipped with
  the row number, and the rest still import.
- An import is uploaded while a headcount is already recorded → the mode switch rule of User
  Story 3 applies; the coordinator is warned that the headcount will be replaced.
- Two coordinators save attendance for the same training at nearly the same time → the later save
  wins and replaces the attendance set; no duplicate merge is attempted.
- A training already documented with practitioner-linked attendance in a non-production
  environment → the migration converts those rows to plain names (see FR-016).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST record a training's attendance as exactly one of: a single total
  headcount, or a list of named attendees. Both at once MUST be impossible.
> FR-002 to FR-005 state the same rule at four different layers — storage, product surface, schema,
> and rejected input. The repetition is intentional: each layer is separately testable, and the
> feature is only safe when all four hold.

- **FR-002**: The system MUST store an attendee name as free text only, with no reference of any
  kind to a practitioner or committee-member record.
- **FR-003**: The system MUST remove the practitioner-linked attendance mode from the product: no
  screen may offer selecting practitioners as attendees, and no stored attendance may carry a
  practitioner reference.
- **FR-004**: The system MUST remove the attendance-to-practitioner field and relationship from
  the data model, accompanied by a schema migration.
- **FR-005**: The system MUST reject any attendance submission that attempts to supply a
  practitioner reference, rather than ignoring it silently.
- **FR-006**: Users MUST be able to add attendee names one at a time by typing a name, and remove
  any individual name before saving.
- **FR-007**: The system MUST trim surrounding whitespace from every attendee name and MUST reject
  a name that is empty after trimming.
- **FR-008**: The system MUST limit an attendee name to 200 characters and report any longer name
  as a skipped row identifying its position.
- **FR-009**: The system MUST preserve duplicate attendee names within a training rather than
  merging them.
- **FR-010**: Users MUST be able to download an attendance import template containing a header row
  with one column titled "الاسم".
- **FR-011**: Users MUST be able to upload a filled template, and the system MUST create one
  attendee row per non-empty name in the first column.
- **FR-012**: The system MUST skip blank and whitespace-only rows during import without failing the
  import.
- **FR-013**: The system MUST present an import summary stating how many rows were imported and how
  many were skipped, and MUST list the reason for each category of skipped row.
- **FR-014**: The system MUST reject an invalid import — unsupported file type, unopenable file,
  missing or mismatched "الاسم" header, or no non-empty names — with a message naming the specific
  problem, and MUST leave existing attendance unchanged when it does.
- **FR-015**: The system MUST replace, not merge, a training's previous attendance when attendance
  is saved, and MUST warn before discarding data from the other mode.
- **FR-016**: The migration MUST convert any existing practitioner-linked attendance row into a
  named attendee row carrying that practitioner's name at the time of migration, so documented
  attendance history is not lost. Rows that carry a headcount MUST be left untouched.
- **FR-017**: The system MUST derive a training's reported attendee count from the recorded
  attendance — the number of names, or the headcount — with no separate manually entered total.
- **FR-018**: Attendance changes MUST remain restricted to the hospital that owns the training and
  to central administration, and MUST be written to the audit trail like any other change.
- **FR-019**: Practitioner records MUST remain fully functional for their own purpose (recording
  the hospital's IPC committee members) and MUST NOT be created, modified, or deleted as a
  side-effect of recording attendance.
- **FR-020**: All new labels, template headers, messages, and summaries MUST be Arabic with correct
  right-to-left presentation.

### Key Entities *(include if feature involves data)*

- **Training Attendance**: The attendance record belonging to one training. Holds either a total
  headcount or a set of attendee names. Carries no link to any person record.
- **Attendee Name**: A single attendee on a training, represented only by trimmed free text. Has
  no identity beyond that text and no relationship to practitioners, users, or hospitals.
- **Attendance Import Template**: The downloadable spreadsheet shape — one column, header "الاسم",
  one name per row.
- **Import Summary**: The result of one upload: count imported, count skipped, and the reason per
  skipped category.
- **Practitioner** *(unchanged, now unrelated)*: A member of the hospital's IPC committee. Retains
  its own screens and fields; no longer participates in attendance in any way.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero stored attendance records reference a practitioner after the change, verified
  by inspecting the attendance data for any such reference.
- **SC-002**: A coordinator can record 50 named attendees for one training in under 2 minutes
  using the import path, and under 30 seconds for 5 names using manual entry.
- **SC-003**: 100% of blank and whitespace-only rows in an uploaded file are skipped, and the
  summary count of imported plus skipped rows equals the number of data rows in the file.
- **SC-004**: Every rejected upload states which of the four file-level rejection reasons applies
  (unsupported type, unopenable file, wrong or missing header, no names found), and leaves the
  previously recorded attendance intact in 100% of cases. Per-row skips are reported separately and
  are not rejections.
- **SC-005**: Attendee counts shown on training screens and dashboards match the recorded
  attendance for every training, both headcount and named, with no discrepancy.
- **SC-006**: No training can be saved holding both a headcount and names, verified by attempting
  the combination through every entry path.
- **SC-007**: Existing headcount-only attendance records survive the change unaltered, confirmed by
  comparing counts before and after migration.

## Assumptions

- Accepted upload formats are `.xlsx` and `.csv`, since the template is a single text column and
  the product already exchanges Excel-compatible CSV elsewhere. Older `.xls` is out of scope.
- First worksheet only; other worksheets are ignored. Likewise the first column only; other columns
  are ignored rather than rejected.
- The template is delivered as UTF-8 CSV, which Excel opens directly and which the import also
  accepts. The action is still labelled as an Excel import because that is what coordinators call
  it, but the download itself names the format so the two do not appear to disagree.
- A per-training limit of 1,000 attendee names is applied, matching the existing ceiling on
  attendance input; larger sessions are recorded as a headcount.
- Duplicate names are kept deliberately (FR-009); no de-duplication or fuzzy matching is performed.
- Saving attendance replaces the prior attendance set for that training; there is no per-row
  incremental sync and no merge of concurrent edits.
- Both central administration and the owning hospital's coordinator may record attendance, matching
  today's permissions; no new roles are introduced.
- Attendee names are never validated against any registry of people — by design, per the feature's
  premise.
- In the production database today there are **no** practitioner-linked attendance rows (1
  attendance row exists, a headcount of 50), so FR-016's conversion is a safeguard for other
  environments rather than a production data change.
- Reporting on *which named individuals* attended across trainings (per-person training histories)
  is out of scope; attendance remains a per-training record.

## Dependencies & Flagged Impacts

The feature description asked for anything still depending on attendance-to-practitioner linkage to
be flagged rather than silently broken. These are the dependencies found:

**1. The governing spec contradicts this feature — requires an amendment decision.**

- `docs/SRS_IPC_Management_Portal_Neon.md` **FR-21** requires attendance to support "names linked
  to the practitioner database, or a total headcount".
- The same document's **FR-26** requires the practitioner database to be used as the reference for
  linking attendance names in the training module.

This feature removes exactly that linkage, so FR-21 must be reworded and FR-26 becomes obsolete.
The project constitution (Principle IV, Spec-Anchored Scope) names that SRS as the functional
source of truth and requires deliberate deviations to be recorded in `docs/CLAUDE_REFERENCE.md`.
**Decision needed from the product owner**: amend FR-21/FR-26 in the SRS, or record this as a
documented deviation. Implementation should not proceed as if the SRS already agrees.

**2. Data model** — `prisma/schema.prisma`: `TrainingAttendance.practitionerId` and its
`practitioner` relation (lines ~188, ~192), plus the `attendances` back-relation on `Practitioner`.
A replacement field for the attendee's name is required, and the migration must drop the old
column and relation.

**3. Read path** — `src/server/queries/trainings.ts` selects `practitionerId` per attendance row
and derives both `attendeePractitionerIds` and `attendeeCount` from it (lines ~21, ~28-31, ~46-47).
The derived count must be re-expressed in terms of names.

**4. Data contract** — `src/lib/types.ts` exposes `attendeePractitionerIds: string[]` on the
training shape (line ~100); it is consumed by the training screen and must be replaced by the
attendee-name list.

**5. Write path** — `src/server/actions/trainings.ts` parses `practitionerIds`, validates that
each belongs to the training's hospital, and creates one attendance row per id (lines ~95-142).
That cross-hospital validation disappears with the linkage; attendance stays scoped because it
hangs off the training's hospital, so no tenancy gap is introduced — but the validation code must
not simply be deleted without the name-based path replacing it.

**6. Training screen** — `src/components/views/TrainingsView.tsx` holds the practitioner picker
and its selection state (lines ~28-51 and ~91-123). The trainings page currently loads the
hospital's practitioners solely to feed that picker; if nothing else on the screen needs them,
that data load and prop should be dropped rather than left dangling.

**7. Misleading copy elsewhere** — `src/components/views/AssetsView.tsx` labels each practitioner
"متاح للربط بالتدريبات المعتمدة" ("available for linking to approved trainings"). That statement
becomes false and must be reworded.

**8. New capability with no current tooling** — the product has no spreadsheet reading or writing
capability today (the only existing export is hand-built CSV). Reading `.xlsx` requires a
capability that does not yet exist in the project, which the planning phase must account for.
