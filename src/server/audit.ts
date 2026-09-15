import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import type { SessionUser } from '@/lib/types';

export type AuditEntity =
  | 'User'
  | 'Hospital'
  | 'Visit'
  | 'Training'
  | 'Practitioner'
  | 'Equipment'
  | 'Policy'
  | 'Document'
  | 'Program';

export async function logAudit(
  tx: Prisma.TransactionClient,
  actor: Pick<SessionUser, 'id' | 'name'>,
  entityType: AuditEntity,
  entityId: string,
  action: string,
): Promise<void> {
  await tx.auditLog.create({
    data: { entityType, entityId, action, performedById: actor.id, performedByName: actor.name },
  });
}
