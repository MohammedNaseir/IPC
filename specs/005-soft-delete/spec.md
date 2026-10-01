# Feature Specification: Soft Delete Across All Modules

**Feature Branch**: `005-soft-delete`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Add soft delete across all modules of the IPC Management Portal." Full brainstormed context (scope, restore, permission, cascade, the binding SRS immutability rule, coordinator cascade, and known edge cases) is preserved below and in Assumptions.

## User Scenarios & Testing *(mandatory)*

Today the portal has no delete capability anywhere except a hospital-active toggle (which disables
a coordinator's login, not the hospital's records). Every record type — once created — is
permanent. A wrong entry, a duplicate upload, or a coordinator who leaves cannot be removed; it
just sits in every list, dashboard count and export forever. This feature adds the capability to
remove a record from normal use while keeping it recoverable, across the modules users actually
manage day to day.

### User Story 1 - Undo a mistaken practitioner or equipment entry (Priority: P1)

A hospital coordinator adds a duplicate practitioner, or logs a piece of equipment that turns out
to belong to another hospital. Today there is no way to remove it — it stays in the roster
forever. The coordinator needs to remove it from their own hospital's roster, and a central user
needs the same capability across any hospital, with the record recoverable rather than gone for
good.

**Why this priority**: Practitioners and Equipment are the simplest case — no cascading children,
no special immutability rule — so this delivers the whole mechanism (delete, disappear from every
list, appear in a trash view, restore) in its smallest, lowest-risk form. Every later story reuses
this same mechanism.

**Independent Test**: Can be fully tested by creating a practitioner, deleting it, confirming it
disappears from the roster and any counts, restoring it from the trash view, and confirming it is
back exactly as it was.

**Acceptance Scenarios**:

1. **Given** a hospital coordinator viewing their own hospital's practitioner roster, **When**
   they delete a practitioner record, **Then** it disappears immediately from the roster, from any
   count that included it, and from search — but is not permanently gone.
2. **Given** a central user, **When** they delete a practitioner or equipment record belonging to
   any hospital, **Then** the same removal happens regardless of which hospital owns it.
3. **Given** a coordinator viewing another hospital's roster (which they cannot normally reach),
   **When** they attempt to delete a record there directly, **Then** the action is refused the
   same way any other cross-hospital write is refused today.
4. **Given** a soft-deleted practitioner sitting in the trash view, **When** an authorized central
   user restores it, **Then** it reappears in its hospital's roster with every field unchanged.

---

### User Story 2 - Retire an outdated policy, org document or public file (Priority: P1)

Central staff replace a policy with a new version, or realize a document-center upload was the
wrong file. These records are central-managed reference material; an outdated one needs to stop
appearing in the library without erasing the fact that it once existed.

**Why this priority**: Same mechanism as User Story 1, applied to the central-only reference
library modules, confirming the permission variant (central-only, no hospital scoping) works
identically.

**Independent Test**: Can be fully tested by uploading a policy, org document or document-center
file, deleting it, confirming it disappears from its library screen, restoring it, and confirming
it is back with its original file intact.

**Acceptance Scenarios**:

1. **Given** a central user viewing the policy library, org-document library, or document center,
   **When** they delete an entry, **Then** it disappears from that library and from any
   cluster-wide visibility hospitals had into it.
2. **Given** a hospital coordinator, **When** they attempt to delete a policy, org document, or
   document-center file, **Then** the action is refused — these stay central-only, matching who
   can create and edit them today.
3. **Given** a soft-deleted policy, **When** a central user restores it, **Then** it reappears in
   the library with its file, category and version unchanged.

---

### User Story 3 - Remove a visit or training record, without touching completed history (Priority: P1)

A coordinator records a training or starts a visit, then discovers it was logged against the wrong
hospital or duplicated by mistake, while it is still in progress. They need to remove it. But once
a visit is marked completed, it becomes the hospital's permanent compliance record — the system
already promises, and must keep promising, that nobody can ever delete a completed visit.

**Why this priority**: Visits and Trainings are the modules closest to the product's compliance
purpose, so getting the one hard exception right — a completed visit is untouchable, forever — is
as important as the delete capability itself.

**Independent Test**: Can be fully tested by deleting an in-progress visit or a pending/late
training (confirming it disappears and restores correctly), then confirming a completed visit
offers no delete action at all, from any role, under any path.

**Acceptance Scenarios**:

