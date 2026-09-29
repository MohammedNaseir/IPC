# Phase 0 Research: Full-Page Record Views for Visits and Trainings

Both of the spec's open questions were answered by the owner before planning (list state is restored, not
addressable; the embedded lists navigate too), so no `NEEDS CLARIFICATION` items remain. What follows are
the decisions this plan rests on.

## R-001 — Preserving list state without putting it in the address

**Decision**: give the shared table an optional `stateKey`. When it is set, `useTableState` restores its
search term, sort, page and page size from a module-level store on mount and writes them back as they
change. The store is a plain `Map` in the client bundle, read and written only on the client, and scoped
per key (`visits`, `trainings`, `hospital-profile-visits`, …).

**Rationale**: FR-016a forbids the address carrying the state, so the state has to survive a component
unmount some other way. A module-level store is the smallest thing that does it: no context plumbing, no
storage API, no change to how any existing caller uses the table, and the restoration is encapsulated
inside the component that owns the state rather than lifted into every screen.

The hydration trap is real and avoidable. A module-level value that differs between the server render and
the first client render produces a mismatch. It cannot happen here: on a full page load the module is
fresh in both places and the store is empty, so both render the default state; on a client-side
back-navigation there is no hydration comparison at all, because the page's client components mount in
the browser rather than hydrating server HTML. The reads must still be guarded so the store is never
written during a server render — module state on the server is shared across requests, and a write there
would leak one user's view state into another user's render. Writes happen only in event handlers.

**Alternatives considered**:

- **Query parameters** — rejected by the owner's answer to Q1. It would also add a history entry per
  keystroke unless debounced, and re-opens a decision feature 002 deliberately deferred.
- **A React context in a shared `visits/layout.tsx`**, which the App Router keeps mounted across
  navigation into `visits/[id]`. Correct and idiomatic, but it requires lifting the table's state out of
  the component that owns it and threading it through every screen that wants restoration — four screens
  here, and a new prop contract for the shared table either way. Kept as the fallback if the store
  approach fails verification.
- **`sessionStorage`** — survives a full reload as well, which is more than the requirement asks for, at
  the cost of a try/catch on every access and a genuine hydration mismatch to design around. Revisit only
  if "my filter survived a refresh" turns out to be wanted.
- **Intercepting or parallel routes** rendering the record over the list — that is the side panel again,
  wearing a different hat.

**Cost accepted**: state is lost on a hard reload or a new tab. The requirement is restoration on return
from a record, which is a client-side navigation, so this is within scope.

## R-002 — Fetching one record, scoped

**Decision**: add single-record fetchers beside the existing list queries —
`findVisitForUser(user, id)`, `listAuditLogsForVisit(user, visitId)` and `findTrainingForUser(user, id)` —
each resolving the record with `findFirst({ where: { id, ...hospitalScope(user) } })` and returning
`null` when there is no match. Extract the existing row→DTO mapping out of the list functions so the list
and the single fetch cannot drift apart.

**Rationale**: the scope has to be part of the query that fetches the record (FR-008), which is the same
shape `loadOpenVisit` already uses in the visit actions, so the pattern is established in this codebase
rather than invented here. Returning `null` for "absent or not yours" is what lets the page treat both
cases identically without the caller having to know which happened (FR-007).

**Alternatives considered**:

- **Reuse `listVisits(user)` and pick the record out of the array.** Correct and automatically scoped,
  and it needs no new query. Rejected: it fetches every visit with its attachments and responses to
  render one, which at 1,000 visits is absurd, and it hides the authorization decision inside a list
  function rather than stating it at the fetch site.
- **Fetch unscoped, then compare `hospitalId` in the page.** Rejected outright: that is authorization
  after the fact, which Principle II exists to forbid, and one early return away from a leak.

**Note**: this feature therefore *does* touch `src/server/**`, unlike feature 002. That is expected and
necessary — the spec asks for a new way to reach a record, and a new way to reach a record needs a new
scoped query. What it must not touch is the schema, any Server Action, or what any existing action does.

## R-003 — Making "not yours" and "does not exist" indistinguishable

**Decision**: the page calls `notFound()` when the fetcher returns `null`, for both causes, before
rendering anything. No message distinguishes them and no redirect differs between them.

**Rationale**: FR-007 and SC-005. A page that 404s for a fabricated id but redirects (or renders a
different error) for a real foreign record is an existence oracle: a coordinator could enumerate whether
another hospital has a visit with a given id. Because the fetcher cannot tell the two apart either — the
scope is part of the `where` clause — there is no code path that could accidentally treat them
differently.

**Verification**: compare the full response (status, headers, body length) for a real foreign record id
and a fabricated id, as the same signed-in coordinator, for both record types. Identical or it fails.

## R-004 — Where the detail markup goes

**Decision**: extract the detail half of each view into its own client component —
`VisitDetailView` and `TrainingDetailView` — moving the modals and the execution form with it. The list
views keep the list, the filter selects, the create modals and the heading count.

**Rationale**: the detail markup already exists and works; this is a move, not a rewrite (FR-012). Keeping
it a client component preserves every existing action call, the `useActionRunner` wiring and the local
form state exactly as they are. The pages that render these components are server components that fetch
and pass DTOs, matching how every other screen in this app is built.

**Alternatives considered**: rebuilding the detail as server components with form actions. Rejected — it
would turn a layout change into a rewrite of five working mutation flows, against FR-012.

## R-005 — Printing

**Decision**: rely on the existing print rules, and mark the new back affordance and action buttons
`no-print`.

