import 'server-only';
import { Prisma } from '@/generated/prisma/client';

/**
 * The eleven modules from specs/005-soft-delete/spec.md plus ProgramFile (which, unlike every
 * other child/attachment row, can be deleted on its own -- see data-model.md). Every other model
 * (AuditLog, Notification, StoredFile, VisitAttachment, VisitResponse, TrainingAttachment,
 * TrainingAttendance) is untouched by this extension and behaves exactly as it does today,
 * including TrainingAttendance's existing real `deleteMany` re-sync call in
 * src/server/attendance/input.ts.
 */
const SOFT_DELETE_MODELS = new Set([
  'Hospital',
  'Visit',
  'Training',
  'TrainingTemplate',
  'Practitioner',
  'Equipment',
  'Policy',
  'OrgDocument',
  'DocumentCenterFile',
  'Program',
  'ProgramFolder',
  'ProgramFile',
  'User',
]);

const READ_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * The soft-delete extension (specs/005-soft-delete/research.md R-001, R-004; contracts/
 * soft-delete.md). Applied once to the shared `prisma` singleton in src/server/db.ts -- every
 * existing and future read on an in-scope model is filtered for free, with no call-site change.
 *
 * Two things this deliberately does NOT do, and why:
 * - It does not redirect `.delete()`/`.deleteMany()` into a soft-delete update. Prisma's `query`
 *   extension component can only intercept or refuse a given operation, not swap it for a
 *   different one (verified against the installed type declarations, not assumed) -- redirecting
 *   would require the `model` component's method-override form instead, which replaces a method
 *   for *every* model uniformly and has no safe way to fall through to the real delete for models
 *   this feature doesn't own (TrainingAttendance's existing `deleteMany` re-sync call would break).
 *   Instead, `.delete()`/`.deleteMany()` on an in-scope model throws, loudly, telling the caller
 *   to use that module's `delete<Module>` Server Action (which calls `update`, an ordinary call,
 *   not a redirected one). A loud failure during development is safer than a silent one.
 * - It does not look up a Visit's current status with a separate query before allowing an update
 *   that sets `deletedAt`. Instead it augments the `where` clause to also require
 *   `status: { not: 'completed' }` whenever such a write is attempted -- Prisma's `update()`
 *   throws "record not found" when the (now narrower) `where` matches nothing, which is exactly
 *   the refusal FR-008 requires, with no extra round trip.
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !SOFT_DELETE_MODELS.has(model)) {
          return query(args);
        }

        const a = args as { where?: Record<string, unknown>; data?: Record<string, unknown> };

        if (READ_OPERATIONS.has(operation)) {
          return query({ ...a, where: { ...(a.where ?? {}), deletedAt: null } });
        }

        if (operation === 'delete' || operation === 'deleteMany') {
          throw new Error(
            `${model}.${operation}() is disabled: ${model} is soft-deletable. Use that module's delete action (src/server/actions), which sets deletedAt via update, instead of a hard delete.`,
          );
        }

        if ((operation === 'update' || operation === 'updateMany') && model === 'Visit') {
          const settingDeletedAt = a.data && 'deletedAt' in a.data && a.data.deletedAt !== null;
          if (settingDeletedAt) {
            return query({ ...a, where: { ...(a.where ?? {}), status: { not: 'completed' } } });
          }
        }

        return query(args);
      },
    },
  },
});
