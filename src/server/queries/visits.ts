import 'server-only';
import { prisma } from '@/server/db';
import type { AuditLogDTO, SessionUser, VisitDTO } from '@/lib/types';
import { hospitalScope } from '@/server/auth/scope';
import { fileRefSelect, iso, toFileRef } from '@/server/queries/mappers';

export async function listVisits(user: SessionUser): Promise<VisitDTO[]> {
  const rows = await prisma.visit.findMany({
    where: hospitalScope(user),
    orderBy: { visitDate: 'desc' },
    include: {
      hospital: { select: { name: true } },
      reportFile: { select: fileRefSelect },
      attachments: { orderBy: { uploadedAt: 'asc' }, include: { file: { select: fileRefSelect } } },
      responses: { orderBy: { respondedAt: 'asc' }, include: { attachment: { select: fileRefSelect } } },
    },
  });

  return rows.map((v) => ({
    id: v.id,
    hospitalId: v.hospitalId,
    hospitalName: v.hospital.name,
    visitDate: iso(v.visitDate),
    team: v.team,
    details: v.details,
    report: v.reportFile ? toFileRef(v.reportFile) : null,
    status: v.status,
    complianceScore: v.complianceScore,
    createdAt: iso(v.createdAt),
    updatedAt: iso(v.updatedAt),
    attachments: v.attachments.map((a) => ({ id: a.id, file: toFileRef(a.file), uploadedAt: iso(a.uploadedAt) })),
    responses: v.responses.map((r) => ({
      id: r.id,
      note: r.note,
      attachment: r.attachment ? toFileRef(r.attachment) : null,
      respondentName: r.respondentName,
      respondedAt: iso(r.respondedAt),
    })),
  }));
}

// Only returns logs for visits inside the caller's scope.
export async function listVisitAuditLogs(user: SessionUser): Promise<AuditLogDTO[]> {
  const visitIds = (
    await prisma.visit.findMany({ where: hospitalScope(user), select: { id: true } })
  ).map((v) => v.id);
  if (visitIds.length === 0) return [];

  const rows = await prisma.auditLog.findMany({
    where: { entityType: 'Visit', entityId: { in: visitIds } },
    orderBy: { timestamp: 'desc' },
  });
  return rows.map((l) => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    performedBy: l.performedByName,
    timestamp: iso(l.timestamp),
  }));
}
