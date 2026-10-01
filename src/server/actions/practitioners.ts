'use server';

import { z } from 'zod';
import { prisma, prismaUnfiltered } from '@/server/db';
import { requireActionCentral, requireActionUser } from '@/server/auth/session';
import { assertHospitalAccess, hospitalScope } from '@/server/auth/scope';
import { logAudit } from '@/server/audit';
import { runAction } from '@/server/run-action';
import { NotFoundError } from '@/server/errors';
import { idSchema, optionalText, requiredText } from '@/server/validation';

const practitionerSchema = z.object({
  hospitalId: idSchema,
  name: requiredText('اسم الممارس', 200),
  role: requiredText('المسمى الوظيفي', 200),
  licenseNumber: optionalText(100),
  email: optionalText(254),
  phone: optionalText(50),
});

export async function createPractitioner(input: z.input<typeof practitionerSchema>) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const data = practitionerSchema.parse(input);
    assertHospitalAccess(actor, data.hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');
      const practitioner = await tx.practitioner.create({ data });
      await logAudit(tx, actor, 'Practitioner', practitioner.id, `تسجيل ممارس صحي: ${practitioner.name}`);
    });

    return null;
  });
}

export async function updatePractitioner(practitionerId: string, input: z.input<typeof practitionerSchema>) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const id = idSchema.parse(practitionerId);
    const data = practitionerSchema.parse(input);
    assertHospitalAccess(actor, data.hospitalId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.practitioner.findFirst({ where: { id, ...hospitalScope(actor) }, select: { id: true } });
      if (!existing) throw new NotFoundError();
      if (actor.role === 'central') {
        const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } });
        if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');
      }
      await tx.practitioner.update({ where: { id }, data });
      await logAudit(tx, actor, 'Practitioner', id, `تعديل بيانات ممارس صحي: ${data.name}`);
    });

    return null;
  });
}

// Soft delete (005-soft-delete, US1). Permission mirrors updatePractitioner exactly: the owning
// hospital's coordinator or central.
export async function deletePractitioner(practitionerId: string) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const id = idSchema.parse(practitionerId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.practitioner.findFirst({ where: { id, ...hospitalScope(actor) } });
      if (!existing) throw new NotFoundError();
      await tx.practitioner.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'Practitioner', id, `حذف ممارس صحي: ${existing.name}`);
    });

    return null;
  });
}

// Restore is always central-only, even though delete is not (contracts/soft-delete.md).
export async function restorePractitioner(practitionerId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(practitionerId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.practitioner.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.practitioner.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'Practitioner', id, `استعادة ممارس صحي: ${existing.name}`);
    });

    return null;
  });
}
