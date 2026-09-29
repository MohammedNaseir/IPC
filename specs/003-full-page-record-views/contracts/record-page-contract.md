# Contract: A Record Page

What a per-record page must do, and what it must never do. Applies to `/visits/[id]` and
`/trainings/[id]`. Shapes are in [../data-model.md](../data-model.md).

## Resolution order

A record page performs these steps in this order, and returns at the first one that fails.

1. **Guard the session** with the existing page guard. A signed-out caller is sent to sign in, exactly as
   on every other portal screen. No record data is fetched first.
2. **Resolve the record scoped**, through `findVisitForUser(user, id)` or `findTrainingForUser(user, id)`.
   The caller's scope is part of the query's `where` clause.
3. **`notFound()` when the result is `null`**, before rendering anything at all.
4. **Render** the detail component with the resolved DTO.

Step 3 is the whole security property. There is no branch between "does not exist" and "not yours",
because the fetcher cannot distinguish them either.

## Required

| Requirement | Detail |
|---|---|
| Server component | The page fetches; it does not hand a fetch to the browser |
| One record | It fetches the record it renders, not the list it came from |
| Identical refusal | A fabricated id and a real foreign id produce byte-identical responses |
| Back affordance | A visible, keyboard-reachable link to the record's list, marked `no-print` |
| Arabic RTL | Same direction, register and type treatment as the rest of the portal |
| Loading state | A route-level `loading.tsx` rendering a record-shaped skeleton |
| Print | Page chrome and actions marked `no-print`; the record body prints |

## Forbidden

| Forbidden | Why |
|---|---|
| Fetching the record unscoped and filtering afterwards | Principle II. Authorization belongs in the query |
| Any response that differs between "absent" and "forbidden" | FR-007. It turns the address into an existence oracle |
| A new Server Action, or a change to an existing one | FR-012. This is a layout change |
| A new confirmation, approval or permission step | FR-012, and the owner ruled it out explicitly |
| Adding, removing or reformatting a displayed value | FR-009, FR-010 |
| An edit affordance on an archived visit | FR-013 |
| Any schema or migration change | Out of scope |

## Per-page acceptance

A record page is done when all eleven of these hold:

1. **Content parity**: every field, panel and affordance the side panel showed is present, compared item
   by item against a list captured before the change.
2. **Action parity**: every action performs the same mutation with the same payload and the same result
   message as it did from the panel.
3. **Archived state**: an archived visit shows its notice and offers no edit affordance anywhere on the
   page, including in the narrow layout.
4. **Authorization**: as coordinator A, the address of coordinator B's record is indistinguishable from a
   fabricated address; as central, both records resolve.
5. **Back path**: the page's own back control reaches the record's list; the browser's back control
   reaches wherever the user actually came from.
6. **Narrow layout**: at 400px the page reads top to bottom with no horizontal page scrolling.
7. **Print**: the printed output contains the record and excludes the sidebar, header, footer, back
   control and action buttons.
8. **Keyboard**: the back control and every action are tab-reachable and activate from the keyboard.
9. **Direct entry**: opening the address in a fresh session, after signing in, renders the record.
10. **Loading**: a slow navigation shows the record skeleton, not a blank screen and not a table skeleton.
11. **Arabic and RTL**: the page renders right-to-left in formal Arabic throughout — headings, labels,
    metadata, actions, empty states and the back control — in the same register and type treatment as the
    rest of the portal, with no string left in another language or another direction (FR-014).

## Route inventory

| Address | Renders | Fetches | Guard |
|---|---|---|---|
| `/visits/[id]` | `VisitDetailView` | `findVisitForUser`, `listAuditLogsForVisit` | Any signed-in user, scoped |
| `/trainings/[id]` | `TrainingDetailView` | `findTrainingForUser` | Any signed-in user, scoped |

Both are reachable by central administration and by the coordinator of the record's own hospital, and by
nobody else. Neither introduces a role restriction the product does not already have: the actions inside
them keep their own existing guards, so approving and archiving a visit stays central-only exactly as it
is today.
