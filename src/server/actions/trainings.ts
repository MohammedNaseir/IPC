'use server';

import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireActionCentral, requireActionUser } from '@/server/auth/session';
import { assertHospitalAccess, hospitalScope } from '@/server/auth/scope';
import { logAudit } from '@/server/audit';
import { readOptionalFile, readRequiredFile, storeUpload } from '@/server/files';
import { parseAttendanceInput, replaceAttendance } from '@/server/attendance/input';
import { parseAttendanceSheet } from '@/server/attendance/import';
import { runAction } from '@/server/run-action';
import { NotFoundError, ValidationError } from '@/server/errors';
import { dateSchema, formString, idSchema, optionalText, requiredText } from '@/server/validation';

const templateSchema = z.object({
  title: requiredText('عنوان الدورة', 300),
  description: requiredText('وصف الدورة', 10_000),
  dueDate: dateSchema('الموعد النهائي'),
});

export async function createTrainingTemplate(input: z.input<typeof templateSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const data = templateSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const template = await tx.trainingTemplate.create({ data });
      const hospitals = await tx.hospital.findMany({ select: { id: true } });
      // FR-17/18: distribute a blank copy to every hospital.
      if (hospitals.length > 0) {
        await tx.training.createMany({
          data: hospitals.map((h) => ({
            templateId: template.id,
            hospitalId: h.id,
            title: template.title,
            description: template.description,
          })),
        });
      }
      await logAudit(
        tx,
        actor,
        'Training',
        template.id,
        `إنشاء قالب تدريبي مركزي وتوزيعه على ${hospitals.length} مستشفى: ${template.title}`,
      );
    });

    return null;
  });
}

const internalTrainingSchema = z.object({
  hospitalId: idSchema,
  title: requiredText('عنوان التدريب', 300),
  description: requiredText('تفاصيل التدريب', 10_000),
  date: dateSchema('تاريخ التنفيذ'),
  deliveredBy: optionalText(200),
  attendeeCount: z.number().int('عدد المتدربين غير صالح.').min(1, 'عدد المتدربين يجب أن يكون 1 على الأقل.').max(100_000),
});

export async function createInternalTraining(input: z.input<typeof internalTrainingSchema>) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const data = internalTrainingSchema.parse(input);
    assertHospitalAccess(actor, data.hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');

      const training = await tx.training.create({
        data: {
          hospitalId: data.hospitalId,
          title: data.title,
          description: data.description,
          date: data.date,
          deliveredBy: data.deliveredBy,
          status: 'completed',
          attendances: { create: { headcount: data.attendeeCount } },
        },
      });
      await logAudit(tx, actor, 'Training', training.id, `تسجيل تدريب داخلي مستقل: ${training.title}`);
    });

    return null;
  });
}

export async function recordTrainingExecution(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const trainingId = idSchema.parse(formString(formData, 'trainingId'));
    const date = dateSchema('تاريخ إقامة الدورة').parse(formString(formData, 'date'));
    const deliveredBy = requiredText('اسم المدرب', 200).parse(formString(formData, 'deliveredBy'));
    const notes = optionalText(10_000).parse(formString(formData, 'notes'));
    const attendance = parseAttendanceInput(formData);
    const photo = readOptionalFile(formData, 'photo');

    await prisma.$transaction(async (tx) => {
      const training = await tx.training.findFirst({
        where: { id: trainingId, ...hospitalScope(actor) },
        select: { id: true, hospitalId: true, title: true },
      });
      if (!training) throw new NotFoundError('التدريب غير موجود أو لا تملك صلاحية الوصول إليه.');

      const attendees = await replaceAttendance(tx, training.id, attendance);

      await tx.training.update({
        where: { id: training.id },
        data: { date, deliveredBy, notes, status: 'completed' },
      });

      if (photo) {
        const fileId = await storeUpload(tx, photo, { hospitalId: training.hospitalId, uploadedById: actor.id });
        await tx.trainingAttachment.create({ data: { trainingId: training.id, fileId } });
      }

      const how = attendance.mode === 'names' ? 'بأسماء الحاضرين' : 'بإجمالي العدد';
      await logAudit(
        tx,
        actor,
        'Training',
        training.id,
        `توثيق تنفيذ التدريب "${training.title}" ورصد حضور ${attendees} ${how}`,
      );
    });

    return null;
  });
}

export async function importAttendanceNames(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const trainingId = idSchema.parse(formString(formData, 'trainingId'));
    const file = readRequiredFile(formData, 'file');

    // Parsed in memory and discarded: the sheet is a data-entry channel, never a stored document,
    // so the upload allowlist and access rules for StoredFile stay untouched.
    const parsed = await parseAttendanceSheet(file);

    await prisma.$transaction(async (tx) => {
      const training = await tx.training.findFirst({
        where: { id: trainingId, ...hospitalScope(actor) },
        select: { id: true, title: true },
      });
      if (!training) throw new NotFoundError('التدريب غير موجود أو لا تملك صلاحية الوصول إليه.');

      await replaceAttendance(tx, training.id, { mode: 'names', names: parsed.names });
      await logAudit(
        tx,
        actor,
        'Training',
        training.id,
        `استيراد ${parsed.names.length} اسم حاضر للتدريب "${training.title}" من ملف ${file.name}`,
      );
    });

    return parsed.summary;
  });
}
