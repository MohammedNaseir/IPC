# Contract: the notification surface

**Module**: `src/lib/notify.ts` (client-only) | **Covers**: FR-006 to FR-012, item 3

This is the **only** module in the project permitted to know which dialog library is in use. Components import this and nothing else. That is what makes FR-007 to FR-010 enforceable and what makes the library replaceable in one file if it fails them.

## Surface

Three functions, no more. Every one of the eight replaced sites maps to exactly one.

| Function | Replaces | Returns | Blocking |
|---|---|---|---|
| `notify.info(message, options?)` | an informational `window.alert` | `Promise<void>` | dismissable, non-destructive |
| `notify.error(message, options?)` | a failure `window.alert` | `Promise<void>` | dismissable, non-destructive |
| `notify.confirm(options)` | a `window.confirm` | `Promise<boolean>` | resolves `true` only on explicit affirmation |

`confirm` options carry at minimum a title, a body, an affirmative label and a cancelling label — all Arabic, all supplied by the caller. No English default text may reach the user.

## Behavioural contract

Every one of these is a requirement, not a preference, and each is independently checkable in a browser:

1. **Direction** — the dialog renders `dir="rtl"`. Affirmative and cancelling actions appear in correct RTL order. This is verified in the browser, not inferred from the library's auto-detection (R-001).
2. **Appearance** — typography and colour come from the project's tokens. No third-party default theme ships (FR-007). Destructive confirmations use the `danger` role; nothing else does.
3. **Cancellation is the safe default** — `Escape`, backdrop dismissal and browser-back all resolve `confirm` as `false`. The action does not execute (FR-008).
4. **Focus** — focus moves into the dialog on open, is trapped while open, and returns to the triggering control on close (FR-009).
5. **Announcement** — the dialog carries an accessible name and a role appropriate to whether it is informational or a confirmation (FR-010).
6. **Form state survives** — showing a failure never clears or remounts the form beneath it (FR-011).
7. **Server-safe** — the implementation is imported dynamically inside a `'use client'` boundary and is never evaluated during server render.

## The eight call sites

| File | Line (at `375eae6`) | Kind | Becomes |
|---|---|---|---|
| `src/components/hooks/useActionRunner.ts` | 15 | alert | `notify.error` — the shared path every Server Action failure flows through |
| `src/components/views/DashboardView.tsx` | 69 | alert | `notify.info` — invalid date range |
| `src/components/views/DocumentsView.tsx` | 203 | alert | `notify.info` — no file chosen |
| `src/components/views/ProgramsView.tsx` | 190 | alert | `notify.info` — no file chosen (note: this file is rewritten by item 2 first) |
| `src/components/views/TrainingDetailView.tsx` | 52 | confirm | `notify.confirm` — replacing a name list with a total |
| `src/components/views/TrainingDetailView.tsx` | 55 | confirm | `notify.confirm` — replacing a total with a name list |
| `src/components/views/TrainingDetailView.tsx` | 68 | alert | `notify.info` — attendee-name limit reached |
| `src/components/views/VisitDetailView.tsx` | 104 | confirm | `notify.confirm` — **archiving a visit** |

## The archive confirmation

The visit archive is the product's one irreversible act and the design critique's P0. Its confirmation is held to two extra rules:

- It **must not** introduce a second approver, a review step, or any role check beyond the existing central-role one (FR-012). The owner rejected that explicitly. This is friction on a destructive action, not an approval workflow.
- It uses the `danger` role, consistent with the archive button, which already carries the irreversible-red and lock treatment shipped in `375eae6`.

Whether it goes further — naming the hospital and date, enumerating what is being sealed — is an owner decision recorded as still open in the spec's assumptions, not settled by this contract.

## Exit criterion

`grep -rn "window\.alert\|window\.confirm" src/` returns **zero** results (SC-001).
