# Contract: soft delete and restore

**Module**: `src/server/db/softDelete.ts` (the extension) + one `delete<Module>`/`restore<Module>`
action pair per module, in that module's existing action file | **Covers**: FR-001 to FR-015

The extension is the **only** place that knows how soft delete is implemented — a `deletedAt`
column, a `deletionEventId` grouping column, and a redirected `delete`/`deleteMany`. Every other
file, including every delete/restore action, only ever calls ordinary-looking `update`/`findMany`
methods on the `prisma` export and gets the correct behavior for free. That is what makes the
guarantee in research.md R-001 hold for code that doesn't exist yet.

## Surface

### The extension itself

| Guarantee | Applies to |
|---|---|
| Every read (`findMany`, `findFirst`, `findUnique`, `count`, etc.) on an in-scope model excludes rows where `deletedAt` is set, with no caller-side change required | all 13 in-scope models (11 from spec.md, plus `User` and `ProgramFile`), from every existing and future call site |
| `.delete()` / `.deleteMany()` on an in-scope model **throws**, refusing the call — it never removes a row and never silently performs a soft delete either. A `delete<Module>` action must call `.update()` (setting `deletedAt`, and `deletionEventId` if cascading) directly, itself | all 13 in-scope models — **revised from the original plan's silent redirect; see research.md R-001 for why** |
| `Visit` update-to-deleted is refused unconditionally when `status === 'completed'` (via a `where`-clause augmentation Prisma's own "record not found" enforces), regardless of caller, regardless of whether the calling action already checked | `Visit` only — the one rule with no permitted exception (FR-008) |
| Soft-deleted rows are visible **only** through `prismaUnfiltered` (`src/server/db.ts`), used by `src/server/queries/trash.ts` | all 13 in-scope models |

### Every module's action pair

| Function | Shape | Returns |
|---|---|---|
| `delete<Module>(id: string)` | `requireActionUser()`/`requireActionCentral()` per FR-004 → load `{ id, ...hospitalScope(actor) }`, not-found if absent → (Visit only) refuse if `status === 'completed'` → cascade set-up if this module cascades (assign one fresh `deletionEventId`, apply it to the record and every row in its cascade group from data-model.md) → `logAudit(tx, actor, EntityType, id, 'حذف ...')` → all inside one `$transaction` | `Promise<null>`, matching every existing action's shape |
| `restore<Module>(id: string)` | `requireActionCentral()` (restore is always central-only, FR-005, even for a module a coordinator could delete) → load the deleted row **through the unfiltered accessor**, not-found if absent or not actually deleted → clear `deletedAt`/`deletionEventId` on it and on every row sharing its `deletionEventId` (or just itself, if `deletionEventId` is null) → `logAudit(tx, actor, EntityType, id, 'استعادة ...')` → one `$transaction` | `Promise<null>` |

Both functions live in the module's existing action file (`src/server/actions/hospitals.ts`,
`equipment.ts`, etc.), next to that module's `create`/`update` functions — not a separate
grab-bag file, matching how every module already organizes its own actions (constitution 5.5).

## Behavioural contract

Every one of these is a requirement, independently checkable against a running build:

1. **Permission mirrors edit** — whoever can call `update<Module>` today can call
   `delete<Module>`; nobody else can, and cross-hospital targeting is refused the same way an
   edit of another hospital's record is refused today (FR-004, FR-007).
2. **Restore is always central-only** — even for a module a coordinator can delete (FR-005). A
   coordinator who deletes their own equipment cannot undo it themselves; only central can.
3. **One confirmation, naming the record** — the UI confirmation before a delete names the
   specific record (its title/name field), matching the confirmation style already established by
   `src/lib/notify.ts` (FR-002).
4. **A completed Visit shows no delete control, anywhere** — not just refused server-side; the UI
   never renders the control in the first place once `status === 'completed'` (FR-008).
5. **Restoring returns every field exactly** — no field is defaulted, recomputed, or left blank on
   restore; the row is exactly what it was (FR-003).
6. **Restoring a cascade restores the whole group, and only that group** — a child deleted
   independently, before or after the parent's own deletion, does not come back when the parent is
   restored (FR-010, data-model.md's cascade groups table).
7. **Every delete and every restore writes exactly one `AuditLog` row**, inside the same
   transaction as the data change, actor and timestamp from `logAudit` — no exceptions, no batched
   single entry for a whole cascade (FR-006). A hospital cascade deleting five records writes five
   `AuditLog` rows, one per record, consistent with how every other multi-row mutation in this
   codebase is already logged.
8. **A deleted coordinator's identity is immediately reusable** — a new coordinator can be created
   with the same email and hospital assignment without restoring or further touching the old row
   (FR-013).
9. **Self-delete and last-central-admin are refused before any database write** (FR-014).

## The completed-Visit exception

This is the one rule in the feature inherited from an existing, binding SRS requirement
(`docs/SRS_IPC_Management_Portal_Neon.md`, reliability section) rather than a new design choice,
and it is held to an extra rule beyond every other module:

- Enforced **twice, deliberately**: once in `deleteVisit()` itself (a normal, user-facing refusal
  message) and once inside the extension (research.md R-004), so a future code path that reaches
  the Prisma model directly — bypassing the action entirely — still cannot delete a completed
  visit. This is the one place in the feature where defense-in-depth is a requirement, not a nicety.
- Never weakened, relaxed, or made role-conditional. Central has no override. There is no
  "force delete."
- A Hospital's cascading delete **skips** a completed Visit rather than blocking the whole
  cascade on it (spec Assumptions) — the visit stays fully visible, under a hospital that is
  otherwise removed.
