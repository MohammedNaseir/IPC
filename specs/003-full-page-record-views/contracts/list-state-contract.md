# Contract: List State and Row Navigation

The two changes to the shared records table, and what they must not disturb. The table's own contract
from feature 002 stands unchanged except as stated here.

## `stateKey` — restoring a list's place

### Addition to `<DataTable<T> />`

| Prop | Type | Required | Behaviour |
|---|---|---|---|
| `stateKey` | string | no | When set, the table restores its search term, sort, page and page size from the client-side store on mount, and writes them back as the user changes them. When unset, the table behaves exactly as it does today |

The store entry under a key also carries a `filters` record, which the **list view** writes and reads for
its own screen-level selects. The table neither reads nor writes it; it only guarantees the key.

### Required behaviour

- **Restores on mount**: a table remounting with a key that has a stored entry starts in the stored
  state, with no visible flash of the default state.
- **Writes only from interaction**: the store is written from event handlers, never during a render.
- **Client only**: the store is neither read nor written on the server. Module state on the server is
  shared across requests, so a server-side write would leak one user's view state into another user's
  render.
- **Keyed per instance**: two tables never share a key. Six keys exist; the two sub-section tables on
  screens that already keep independent state keep independent keys too.
- **Inert when unset**: an instance without a key reads nothing, writes nothing, and leaves no entry.

### Forbidden

| Forbidden | Why |
|---|---|
| Putting any of this state in the address | FR-016a, and the owner's answer to Q1 |
| A default key derived from the caption, the route or the column set | An accidental collision silently shares one table's state with another |
| Changing any existing behaviour when `stateKey` is absent | FR-015. Eighteen instances depend on this component |
| Reading the store during server rendering | Cross-request leakage and a hydration mismatch |

### Acceptance

1. Search, sort, filter and page a list; open a record; return by the page's back control — all four are
   restored.
2. Repeat, returning with the browser's back control — identical result.
3. Open a second record and return again — state still intact.
4. Reload the page — state resets to the default. This is the accepted cost, not a defect.
5. The list's address is the same string before and after searching, sorting and paging (SC-009).
6. Two tables on one screen with different keys do not affect each other.
7. Every table instance without a key behaves exactly as feature 002's suite recorded.

## Row navigation

### Required

- **Primary cell is a real link** to the record's address, so the destination carries link semantics,
  appears in the status bar, and supports middle-click and "open in new tab" (FR-005).
- **Whole-row activation remains**, through the table's existing `onRowSelect`, and leads to the same
  address. An overlapping click cannot do the wrong thing because both destinations are identical.
- **Keyboard**: the row stays activatable, and the link is tab-reachable.

### Forbidden

| Forbidden | Why |
|---|---|
| Replacing row activation with a link-only cell | Shrinks the click target from the row to a word |
| Adding an "open" button to an actions column on these lists | These lists have no actions column today; adding one changes the table's shape for no gain |
| Making practitioner, equipment, hospital, document, programme or audit rows navigate | FR-021. Only visit and training rows change |

### Which lists get it

| Screen | List | Gets navigation |
|---|---|---|
| `VisitsView` | Visits | yes |
| `TrainingsView` | Trainings | yes |
| `HospitalProfileView` | Visits, Trainings | yes |
| `HospitalsView` comprehensive profile | Visits, Trainings | yes |
| `HospitalsView` comprehensive profile | Practitioners, Equipment | no |
| Everything else | — | no |
