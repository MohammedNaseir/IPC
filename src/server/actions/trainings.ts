'use server';

import { z } from 'zod';
import { prisma, prismaUnfiltered } from '@/server/db';
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
});

export async function createInternalTraining(input: z.input<typeof internalTrainingSchema>) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const data = internalTrainingSchema.parse(input);
    assertHospitalAccess(actor, data.hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');

      // Created pending, with no attendance: the coordinator documents attendance afterward on
      // the record page, by names or by a single total, exactly as a central-template training
      // already works (D-003 in docs/CLAUDE_REFERENCE.md §9). This training can never derive
      // `late` or raise an overdue reminder -- both read a template's dueDate, and an internal
      // training has no template -- which is a recorded, accepted consequence, not a defect here.
      const training = await tx.training.create({
        data: {
          hospitalId: data.hospitalId,
          title: data.title,
          description: data.description,
          date: data.date,
          deliveredBy: data.deliveredBy,
          status: 'pending',
        },
      });
      await logAudit(tx, actor, 'Training', training.id, `إنشاء تدريب داخلي مستقل: ${training.title}`);
    });

    return null;
  });
}

// Soft delete (005-soft-delete, US6). Central-only, matching createTrainingTemplate. Deliberately
// never cascades to the Training rows created from this template (spec FR-012, data-model.md) --
// those are independent historical compliance records regardless of whether the template still
// exists, so this is a plain leaf delete, not a cascade.
export async function deleteTrainingTemplate(templateId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(templateId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.trainingTemplate.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();
      await tx.trainingTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'TrainingTemplate', id, `حذف قالب تدريبي مركزي: ${existing.title}`);
    });

    return null;
  });
}

export async function restoreTrainingTemplate(templateId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(templateId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.trainingTemplate.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.trainingTemplate.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'TrainingTemplate', id, `استعادة قالب تدريبي مركزي: ${existing.title}`);
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

// Soft delete (005-soft-delete, US3). No completed-training exception -- the SRS's immutability
// rule, and spec FR-008's protection, is scoped to a completed Visit only (spec Assumptions).
export async function deleteTraining(trainingId: string) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const id = idSchema.parse(trainingId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.training.findFirst({ where: { id, ...hospitalScope(actor) } });
      if (!existing) throw new NotFoundError('التدريب غير موجود أو لا تملك صلاحية الوصول إليه.');
      await tx.training.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'Training', id, `حذف تدريب: ${existing.title}`);
    });

    return null;
  });
}

export async function restoreTraining(trainingId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(trainingId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.training.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.training.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'Training', id, `استعادة تدريب: ${existing.title}`);
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
