import 'server-only';
import type { SessionUser } from '@/lib/types';
import type { ExtendedTransactionClient } from '@/server/db';

export type AuditEntity =
  | 'User'
  | 'Hospital'
  | 'Visit'
  | 'Training'
  | 'TrainingTemplate'
  | 'Practitioner'
  | 'Equipment'
  | 'Policy'
  | 'Document'
  | 'Program'
  | 'ProgramFolder';

export async function logAudit(
  tx: ExtendedTransactionClient,
  actor: Pick<SessionUser, 'id' | 'name'>,
  entityType: AuditEntity,
  entityId: string,
  action: string,
): Promise<void> {
  await tx.auditLog.create({
    data: { entityType, entityId, action, performedById: actor.id, performedByName: actor.name },
  });
}
