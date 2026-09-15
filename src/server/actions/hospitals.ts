'use server';

import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { hashPassword } from '@/server/auth/password';
import { logAudit } from '@/server/audit';
import { runAction } from '@/server/run-action';
import { NotFoundError, ValidationError } from '@/server/errors';
import { emailSchema, idSchema, optionalText, requiredText } from '@/server/validation';

const hospitalFields = {
  name: requiredText('اسم المستشفى', 200),
  location: requiredText('الموقع', 200),
  type: requiredText('نوع المنشأة', 100),
};

const createHospitalSchema = z.object({
  ...hospitalFields,
  coordinatorName: optionalText(200),
  coordinatorEmail: z.union([z.literal(''), emailSchema]).optional().nullable(),
  coordinatorPassword: z.string().optional().nullable(),
});

export async function createHospital(input: z.input<typeof createHospitalSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const data = createHospitalSchema.parse(input);

    const coordinatorEmail = data.coordinatorEmail || null;
    let passwordHash: string | null = null;
    if (coordinatorEmail) {
      if (!data.coordinatorName) throw new ValidationError('اسم المنسق مطلوب عند إدخال بريده الإلكتروني.');
      if (!data.coordinatorPassword) throw new ValidationError('كلمة المرور الابتدائية للمنسق مطلوبة.');
      passwordHash = await hashPassword(data.coordinatorPassword);
    }

    const hospital = await prisma.$transaction(async (tx) => {
      const created = await tx.hospital.create({
        data: { name: data.name, location: data.location, type: data.type },
      });

      if (coordinatorEmail && passwordHash) {
        await tx.user.create({
          data: {
            email: coordinatorEmail,
            name: data.coordinatorName!,
            role: 'hospital',
            hospitalId: created.id,
            passwordHash,
          },
        });
      }

      // FR-18: every existing central template gets a blank copy for the new hospital.
      const templates = await tx.trainingTemplate.findMany({ select: { id: true, title: true, description: true } });
      if (templates.length > 0) {
        await tx.training.createMany({
          data: templates.map((t) => ({
            templateId: t.id,
            hospitalId: created.id,
            title: t.title,
            description: t.description,
          })),
        });
      }

      await logAudit(tx, actor, 'Hospital', created.id, `إضافة مستشفى جديد: ${created.name}`);
      if (coordinatorEmail) {
        await logAudit(tx, actor, 'Hospital', created.id, `إنشاء حساب منسق المستشفى: ${coordinatorEmail}`);
      }
      return created;
    });

    return { id: hospital.id };
  });
}

const updateHospitalSchema = z.object({
  ...hospitalFields,
  coordinatorName: optionalText(200),
  coordinatorEmail: z.union([z.literal(''), emailSchema]).optional().nullable(),
});

export async function updateHospital(hospitalId: string, input: z.input<typeof updateHospitalSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(hospitalId);
    const data = updateHospitalSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id }, include: { coordinator: true } });
      if (!hospital) throw new NotFoundError();

      await tx.hospital.update({
        where: { id },
        data: { name: data.name, location: data.location, type: data.type },
      });

      const coordinatorEmail = data.coordinatorEmail || null;
      if (hospital.coordinator) {
        const emailChanged = coordinatorEmail !== null && coordinatorEmail !== hospital.coordinator.email;
        await tx.user.update({
          where: { id: hospital.coordinator.id },
          data: {
            name: data.coordinatorName ?? hospital.coordinator.name,
            email: coordinatorEmail ?? hospital.coordinator.email,
            sessionVersion: emailChanged ? { increment: 1 } : undefined,
          },
        });
      } else if (coordinatorEmail) {
        throw new ValidationError('لا يوجد حساب منسق لهذا المستشفى. استخدم "إضافة منسق مستشفى جديد" لإنشاء الحساب بكلمة مرور.');
      }

      await logAudit(tx, actor, 'Hospital', id, `تعديل بيانات المستشفى: ${data.name}`);
    });

    return null;
  });
}

export async function toggleHospitalStatus(hospitalId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id }, select: { isActive: true, name: true } });
      if (!hospital) throw new NotFoundError();
      await tx.hospital.update({ where: { id }, data: { isActive: !hospital.isActive } });
      await logAudit(
        tx,
        actor,
        'Hospital',
        id,
        `${hospital.isActive ? 'تعطيل' : 'تفعيل'} المستشفى: ${hospital.name}`,
      );
    });

    return null;
  });
}

const addCoordinatorSchema = z.object({
  hospitalId: idSchema,
  name: requiredText('اسم المنسق', 200),
  email: emailSchema,
  password: z.string({ error: 'كلمة المرور مطلوبة.' }),
});

export async function addCoordinator(input: z.input<typeof addCoordinatorSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const data = addCoordinatorSchema.parse(input);
    const passwordHash = await hashPassword(data.password);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({
        where: { id: data.hospitalId },
        select: { name: true, coordinator: { select: { id: true } } },
      });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');
      if (hospital.coordinator) throw new ValidationError('يوجد منسق معتمد لهذا المستشفى بالفعل (منسق واحد لكل مستشفى).');

      const user = await tx.user.create({
        data: { email: data.email, name: data.name, role: 'hospital', hospitalId: data.hospitalId, passwordHash },
      });
      await logAudit(tx, actor, 'Hospital', data.hospitalId, `اعتماد منسق مستشفى ${hospital.name}: ${user.email}`);
    });

    return null;
  });
}

const updateCoordinatorSchema = z.object({
  name: requiredText('اسم المنسق', 200),
  email: emailSchema,
  newPassword: z.string().optional().nullable(),
});

export async function updateCoordinator(userId: string, input: z.input<typeof updateCoordinatorSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(userId);
    const data = updateCoordinatorSchema.parse(input);
    const passwordHash = data.newPassword ? await hashPassword(data.newPassword) : null;

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id }, select: { role: true, email: true, hospitalId: true } });
      if (!user || user.role !== 'hospital' || !user.hospitalId) throw new NotFoundError();

      const credentialsChanged = passwordHash !== null || data.email !== user.email;
      await tx.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          passwordHash: passwordHash ?? undefined,
          sessionVersion: credentialsChanged ? { increment: 1 } : undefined,
        },
      });
      await logAudit(
        tx,
        actor,
        'Hospital',
        user.hospitalId,
        passwordHash ? `تحديث بيانات المنسق وإعادة تعيين كلمة المرور: ${data.email}` : `تحديث بيانات المنسق: ${data.email}`,
      );
    });

    return null;
  });
}
