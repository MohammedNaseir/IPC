# Quickstart: Validating the Full-Page Record Views

How to prove the record pages work, that nothing reachable changed, and — the one that matters — that a
per-record address cannot be used to reach or detect another hospital's record. Shapes live in
[data-model.md](./data-model.md) and [contracts/](./contracts/); this is the run guide.

## Prerequisites

- Dependencies installed. **No new dependency** is expected — if `package.json` gained one, decision
  R-001 or R-006 was changed and should be re-justified.
- A scratch PostgreSQL database and a production build, as used for features 001 and 002. Never the
  production Neon database.
- Environment: `DATABASE_URL`, `AUTH_SECRET`, `UPLOADS_DIR`.
- Seed data through the existing actions: one central user, **a second central user** (to prove nothing
  became identity-specific), two hospitals each with a coordinator, enough visits and trainings to fill
  several pages on both screens, at least one **archived** visit, at least one **completed** training, a
  visit carrying a report, attachments and responses, and a training recorded by name list and another by
  headcount.
- Note the ids of: a visit belonging to hospital A, a training belonging to hospital A, and the
  equivalents for hospital B. The authorization probe needs them.

## 0. Gates and the scope proof

```bash
npm run typecheck
npm run lint
npm run build
git diff --stat -- prisma                    # MUST be empty
git diff --stat -- src/server/actions         # MUST be empty
git diff --stat -- package.json               # expect no new dependency
git diff --stat -- src/server/queries          # expect ONLY visits.ts and trainings.ts
```

Unlike feature 002, `src/server/**` is expected to change — but only the two query modules. A diff
touching `src/server/actions/**` means a layout change turned into a behaviour change; stop and explain
before going further.

## 1. The authorization probe (SC-005 — run this first)

This is the check the feature exists to be careful about, and the only one that catches a silent leak.

As **coordinator A**, request each of these and capture the full response — status, any redirect target,
and the body:

| Request | Expected |
|---|---|
| `/visits/{A's own visit id}` | 200, the record renders |
| `/visits/{B's visit id}` | 404 |
| `/visits/{a fabricated id}` | 404 |
| `/visits/{a malformed id}` | 404 |
| `/trainings/{B's training id}` | 404 |
| `/trainings/{a fabricated id}` | 404 |

Then assert the property that matters: **the response for B's real record and the response for the
fabricated id are identical** — same status, same body length, same content. A difference of any size is
an existence oracle. Repeat as coordinator B against A's records.

Positive controls, without which the 404s prove nothing:

- As **central**, every one of those ids resolves to a rendered record. If central also 404s, the probe
  was testing a broken route, not enforcement.
- As **coordinator A**, A's own record resolves. If it did not, the 404s above could be a routing bug.
- **Signed out**, a valid record address redirects to sign-in rather than rendering.

## 2. Content and action parity (User Story 1, User Story 2)

Capture the inventory **before** migrating: for one archived visit, one open visit, one completed
training and one pending training, list every field, panel, button, link and form present in the side
panel. After the change, walk the 11-point list in
[contracts/record-page-contract.md](./contracts/record-page-contract.md) for each and compare item by
item. A screen is not done until all ten pass.

Particular traps:

- **The archived visit**: no edit affordance anywhere on the page, in either layout. Enumerate every
  interactive element rather than looking for the obvious one — the phrase "رفع تقرير الزيارة" also
  appears in the prose that says no report was uploaded, so search the controls, not the text.
- **The response form**: submitting with and without an attachment, and the resulting thread entry.
- **Attendance**: name list, headcount, the import dialog and its summary of imported/skipped rows, and
  the template download.
- **Approve and archive**: still central-only, still one step, and the page becomes read-only afterwards.

## 3. List state restored (User Story 3)

On `/visits`, then again on `/trainings`:

1. Apply a search term, a sort, a filter select and a page change.
2. Open a record.
3. Return with the page's own back control → all four still in effect, same rows.
4. Open another record, return with the **browser's** back control → identical.
5. Reload the list → state resets to default. Expected, not a defect.
6. Confirm the address bar string is unchanged throughout steps 1–4 (SC-009).

Then the negative: every other table instance still has no key and behaves as before — re-run feature
002's per-screen suite in full, since the shared table gained a prop.

## 4. Record sets unchanged (SC-006, SC-008)

Extend the marker-comparison harness from feature 002. Capture a baseline from the **pre-change** build
for central, coordinator A and coordinator B across every screen, then compare after. The visits and
trainings screens will legitimately differ in markup; the assertion is on the **set of record markers**
each role's payload contains, which must be identical, and on every other screen being byte-comparable in
its marker set.

A screen that starts rendering an unscoped array is the failure this step exists to catch, and it is
invisible in a screenshot.

## 5. Navigation semantics and accessibility

- The primary cell is a real link: it has an `href`, it appears in the status bar on hover, and
  middle-click opens the record in a new tab.
- Row activation still works by mouse and by keyboard, and leads to the same address.
- The back control is tab-reachable and activates from the keyboard.
- On the two profile screens, a visit row opens the same page as from `/visits`, and the browser's back
  returns to the profile while the page's back control goes to `/visits`.
- Practitioner and equipment rows on those same screens are still not navigable.

## 6. Narrow viewport and print

- At 400px, each record page reads top to bottom with no horizontal page scrolling, and every action is
  reachable.
- Printing a visit record produces the record without the sidebar, header, footer, back control or action
  buttons, and contains every section the side panel printed.
- Printing a training record does not produce broken output.

## 7. Documentation follow-through

- `docs/CLAUDE_REFERENCE.md` records the per-record address convention and, more importantly, the rule
  that a record resolved by id is resolved with the caller's scope inside the `where` clause and 404s
  identically for absent and forbidden.
- The same note states that list state is restored from a client store and deliberately not addressable,
  so a future reader does not "fix" it by adding query parameters.
