import 'server-only';
import { prisma, prismaUnfiltered } from '@/server/db';
import type { AuditLogDTO, SessionUser, VisitDTO, VisitStatus, TrashedVisitDTO } from '@/lib/types';
import { hospitalScope } from '@/server/auth/scope';
import { fileRefSelect, iso, toFileRef } from '@/server/queries/mappers';
import { attachTrashMeta } from '@/server/queries/trash';

// One include shape and one mapper, shared by the list query and the single-record fetch. Two copies of
// this mapping would drift, and a record that reads differently on its own page than it does in the list
// is the bug the full-page migration must not introduce.
const visitInclude = {
  hospital: { select: { name: true } },
  reportFile: { select: fileRefSelect },
  attachments: { orderBy: { uploadedAt: 'asc' }, include: { file: { select: fileRefSelect } } },
  responses: { orderBy: { respondedAt: 'asc' }, include: { attachment: { select: fileRefSelect } } },
} as const;

type StoredFileRow = { id: string; name: string; mimeType: string; size: number };

// Structurally typed rather than derived from a Prisma payload generic, matching how `toFileRef` in
// mappers.ts is written: the row a query returns carries more fields than this, and that is fine.
interface VisitRow {
  id: string;
  hospitalId: string;
  hospital: { name: string };
  visitDate: Date;
  team: string;
  details: string;
  reportFile: StoredFileRow | null;
  status: VisitStatus;
  complianceScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  attachments: Array<{ id: string; uploadedAt: Date; file: StoredFileRow }>;
  responses: Array<{
    id: string;
    note: string;
    attachment: StoredFileRow | null;
    respondentName: string;
    respondedAt: Date;
  }>;
}

function toVisitDTO(v: VisitRow): VisitDTO {
  return {
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
  };
}

function toAuditLogDTO(l: {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedByName: string;
  timestamp: Date;
}): AuditLogDTO {
  return {
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    performedBy: l.performedByName,
    timestamp: iso(l.timestamp),
  };
}

export async function listVisits(user: SessionUser): Promise<VisitDTO[]> {
  const rows = await prisma.visit.findMany({
    where: hospitalScope(user),
    orderBy: { visitDate: 'desc' },
    include: visitInclude,
  });
  return rows.map(toVisitDTO);
}

/**
 * One visit, resolved with the caller's scope inside the `where` clause.
 *
 * Returns `null` when the visit does not exist **or** when it is outside the caller's scope. The caller
 * cannot tell which, and must not try: that indistinguishability is what stops a per-record address
 * becoming an oracle for whether another hospital's visit exists (FR-007).
 */
export async function findVisitForUser(user: SessionUser, visitId: string): Promise<VisitDTO | null> {
  const row = await prisma.visit.findFirst({
    where: { id: visitId, ...hospitalScope(user) },
    include: visitInclude,
  });
  return row ? toVisitDTO(row) : null;
}

/**
 * Does this visit exist *and* belong to the caller's scope? Used by the record route's layout purely to
 * settle the HTTP status before anything is flushed (research.md R-012).
 *
 * **This is not the authorization check.** The page performs its own full scoped fetch and its own
 * `notFound()`; removing this function must not open a hole, and it is never the only thing standing
 * between a coordinator and another hospital's record.
 */
export async function visitExistsForUser(user: SessionUser, visitId: string): Promise<boolean> {
  const row = await prisma.visit.findFirst({
    where: { id: visitId, ...hospitalScope(user) },
    select: { id: true },
  });
  return row !== null;
}

// Trash listing (005-soft-delete, US3). Central-only by convention. A simpler shape than VisitDTO
// -- the trash view is a list to restore from, not a full record view, so it doesn't need
// attachments/responses.
export async function listTrashedVisits(): Promise<TrashedVisitDTO[]> {
  const rows = await prismaUnfiltered.visit.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return attachTrashMeta(
    'Visit',
    rows.map((v) => ({
      id: v.id,
      hospitalId: v.hospitalId,
      hospitalName: v.hospital.name,
      visitDate: iso(v.visitDate),
      team: v.team,
      deletedAt: v.deletedAt,
    })),
  );
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
  return rows.map(toAuditLogDTO);
}

/**
 * The audit trail for one visit. The visit's own scope is confirmed first, so this can never return
 * entries for a visit the caller may not see — and an empty list is returned rather than an error,
 * because the page has already refused the request in that case.
 */
export async function listAuditLogsForVisit(user: SessionUser, visitId: string): Promise<AuditLogDTO[]> {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, ...hospitalScope(user) },
    select: { id: true },
  });
  if (!visit) return [];

  const rows = await prisma.auditLog.findMany({
    where: { entityType: 'Visit', entityId: visit.id },
    orderBy: { timestamp: 'desc' },
  });
  return rows.map(toAuditLogDTO);
}
