import 'server-only';
import { prisma } from '@/server/db';
import type { SessionUser, TrainingDTO, TrainingStatus } from '@/lib/types';
import { hospitalScope } from '@/server/auth/scope';
import { fileRefSelect, iso, toFileRef } from '@/server/queries/mappers';

// FR-22: a required (template) training that is not completed past its due date is late.
export function deriveTrainingStatus(stored: TrainingStatus, dueDate: Date | null, now = new Date()): TrainingStatus {
  if (stored === 'completed') return 'completed';
  if (dueDate && dueDate < now) return 'late';
  return 'pending';
}

export async function listTrainings(user: SessionUser): Promise<TrainingDTO[]> {
  const rows = await prisma.training.findMany({
    where: hospitalScope(user),
    orderBy: { createdAt: 'desc' },
    include: {
      hospital: { select: { name: true } },
      template: { select: { dueDate: true } },
      attendances: { select: { practitionerId: true, headcount: true } },
      attachments: { orderBy: { uploadedAt: 'asc' }, include: { file: { select: fileRefSelect } } },
    },
  });

  const now = new Date();
  return rows.map((t) => {
    const attendeePractitionerIds = t.attendances
      .map((a) => a.practitionerId)
      .filter((id): id is string => id !== null);
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
      attendeeCount: attendeePractitionerIds.length + headcount,
      attendeePractitionerIds,
      attachments: t.attachments.map((a) => ({ id: a.id, file: toFileRef(a.file), uploadedAt: iso(a.uploadedAt) })),
      createdAt: iso(t.createdAt),
    };
  });
}
