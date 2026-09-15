'use server';

import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireActionUser } from '@/server/auth/session';
import { assertHospitalAccess, hospitalScope } from '@/server/auth/scope';
import { logAudit } from '@/server/audit';
import { runAction } from '@/server/run-action';
import { NotFoundError } from '@/server/errors';
import { idSchema, optionalDateSchema, optionalText, requiredText } from '@/server/validation';

const equipmentSchema = z.object({
  hospitalId: idSchema,
  name: requiredText('اسم الجهاز', 200),
  type: requiredText('نوع الجهاز', 200),
  serialNumber: optionalText(100),
  status: optionalText(100),
  lastMaintenance: optionalDateSchema('تاريخ آخر صيانة'),
});

export async function createEquipment(input: z.input<typeof equipmentSchema>) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const data = equipmentSchema.parse(input);
    assertHospitalAccess(actor, data.hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');
      const equipment = await tx.equipment.create({ data });
      await logAudit(tx, actor, 'Equipment', equipment.id, `إضافة جهاز مكافحة عدوى: ${equipment.name}`);
    });

    return null;
  });
}

export async function updateEquipment(equipmentId: string, input: z.input<typeof equipmentSchema>) {
  return runAction(async () => {
    const actor = await requireActionUser();
    const id = idSchema.parse(equipmentId);
    const data = equipmentSchema.parse(input);
    assertHospitalAccess(actor, data.hospitalId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.equipment.findFirst({ where: { id, ...hospitalScope(actor) }, select: { id: true } });
      if (!existing) throw new NotFoundError();
      if (actor.role === 'central') {
        const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } });
        if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');
      }
      await tx.equipment.update({ where: { id }, data });
      await logAudit(tx, actor, 'Equipment', id, `تعديل بيانات جهاز مكافحة عدوى: ${data.name}`);
    });

    return null;
  });
}
