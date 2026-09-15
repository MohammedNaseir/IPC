import 'server-only';
import { prisma } from '@/server/db';
import type { AuditLogDTO, NotificationDTO, SessionUser } from '@/lib/types';
import { iso } from '@/server/queries/mappers';

const AUDIT_PAGE_SIZE = 500;

export async function listNotifications(user: SessionUser): Promise<NotificationDTO[]> {
  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    link: n.link,
    isRead: n.isRead,
    createdAt: iso(n.createdAt),
  }));
}

// Central-only screen; the page guard enforces the role.
export async function listRecentAuditLogs(): Promise<AuditLogDTO[]> {
  const rows = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: AUDIT_PAGE_SIZE });
  return rows.map((l) => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    performedBy: l.performedByName,
    timestamp: iso(l.timestamp),
  }));
}
