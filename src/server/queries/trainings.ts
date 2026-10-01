import 'server-only';
import { prisma, prismaUnfiltered } from '@/server/db';
import type {
  SessionUser,
  TrainingDTO,
  TrainingStatus,
  TrainingTemplateDTO,
  TrashedTrainingDTO,
  TrashedTrainingTemplateDTO,
} from '@/lib/types';
import { hospitalScope } from '@/server/auth/scope';
import { fileRefSelect, iso, toFileRef } from '@/server/queries/mappers';
import { attachTrashMeta } from '@/server/queries/trash';

// FR-22: a required (template) training that is not completed past its due date is late.
export function deriveTrainingStatus(stored: TrainingStatus, dueDate: Date | null, now = new Date()): TrainingStatus {
  if (stored === 'completed') return 'completed';
  if (dueDate && dueDate < now) return 'late';
  return 'pending';
}

// One include shape and one mapper, shared by the list query and the single-record fetch, so the two
// cannot drift apart.
const trainingInclude = {
  hospital: { select: { name: true } },
  template: { select: { dueDate: true } },
  attendances: { select: { attendeeName: true, headcount: true }, orderBy: { id: 'asc' } },
  attachments: { orderBy: { uploadedAt: 'asc' }, include: { file: { select: fileRefSelect } } },
} as const;

type StoredFileRow = { id: string; name: string; mimeType: string; size: number };

interface TrainingRow {
  id: string;
  templateId: string | null;
  hospitalId: string;
  hospital: { name: string };
  title: string;
  description: string;
  deliveredBy: string | null;
  date: Date | null;
  notes: string | null;
  status: TrainingStatus;
  createdAt: Date;
  template: { dueDate: Date } | null;
  attendances: Array<{ attendeeName: string | null; headcount: number | null }>;
  attachments: Array<{ id: string; uploadedAt: Date; file: StoredFileRow }>;
}

function toTrainingDTO(t: TrainingRow, now: Date): TrainingDTO {
  // Attendance is a name list XOR a single headcount row, so exactly one of these contributes.
  const attendeeNames = t.attendances
    .map((a) => a.attendeeName)
    .filter((name): name is string => name !== null);
  const headcount = t.attendances.reduce((sum, a) => sum + (a.headcount ?? 0), 0);
  const dueDate = t.template?.dueDate ?? null;
  return {
    id: t.id,
    templateId: t.templateId,
    isInternal: t.templateId === null,
    hospitalId: t.hospitalId,
    hospitalName: t.hospital.name,
    title: t.title,
    description: t.description,
    deliveredBy: t.deliveredBy,
    date: iso(t.date),
    dueDate: iso(dueDate),
    notes: t.notes,
    status: deriveTrainingStatus(t.status, dueDate, now),
    attendeeCount: attendeeNames.length + headcount,
    attendeeNames,
    attachments: t.attachments.map((a) => ({ id: a.id, file: toFileRef(a.file), uploadedAt: iso(a.uploadedAt) })),
    createdAt: iso(t.createdAt),
  };
}

export async function listTrainings(user: SessionUser): Promise<TrainingDTO[]> {
  const rows = await prisma.training.findMany({
    where: hospitalScope(user),
    orderBy: { createdAt: 'desc' },
    include: trainingInclude,
  });

  const now = new Date();
  return rows.map((t) => toTrainingDTO(t, now));
}

/**
 * One training, resolved with the caller's scope inside the `where` clause.
 *
 * Returns `null` when the training does not exist **or** when it is outside the caller's scope — the
 * same indistinguishability the visit fetcher guarantees, and for the same reason (FR-007).
 */
export async function findTrainingForUser(user: SessionUser, trainingId: string): Promise<TrainingDTO | null> {
  const row = await prisma.training.findFirst({
    where: { id: trainingId, ...hospitalScope(user) },
    include: trainingInclude,
  });
  return row ? toTrainingDTO(row, new Date()) : null;
}

// New, minimal surface (005-soft-delete, US6) -- there was no existing screen listing
// TrainingTemplate master records, needed so a central user has somewhere to delete one from.
export async function listTrainingTemplates(): Promise<TrainingTemplateDTO[]> {
  const rows = await prisma.trainingTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    // Soft delete (005-soft-delete, R-010): a nested `_count` is not covered by the extension's
    // read-filtering, so a deleted Training would otherwise still inflate this count.
    include: { _count: { select: { trainings: { where: { deletedAt: null } } } } },
  });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: iso(t.dueDate),
    trainingCount: t._count.trainings,
    createdAt: iso(t.createdAt),
  }));
}

export async function listTrashedTrainingTemplates(): Promise<TrashedTrainingTemplateDTO[]> {
  const rows = await prismaUnfiltered.trainingTemplate.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
  });
  return attachTrashMeta(
    'TrainingTemplate',
    rows.map((t) => ({ id: t.id, title: t.title, deletedAt: t.deletedAt })),
  );
}

// Trash listing (005-soft-delete, US3). Central-only by convention.
export async function listTrashedTrainings(): Promise<TrashedTrainingDTO[]> {
  const rows = await prismaUnfiltered.training.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    include: { hospital: { select: { name: true } } },
  });
  return attachTrashMeta(
    'Training',
    rows.map((t) => ({
      id: t.id,
      hospitalId: t.hospitalId,
      hospitalName: t.hospital.name,
      title: t.title,
      deletedAt: t.deletedAt,
    })),
  );
}

/**
 * The training equivalent of `visitExistsForUser`: a status-only check for the record route's layout,
 * never the authorization check. The page still resolves the record itself, scoped.
 */
export async function trainingExistsForUser(user: SessionUser, trainingId: string): Promise<boolean> {
  const row = await prisma.training.findFirst({
    where: { id: trainingId, ...hospitalScope(user) },
    select: { id: true },
  });
  return row !== null;
}

