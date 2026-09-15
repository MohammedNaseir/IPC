'use server';

import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { requireActionCentral, requireActionUser } from '@/server/auth/session';
import { hospitalScope } from '@/server/auth/scope';
import type { SessionUser } from '@/lib/types';
import { logAudit } from '@/server/audit';
import { notifyHospitalCoordinator } from '@/server/notify';
import { readOptionalFile, readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { NotFoundError, ValidationError } from '@/server/errors';
import { dateSchema, formString, idSchema, requiredText } from '@/server/validation';

// Loads a visit the caller may act on and refuses writes once it is archived (FR-15).
async function loadOpenVisit(tx: Prisma.TransactionClient, user: SessionUser, visitId: string) {
  const visit = await tx.visit.findFirst({
    where: { id: visitId, ...hospitalScope(user) },
    select: { id: true, hospitalId: true, status: true },
  });
  if (!visit) throw new NotFoundError('الزيارة غير موجودة أو لا تملك صلاحية الوصول إليها.');
  if (visit.status === 'completed') throw new ValidationError('الزيارة مكتملة ومؤرشفة ولا تقبل أي تعديل.');
  return visit;
}

const createVisitSchema = z.object({
  hospitalId: idSchema,
  visitDate: dateSchema('تاريخ الزيارة'),
  team: requiredText('الفريق الزائر', 500),
  details: requiredText('تفاصيل الزيارة', 10_000),
  complianceScore: z
    .number()
    .min(0, 'نسبة الامتثال يجب أن تكون بين 0 و 100.')
    .max(100, 'نسبة الامتثال يجب أن تكون بين 0 و 100.')
    .nullable()
    .optional(),
});

export async function createVisit(input: z.input<typeof createVisitSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const data = createVisitSchema.parse(input);

    const visit = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { name: true } });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');

      const created = await tx.visit.create({
        data: {
          hospitalId: data.hospitalId,
          visitDate: data.visitDate,
          team: data.team,
          details: data.details,
          complianceScore: data.complianceScore ?? null,
        },
      });
      await logAudit(tx, actor, 'Visit', created.id, `إنشاء زيارة رقابية لمستشفى ${hospital.name}`);
      await notifyHospitalCoordinator(tx, data.hospitalId, {
        type: 'visit_upcoming',
        message: `تمت جدولة زيارة رقابية لمستشفاكم بتاريخ ${data.visitDate.toLocaleDateString('ar-SA')}`,
        link: '/visits',
        entityId: created.id,
      });
      return created;
    });

    return { id: visit.id };
  });
}

export async function uploadVisitReport(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const visitId = idSchema.parse(formString(formData, 'visitId'));
    const file = readRequiredFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const visit = await loadOpenVisit(tx, actor, visitId);
      const fileId = await storeUpload(tx, file, { hospitalId: visit.hospitalId, uploadedById: actor.id });
      await tx.visit.update({ where: { id: visit.id }, data: { reportFileId: fileId } });
      await logAudit(tx, actor, 'Visit', visit.id, `رفع تقرير الزيارة الرسمي: ${file.name}`);
    });

    return null;
  });
}

export async function addVisitAttachment(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const visitId = idSchema.parse(formString(formData, 'visitId'));
    const file = readRequiredFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const visit = await loadOpenVisit(tx, actor, visitId);
      const fileId = await storeUpload(tx, file, { hospitalId: visit.hospitalId, uploadedById: actor.id });
      await tx.visitAttachment.create({ data: { visitId: visit.id, fileId } });
      await logAudit(tx, actor, 'Visit', visit.id, `إرفاق ملف/صورة بالزيارة: ${file.name}`);
    });

    return null;
  });
}

export async function addVisitResponse(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const visitId = idSchema.parse(formString(formData, 'visitId'));
    const note = requiredText('نص الرد', 10_000).parse(formString(formData, 'note'));
    const file = readOptionalFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const visit = await loadOpenVisit(tx, actor, visitId);
      const attachmentFileId = file
        ? await storeUpload(tx, file, { hospitalId: visit.hospitalId, uploadedById: actor.id })
        : null;
      await tx.visitResponse.create({
        data: { visitId: visit.id, note, attachmentFileId, respondentName: actor.name },
      });
      await logAudit(tx, actor, 'Visit', visit.id, 'إضافة رد وتحديث على ملف الزيارة');
    });

    return null;
  });
}

export async function completeVisit(visitId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(visitId);

    await prisma.$transaction(async (tx) => {
      const visit = await loadOpenVisit(tx, actor, id);
      await tx.visit.update({ where: { id: visit.id }, data: { status: 'completed' } });
      await logAudit(tx, actor, 'Visit', visit.id, 'اعتماد الزيارة وتغيير الحالة إلى "مكتمل" وأرشفتها');
    });

    return null;
  });
}
