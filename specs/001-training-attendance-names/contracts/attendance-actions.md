# Contract: Attendance Server Actions

All actions live in `src/server/actions/trainings.ts`, are invoked from the trainings screen, and
return the project's standard `ActionResult<T>` (`{ ok: true, data }` or `{ ok: false, error }`)
with Arabic, user-safe error text. Every action starts with `requireActionUser()` and loads the
target training with `{ id, ...hospitalScope(user) }`, so a coordinator can only reach their own
hospital's trainings and central can reach all. Every successful write records an audit entry in
the same transaction.

## 1. `recordTrainingExecution(formData: FormData)` — revised

Records execution details plus attendance. Replaces the training's entire attendance set.

**Input fields**

| Field | Required | Rules |
|---|---|---|
| `trainingId` | yes | id of a training in the caller's scope |
| `date` | yes | execution date |
| `deliveredBy` | yes | 1–200 chars |
| `notes` | no | ≤ 10,000 chars |
| `mode` | yes | `"names"` or `"headcount"` |
| `attendeeNames` | when `mode=names` | repeated field, one per attendee; each trimmed, 1–200 chars, ≥ 1 present, ≤ 1,000 total; duplicates preserved |
| `headcount` | when `mode=headcount` | integer 1–100,000 |
| `photo` | no | unchanged existing behaviour |
| `practitionerIds` | **must be absent** | if present, the action fails with a validation error (FR-005) |

**Behaviour**
- Rejects a submission that supplies neither names nor a headcount.
- Rejects a submission that supplies both.
- Deletes the training's existing attendance rows and inserts the new set atomically; a failure
  leaves the prior attendance intact.
- Sets the training's status to completed, as today.

**Returns** `ActionResult<null>`.

**Error cases** (Arabic messages): out-of-scope or unknown training (not-found style, does not
confirm existence); missing attendance; both modes supplied; a name that is empty after trimming or
over 200 chars; more than 1,000 names; a `practitionerIds` field present.

## 2. `importAttendanceNames(formData: FormData)` — new

Parses an uploaded sheet and replaces the training's attendance with the names it contains.

**Input fields**

| Field | Required | Rules |
|---|---|---|
| `trainingId` | yes | id of a training in the caller's scope |
| `file` | yes | `.xlsx` or `.csv`; first worksheet and first column only; first cell must read `الاسم` |

**Behaviour**
- Parses in memory. The file is never written to `UPLOADS_DIR`, never recorded in `StoredFile`, and
  never returned to the client.
- Skips blank and whitespace-only rows; trims each name; rejects individual names over 200
  characters and reports them as skipped with their 1-based sheet row.
- Refuses the whole import — writing nothing — when the file type is unsupported, the file cannot
  be opened, the header is missing or is not `الاسم`, no non-empty names are present, or the file
  holds more than 1,000 names.
- On success, replaces the training's whole attendance set (any previous headcount is cleared) in
  one transaction and writes an audit entry naming the imported count.

- Reports which worksheet was read in `ImportSummary.sheetName` when the source was `.xlsx`, so the
  summary can state that only the first sheet was used (spec edge case). Omitted for `.csv`.

**Returns** `ActionResult<ImportSummary>` — see the shape in
[../data-model.md](../data-model.md#import-result-shape). The UI renders imported/skipped counts and
the per-reason breakdown.

**Error cases** (Arabic messages, each naming the specific problem): unsupported file type, with the
accepted list; unreadable file; wrong or missing `الاسم` header, pointing to the template; no names
found; too many names, stating the limit and the count found; out-of-scope or unknown training.

## 3. Read contract — `listTrainings`

`src/server/queries/trainings.ts` selects `attendeeName` and `headcount` per attendance row and
exposes, per training: `attendeeNames: string[]` (ordered as stored, duplicates preserved) and
`attendeeCount: number` (name count, or the headcount). `attendeePractitionerIds` is removed from
the DTO, so any consumer still referencing it fails at compile time rather than silently reading
`undefined`.

## Authorization summary

| Caller | Record / import attendance |
|---|---|
| `central` | any training |
| `hospital` coordinator | only trainings belonging to their own hospital |
| no session | refused before the action body runs |

A crafted request naming another hospital's training returns the not-found-style error and writes
nothing, matching the behaviour already verified for the other attendance paths.