1. **Given** an in-progress visit or a pending/late training, **When** an authorized user (the
   owning hospital's coordinator, or central) deletes it, **Then** it disappears from the
   hospital's record and from the dashboard the same way any other soft-deleted record does, and
   can be restored later.
2. **Given** a visit whose status is completed, **When** any user — including central — looks for
   a way to delete it, **Then** no such control exists anywhere in the interface.
3. **Given** a completed visit's identifier, **When** any attempt is made to delete it directly
   (not through the missing UI control), **Then** the system refuses the action before making any
   change, the same way it already refuses any other edit to a completed visit.
4. **Given** a training that later becomes late or completed, **When** its status changes,
   **Then** its earlier availability for deletion is unaffected — the immutability rule in this
   feature applies to completed *visits* only, matching the existing SRS rule; it does not extend
   to trainings unless a future spec says so.

---

### User Story 4 - Retire a hospital and everything under it together (Priority: P2)

A hospital closes, merges into another, or was entered in error. Central needs to remove it from
the active cluster — along with its coordinator's login, and every visit, training, practitioner
and equipment record that belongs only to it — in one action, and be able to undo the whole thing
together if it turns out to be a mistake.

**Why this priority**: This is the first cascading case — it depends on User Story 1 and 3's
mechanism already working, and adds the one-action-affects-many behavior that a hospital's whole
footprint requires.

**Independent Test**: Can be fully tested by deleting a hospital that has at least one practitioner,
one piece of equipment, one in-progress visit and one completed visit; confirming the hospital, its
coordinator's login, the practitioner, the equipment and the in-progress visit are all hidden
together while the completed visit stays fully visible and untouched (User Story 3's rule);
restoring the hospital and confirming everything that was cascaded together comes back together.

**Acceptance Scenarios**:

1. **Given** a hospital with practitioners, equipment, and in-progress visits and trainings,
   **When** a central user deletes the hospital, **Then** the hospital and all of those records
   disappear together, and the coordinator's account stops being able to log in.
2. **Given** that same hospital also has a completed visit, **When** it is deleted, **Then** the
   completed visit is left exactly as it was — still visible, still readable, still permanent —
   because nothing in this feature is allowed to delete a completed visit, not even indirectly.
3. **Given** a hospital record and a practitioner that was independently deleted from it days
   earlier, **When** central deletes the hospital itself and then restores it, **Then** the
   independently-deleted practitioner does **not** come back — only the records that were removed
   together with the hospital in that one action are restored together.
4. **Given** a deleted hospital, **When** anyone tries to sign in as its coordinator, **Then**
   sign-in is refused the same way it already is for a hospital whose login is disabled today.

---

### User Story 5 - Retire a program folder and its contents together (Priority: P2)

Central reorganizes the shared programs library and needs to remove an old folder — subfolders,
files and all — as one action, the way removing a folder works in any file system, while being
able to undo it if the whole branch was removed by mistake.

**Why this priority**: The second cascading case, structurally different from a hospital (a
self-nesting folder tree rather than a fixed set of child types), so it earns its own story even
though it reuses the same underlying mechanism.

**Independent Test**: Can be fully tested by deleting a program folder containing a subfolder and
a file, confirming the whole branch disappears from the library, and restoring the top folder
brings the whole branch back intact.

**Acceptance Scenarios**:

1. **Given** a program folder containing subfolders and files, **When** a central user deletes it,
   **Then** the folder and everything nested inside it, at any depth, disappears from the library
   together.
2. **Given** that deleted folder, **When** central restores it, **Then** the folder and its entire
   original contents reappear together, in the same structure.
3. **Given** an entire program (not just one folder within it), **When** central deletes the
   program itself, **Then** the same whole-branch behavior applies to every folder and file it
   contains.

---

### User Story 6 - Retire a training template or a coordinator account (Priority: P2)

Central retires a training template that is no longer offered, or removes a coordinator account —
someone who has left, or an account created in error — while keeping the option to bring either
back. Removing a coordinator must not silently reuse or destroy the login identity in a way that
blocks a future coordinator from using the same email.

**Why this priority**: These are the two remaining central-only modules, each with their own small
twist — a template's history must survive it, and an account has identity constraints (email,
one-per-hospital) that the other modules don't.

**Independent Test**: Can be fully tested by deleting a training template that has trainings
already created from it and confirming those trainings are unaffected; and by deleting a
coordinator account, confirming their login stops working, restoring it, and separately confirming
a new coordinator can be created with the same email once the old account is deleted (without
needing to restore it first).

**Acceptance Scenarios**:

1. **Given** a training template with trainings already scheduled or completed from it, **When**
   central deletes the template, **Then** the template disappears from the list of offered
   templates, but every training already created from it remains exactly as it was — deleting a
   template is not a way to delete the trainings that came from it.
2. **Given** a coordinator account, **When** central deletes it, **Then** that person can no
   longer sign in, and the account disappears from the hospital's account view.
3. **Given** a deleted coordinator account whose hospital still needs one, **When** central creates
   a new coordinator for that hospital using the same email address as the deleted account,
   **Then** the system accepts it — a deleted account does not permanently reserve its email or
   its one-coordinator-per-hospital slot.
4. **Given** a central user, **When** they attempt to delete their own account, or the only
   remaining central account in the system, **Then** the action is refused.

---

### Edge Cases

- What happens when a hospital being deleted has a completed visit among its records? The
  completed visit is excluded from the cascade and remains fully visible and permanent (User
  Story 4, Scenario 2) — the immutability rule always wins over the cascade convenience.
- What happens when someone restores a hospital, but one of its coordinators, practitioners or
  equipment records was deleted independently before the hospital was deleted? Only the records
  that were removed together with the hospital in that specific deletion come back; anything
  deleted separately, before or after, stays deleted (User Story 4, Scenario 3).
- What happens when a hospital coordinator tries to delete a record belonging to a different
  hospital by directly targeting its identifier? Refused the same way any other cross-hospital
  write is refused today (User Story 1, Scenario 3).
- What happens when someone tries to delete a completed visit directly, bypassing the (absent)
  delete button? Refused before any change is made (User Story 3, Scenario 3).
- What happens when the last central account, or a central user's own account, is targeted for
  deletion? Refused (User Story 6, Scenario 4).
- What happens to a program folder's contents when only a file deep inside it — not the folder
  itself — is deleted? Only that one file is removed; the folder and its other contents are
  unaffected (this is not a cascade case, just an ordinary single-record delete).
- What happens to notifications, audit log entries, or attachments belonging to a deleted record?
  Audit log entries are never affected by anything in this feature — they are permanent by
  existing rule. Attachments and similar records that exist only to belong to a parent (a visit's
  attachment, a training's attendance rows) are hidden along with their parent automatically,
  without needing their own independent delete action.

## Requirements *(mandatory)*

### Functional Requirements

**General, applying to every in-scope module (Hospital, Visit, Training, Training Template,
Practitioner, Equipment, Policy, Org Document, Document Center File, Program, Program Folder,
Coordinator/User account) unless a module-specific requirement overrides it:**

- **FR-001**: The system MUST let an authorized user remove a record such that it no longer
  appears in any list, search, dashboard count, or export, without permanently erasing it.
- **FR-002**: Removing a record MUST require one explicit confirmation naming the record, matching
  the confirmation style already used elsewhere in the product.
- **FR-003**: A removed record MUST remain recoverable by an authorized central user, and
  restoring it MUST return every field and relationship to exactly what it was before removal.
- **FR-004**: Who may remove a record MUST match who may already edit that record today: a
  hospital's own coordinator or a central user for Visits, Trainings, Practitioners and Equipment;
  central only for Hospitals, Training Templates, Policies, Org Documents, Document Center Files,
  Programs, Program Folders, and Coordinator accounts.
- **FR-005**: Only central users may view removed records or restore them, across every module.
- **FR-006**: Every removal and every restoration MUST be recorded in the audit trail with the
  acting user and timestamp, with no exceptions.
- **FR-007**: A hospital coordinator MUST NOT be able to remove, restore, or otherwise act on a
  record belonging to a different hospital, under any path, the same way they cannot edit one
  today.

**Module-specific requirements:**

- **FR-008**: A completed visit MUST NOT be removable by any user, through any path, at any time —
  this is an existing, unconditional rule and this feature MUST NOT weaken it. No delete control
  MUST ever be shown for a completed visit.
- **FR-009**: Removing a Hospital MUST also remove its coordinator's account (blocking that
  coordinator's sign-in), and every Visit, Training, Practitioner and Equipment record belonging
  to it, **except** any completed visit, which MUST be left untouched per FR-008.
- **FR-010**: Restoring a Hospital MUST restore exactly the set of records that were removed
  together with it in that action — not records that were independently removed at another time.
- **FR-011**: Removing a Program Folder MUST also remove every subfolder and file nested inside it
  at any depth; removing a Program MUST also remove every folder and file it contains. Restoring
  the top-level removed item MUST restore its entire original contents together.
- **FR-012**: Removing a Training Template MUST NOT affect any Training already created from it —
  those remain fully visible and unaffected, since they are historical records independent of
  whether the template is still offered.
- **FR-013**: Removing a Coordinator/User account MUST free that person's email address and their
  hospital's one-coordinator slot for a new account, without requiring the old account to be
  restored or permanently deleted first.
- **FR-014**: The system MUST refuse to remove a central user's own account, and MUST refuse to
  remove the last remaining central account.
- **FR-015**: Audit log entries themselves MUST NOT be removable, restorable, or otherwise
  affected by this feature — the audit trail's own permanence, already guaranteed today, is
  unchanged.

### Key Entities

- **Deletable record**: any record belonging to one of the eleven in-scope modules. Carries a
  marker of whether, and when, it was removed, and — only when removed as part of a cascade (a
  Hospital's children, a Program Folder's contents) — which specific removal action caused it, so
  that a later restoration of the parent brings back exactly that set and nothing more.
- **Trash view**: a central-only view, per module, listing that module's removed records with who
  removed them and when, and offering restoration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized user can remove any in-scope record in a single confirmed action, and
  it disappears from every list, count and search on the very next screen load.
- **SC-002**: 100% of restored records match their pre-removal state exactly, across every field
  and relationship, verified for at least one record per module.
- **SC-003**: Removing a Hospital or a Program Folder removes 100% of its intended descendants in
  the same action, and restoring it brings back exactly that same set — no more, no fewer.
- **SC-004**: A completed visit shows no removal control anywhere in the interface, for any role,
  100% of the time — verified as both the absence of the control and the refusal of a direct
  attempt.
- **SC-005**: Every removal and restoration produces exactly one corresponding audit trail entry,
  100% of the time, with no missed or duplicated entries.
- **SC-006**: A new coordinator account can be created with a previously-removed coordinator's
  email and hospital assignment immediately, with no manual intervention.
- **SC-007**: Zero removed records appear anywhere a user can see data — lists, dashboards,
  counts, search, exports — verified across every existing screen in the product, not just the
  modules this feature directly changes.
- **SC-008**: A hospital coordinator's attempt to remove, view, or restore a record outside their
  own hospital is refused every time, verified with both a refused attempt and an equivalent
  allowed one.

## Assumptions

- **Deletion is a brand-new capability, not a conversion of existing hard deletes.** The product
  today has none, anywhere, except the hospital login-disable toggle (which this feature leaves
  in place, unchanged, as a separate mechanism from removing a hospital entirely).
- **A hospital's cascade skips, rather than blocks on, a completed visit.** Blocking the whole
  hospital removal because one visit is permanently protected would make the cascade nearly
  useless for any real hospital with history. The completed visit simply stays behind, fully
  intact, under a hospital that is otherwise removed.
- **A Training Template's removal never cascades to its Trainings.** A template describes a
  training offering; the trainings already conducted under it are independent historical
  compliance records regardless of whether the template continues to be offered.
- **The "immutability" rule this feature must preserve is scoped to completed Visits only**,
  matching the one explicit rule in the existing specification
  (`docs/SRS_IPC_Management_Portal_Neon.md`, reliability requirements). No equivalent rule is
  assumed for any other module or status unless stated by the owner.
- **This is new scope relative to the functional requirements enumerated in the SRS** (FR-1…FR-43
  do not define a delete/remove capability per module), though the SRS's own architecture
  description anticipates "create/edit/delete" as the standard operation set, and nothing in the
  SRS's explicitly excluded scope (§6) forbids it. Per the project's constitution (Principle IV),
  this addition — and the fact that it is not itself an SRS-mandated requirement — will be
  recorded as a deviation/addition in `docs/CLAUDE_REFERENCE.md` §9, the same way this project has
  recorded other owner-directed additions beyond the SRS.
- **Notifications are out of scope.** They are already ephemeral (read/unread, not edited or
  referenced elsewhere) and are not one of the modules requested.
- **The scope boundary from this project's constitution (server-only data access, layered
  authorization, no fabricated data, evidence before done) applies to this feature exactly as it
  does to every other change in this codebase**, including that authorization and scoping changes
  require both a refused (negative) and an allowed (positive) test against a running build before
  being called done.
