# Phase 1 Data Model: Full-Page Record Views

This feature stores nothing new. There is no Prisma change and no migration. What follows are the read
shapes it adds, the view-state record it keeps in the browser, and the inventory of what moves where.

## Read shapes (`src/server/queries/`)

All three are scoped at the fetch site. `hospitalScope(user)` is `{}` for a central user and
`{ hospitalId }` for a coordinator, so the scope is part of the `where` clause rather than a check that
runs after the row is in hand.

### `findVisitForUser(user, visitId): Promise<VisitDTO | null>`

| Aspect | Value |
|---|---|
| Resolves | `visit.findFirst({ where: { id: visitId, ...hospitalScope(user) } })` with the same includes the list query uses — hospital name, report file, attachments with files, responses with attachments |
| Returns | The existing `VisitDTO`, unchanged in shape, or `null` |
| `null` means | The visit does not exist **or** it is outside the caller's scope. The caller cannot tell which, and must not try |
| Ordering | Attachments by `uploadedAt` ascending, responses by `respondedAt` ascending — identical to the list query |

### `listAuditLogsForVisit(user, visitId): Promise<AuditLogDTO[]>`

| Aspect | Value |
|---|---|
| Resolves | Audit entries for `entityType: 'Visit'` and that one `entityId`, **after** confirming the visit itself is in scope |
| Returns | `AuditLogDTO[]`, newest first, matching today's ordering |
| Empty result | A visit with no audit entries and a visit the caller may not see are both an empty list; the page has already 404ed in the second case |

### `findTrainingForUser(user, trainingId): Promise<TrainingDTO | null>`

| Aspect | Value |
|---|---|
| Resolves | `training.findFirst({ where: { id: trainingId, ...hospitalScope(user) } })` with hospital name, template due date, attendances ordered by id, attachments ordered by `uploadedAt` |
| Returns | The existing `TrainingDTO`, with `status` passed through `deriveTrainingStatus` exactly as the list does, or `null` |
| Derived fields | `attendeeCount`, `attendeeNames` and `isInternal` are computed by the same shared mapper as the list, not recomputed here |

**Invariant**: the row→DTO mapping is extracted and shared between the list query and the single-record
query. Two copies of that mapping would drift, and a record that reads differently on its own page than
in the list is exactly the class of bug this feature must not introduce (FR-009, FR-010).

## View state (`src/components/table/listStateStore.ts`)

Not persisted, not sent anywhere, and never read on the server.

| Field | Type | Meaning |
|---|---|---|
| `query` | string | The search term in effect |
| `sort` | `{ key, direction } \| null` | The active sort column and direction |
| `page` | number | 1-based page position |
| `pageSize` | number | Rows per page |
| `filters` | `Record<string, string>` | The screen-level filter selections, under the same key |

| Rule | Behaviour |
|---|---|
| Keyed by | A caller-supplied `stateKey` string, unique per table instance (`visits`, `trainings`, `hospital-profile-visits`, `hospital-profile-trainings`, `hospital-comprehensive-visits`, `hospital-comprehensive-trainings`) |
| Written | Only from client event handlers, never during a render, and never on the server |
| Read | On mount, in the state initialiser, guarded by a client check |
| Lifetime | The browser tab's current page session. A hard reload or a new tab starts empty |
| When `stateKey` is unset | The table behaves exactly as it does today: no read, no write, no store entry |

**Decision (2026-09-28)**: the screen-level filter selects — visit status and hospital on the visits
screen, status, type and hospital on the trainings screen — are kept **in the same `listStateStore`,
under the same `stateKey` as that screen's table**, in the `filters` field. FR-016 names "any filter
selections" alongside search, sort and page, so they have to survive the same round trip, and one store
under one key is the only arrangement where the table's state and the screen's filters cannot fall out of
step with each other. The table writes `query`, `sort`, `page` and `pageSize`; the list view writes
`filters` directly. The same-key rule still holds: two tables never share a key, so two screens never
share a filter record.

## What moves, and what stays

| # | From | To | Content |
|---|---|---|---|
| 1 | `VisitsView` detail column | `VisitDetailView` | Status badge and id, hospital, date, team, compliance, archived notice, details text, official report with download and upload, attachments gallery with its modal, response thread with its form, audit trail, print action, approve-and-archive action |
| 2 | `TrainingsView` detail column | `TrainingDetailView` | Status badge, kind, title, description, hospital, execution summary tiles, attachments, and the whole `ExecutionForm` with attendance entry, the import dialog and the template download |
| 3 | `VisitsView` | stays | Heading with filtered count, create-visit modal (central), status and hospital filter selects, the records table |
| 4 | `TrainingsView` | stays | Heading with filtered count, template and internal-training modals, status/type/hospital filter selects, the records table |

**Removed, not moved** (FR-018): `selectedVisitId` / `selectedTrainingId`, `selectedRowKey` on the table,
the `tableState.ids` mirror used to detect a filtered-out selection, and the two Arabic notices that
reported it.

## Migration inventory — rows that become navigable

| # | Screen | List | New destination |
|---|---|---|---|
| 1 | `VisitsView` | Visits | `/visits/{id}` |
| 2 | `TrainingsView` | Trainings | `/trainings/{id}` |
| 3 | `HospitalProfileView` | The coordinator's visits | `/visits/{id}` |
| 4 | `HospitalProfileView` | The coordinator's trainings | `/trainings/{id}` |
| 5 | `HospitalsView` comprehensive profile | That hospital's visits | `/visits/{id}` |
| 6 | `HospitalsView` comprehensive profile | That hospital's trainings | `/trainings/{id}` |

**Explicitly unchanged**: the practitioner and equipment tables on both profile screens, the hospitals
list, the coordinator directory, the three document libraries, the programme explorer, the audit log, the
dashboard comparison table, and every summary panel and metric tile.

## Invariants the change must preserve

- Every displayed value and its formatting is identical to what the side panel showed (FR-009, FR-010).
- Every action behaves identically and gains no new step (FR-011, FR-012).
- An archived visit stays read-only on its page (FR-013).
- The records each role can see are unchanged (FR-006, SC-006).
- No file under `prisma/**` changes, and no Server Action changes.
