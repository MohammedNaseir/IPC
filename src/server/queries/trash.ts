import 'server-only';
import { prismaUnfiltered } from '@/server/db';
import type { AuditEntity } from '@/server/audit';
import type { TrashedRecordMeta } from '@/lib/types';

/**
 * "Who removed this, and when" (research.md R-003) -- read from the most recent matching AuditLog
 * entry, not a stored column, so AuditLog stays the single source of truth for actor/timestamp.
 * Every module's trash-listing query calls this once with its already-fetched deleted rows.
 */
export async function attachTrashMeta<T extends { id: string; deletedAt: Date | null }>(
  entityType: AuditEntity,
  rows: T[],
): Promise<(Omit<T, 'deletedAt'> & TrashedRecordMeta)[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const entries = await prismaUnfiltered.auditLog.findMany({
    where: { entityType, entityId: { in: ids } },
    orderBy: { timestamp: 'desc' },
    select: { entityId: true, performedByName: true, timestamp: true },
  });
  const latestByEntity = new Map<string, { performedByName: string; timestamp: Date }>();
  for (const entry of entries) {
    if (!latestByEntity.has(entry.entityId)) latestByEntity.set(entry.entityId, entry);
  }
  return rows.map((row) => {
    const latest = latestByEntity.get(row.id);
    const { deletedAt, ...rest } = row;
    return {
      ...rest,
      deletedAt: (deletedAt ?? latest?.timestamp ?? new Date()).toISOString(),
      deletedByName: latest?.performedByName ?? 'غير معروف',
    } as Omit<T, 'deletedAt'> & TrashedRecordMeta;
  });
}