**Rationale**: `globals.css` already hides `aside`, `header`, `footer` and anything marked `no-print` when
printing. On a dedicated page the list, its toolbar and its pagination are not in the document at all, so
the thing that most polluted the printed output disappears without any new rule (FR-019). The remaining
work is to make sure the page's own chrome is excluded and that nothing that used to print is lost
(FR-020).

## R-006 — Row activation that is a real navigation

**Decision**: keep whole-row activation through the shared table's existing `onRowSelect`, and wrap the
row's primary cell content in a real link to the record. Both lead to the same address.

**Rationale**: FR-005 requires the destination to be announced as a navigation, which a `<tr onClick>`
cannot do — to a screen reader it is a table row that happens to react to clicks. A real anchor gives the
link role, the status-bar preview, middle-click and "open in new tab" for free. Keeping row activation as
well preserves the click target people already use, and costs nothing because both destinations are
identical, so an overlapping click cannot do the wrong thing.

**Alternatives considered**:

- **Anchor only**, dropping row activation — rejected: it shrinks the click target from the row to a word.
- **`router.push` in `onRowSelect` only** — the smallest change, but it fails FR-005 and loses new-tab
  behaviour. Rejected for that reason alone.

## R-007 — Loading state for a record page

**Decision**: a `loading.tsx` per record route, rendering a record-shaped skeleton rather than the table
skeleton feature 002 introduced.

**Rationale**: SC-004 asks for a visible loading indication, and the route transition is where the wait
actually is (the same finding as feature 002's R-006). A table skeleton would be a lie about what is
coming.

## R-008 — What comes out of the lists

**Decision**: remove `selectedRowKey`, the selection state, and the "the selected record is outside the
current filter" notice from both list views. Keep `onStateChange`, which still feeds the heading count.

**Rationale**: FR-018. Those three existed only to keep the side panel and the list in agreement. With no
panel, a highlighted row would mean nothing and the filtered-out notice would have nothing to report.

## R-009 — The embedded lists

**Decision**: the visit and training tables inside `HospitalProfileView` and the hospitals comprehensive
profile get the same row activation and primary-cell link. Their practitioner and equipment tables do
not. Their columns, page size and surrounding panels are untouched.

**Rationale**: the owner's answer to Q2, recorded as FR-017a and FR-017b. A visit row that opens a visit
on one screen and does nothing on another is the kind of inconsistency that teaches people not to trust
the interface.

**Consequence for the back affordance**: a record opened from the hospital profile still returns to
`/visits` through the page's own back control, while the browser's back returns to the profile. That is
the documented assumption in the spec; both paths are in the acceptance list.

## R-010 — Verifying a change that spans authorization and layout

**Decision**: three layers, reusing the harness built for feature 002 — the standard gates; a per-role
record-set baseline captured from the pre-change build and compared after (SC-006, SC-008); and a direct
authorization probe against the new addresses, with positive controls (SC-005).

**Rationale**: the dangerous failure here is not visual. A record page that resolves an id without the
scope would hand one hospital's supervisory record to another, and nothing on screen would look wrong.
The probe is the only thing that catches it, and it needs a positive control — a refusal that happens for
the wrong reason (a typo in the id, an expired session) looks exactly like enforcement.

**Also verified**: that the other twelve table instances from feature 002 still behave identically, since
this feature adds a prop to the shared table. Re-running that feature's per-screen suite is cheaper than
reasoning about whether an additive prop could have changed anything.

## R-012 — A route group, because `notFound()` returned 200 (resolved finding, 2026-09-28)

**Finding**: the authorization probe (T022/T033) caught the record pages answering **200** for a record
that does not exist, rendering the not-found UI under a success status. The query layer was already
proven correct by T008, so the fault was in delivery, not in scoping.

**Cause**: `src/app/(portal)/visits/loading.tsx`, added by feature 002 as the *list* route's skeleton,
creates a Suspense boundary over its segment **and every child segment** — including `[id]`. Next flushes
the shell with `200` as soon as that boundary is reached, before the record page's `await` resolves, so
by the time `notFound()` throws the status is already committed. Measured on one build: with the parent
`loading.tsx` present, `200` and a 56 KB body; with it removed, `404` and a 16,040-byte body.

**Decision**: move each list page into a route group — `visits/(list)/page.tsx` with its own
`(list)/loading.tsx` — so the list's Suspense boundary no longer covers `[id]`. The URLs are unchanged;
route groups do not appear in the path. Then put the 404 decision in `[id]/layout.tsx`, which resolves
**above** the record page's own `loading.tsx` boundary, so the record route keeps its skeleton and still
answers 404.

**The layout is not the authorization check.** Its scoped `select id` exists only to settle the status
before anything flushes. The page still performs its own full scoped fetch with `hospitalScope(user)`
inside the `where` clause, and still calls `notFound()` on `null`. Two independent scoped reads, one
cheap and one complete; removing either must not open a hole.

**Alternatives considered**:

- **Accept the 200.** It satisfies FR-007 and SC-005 as written — with a same-length fabricated id the
  responses are byte-identical, so nothing about existence leaks. Rejected: a record that does not exist
  answering `200` is a lie the next reader, monitor or client will believe.
- **Delete the two list `loading.tsx` files.** One line each, true 404s, and feature 002's FR-013 loses
  its skeleton on the two busiest screens. Rejected as a regression paid for someone else's requirement.

**Harness defect found alongside it**: the probe's first run reported a 10-byte difference between the
foreign and fabricated responses and nearly recorded it as an existence oracle. The fabricated id was 29
characters against a 25-character cuid and the URL is echoed in the payload — the probe was measuring its
own test data. It now uses a same-length fabricated id.

