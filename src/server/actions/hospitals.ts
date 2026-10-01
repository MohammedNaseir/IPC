'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { prisma, prismaUnfiltered, type ExtendedTransactionClient } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import type { SessionUser } from '@/lib/types';
import { hashPassword } from '@/server/auth/password';
import { logAudit } from '@/server/audit';
import { runAction } from '@/server/run-action';
import { NotFoundError, ValidationError } from '@/server/errors';
import { emailSchema, idSchema, optionalText, requiredText } from '@/server/validation';

// Soft delete (005-soft-delete, US6/R-008). Reusable so a future central-account delete path (none
// exists in the UI today -- central accounts are only ever created via scripts/create-admin.ts)
// gets the same guard without rewriting it; for a coordinator target these simply never trigger,
// since a coordinator is never central.
async function assertDeletableAccount(tx: ExtendedTransactionClient, actor: SessionUser, targetId: string) {
  if (targetId === actor.id) throw new ValidationError('لا يمكنك حذف حسابك الخاص.');
  const target = await tx.user.findUnique({ where: { id: targetId }, select: { role: true } });
  if (target?.role === 'central') {
    const remainingCentral = await tx.user.count({ where: { role: 'central', id: { not: targetId } } });
    if (remainingCentral === 0) throw new ValidationError('لا يمكن حذف آخر حساب للإدارة المركزية في النظام.');
  }
}

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
      const hospital = await tx.hospital.findUnique({ where: { id } });
      if (!hospital) throw new NotFoundError();

      await tx.hospital.update({
        where: { id },
        data: { name: data.name, location: data.location, type: data.type },
      });

      // Soft delete (005-soft-delete, US6/R-005): a top-level, correctly-filtered query -- a nested
      // `include: { coordinator: true }` is not covered by the extension's read-filtering and would
      // still see a soft-deleted coordinator (confirmed in testing), which would then try to update
      // a deleted account instead of correctly reporting "no active coordinator".
      const coordinator = await tx.user.findFirst({ where: { hospitalId: id } });

      const coordinatorEmail = data.coordinatorEmail || null;
      if (coordinator) {
        const emailChanged = coordinatorEmail !== null && coordinatorEmail !== coordinator.email;
        await tx.user.update({
          where: { id: coordinator.id },
          data: {
            name: data.coordinatorName ?? coordinator.name,
            email: coordinatorEmail ?? coordinator.email,
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
      const hospital = await tx.hospital.findUnique({ where: { id: data.hospitalId }, select: { name: true } });
      if (!hospital) throw new NotFoundError('المستشفى المحدد غير موجود.');

      // Soft delete (005-soft-delete, US6/R-005): a nested `include`/`select` relation fetch (e.g.
      // `hospital.findUnique({ select: { coordinator: {...} } })`) is NOT covered by the extension's
      // read-filtering -- only a top-level `model.operation()` call is (confirmed in testing: the
      // nested form kept seeing a soft-deleted coordinator and blocked a replacement from ever being
      // created). The "does an active coordinator already exist" check is therefore a top-level,
      // correctly-filtered query on `tx.user`, not a read through the `hospital` relation.
      const activeCoordinator = await tx.user.findFirst({ where: { hospitalId: data.hospitalId }, select: { id: true } });
      if (activeCoordinator) throw new ValidationError('يوجد منسق معتمد لهذا المستشفى بالفعل (منسق واحد لكل مستشفى).');

      // hospitalId stays @unique at the schema level (see research.md R-005 for why removing it was
      // rejected), so a soft-deleted coordinator can still physically occupy the slot even though
      // the check above correctly found no *active* one. Free it explicitly, through the unfiltered
      // accessor, right before creating the replacement -- lazily, only when actually needed.
      const occupant = await prismaUnfiltered.user.findUnique({ where: { hospitalId: data.hospitalId } });
      if (occupant && occupant.deletedAt !== null) {
        await tx.user.update({ where: { id: occupant.id }, data: { hospitalId: null } });
      }

      const user = await tx.user.create({
        data: { email: data.email, name: data.name, role: 'hospital', hospitalId: data.hospitalId, passwordHash },
      });
      await logAudit(tx, actor, 'Hospital', data.hospitalId, `اعتماد منسق مستشفى ${hospital.name}: ${user.email}`);
    });

    return null;
  });
}

// Soft delete (005-soft-delete, US6). Central-only -- coordinator accounts are central-managed.
export async function deleteCoordinator(userId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(userId);

    await prisma.$transaction(async (tx) => {
      await assertDeletableAccount(tx, actor, id);
      const existing = await tx.user.findFirst({ where: { id, role: 'hospital' } });
      if (!existing) throw new NotFoundError();
      // entityType 'User' with the coordinator's own id, not 'Hospital' as the existing creation
      // log uses -- the trash view's removed-by/removed-on lookup needs this row findable by its
      // own identity (contracts/soft-delete.md).
      await tx.user.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'User', id, `حذف حساب منسق: ${existing.email}`);
    });

    return null;
  });
}

export async function restoreCoordinator(userId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(userId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.user.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.user.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'User', id, `استعادة حساب منسق: ${existing.email}`);
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

// Soft delete (005-soft-delete, US4). The first cascading case: deleting a Hospital also deletes
// its coordinator and every Practitioner/Equipment/Training/non-completed-Visit scoped to it, all
// sharing one deletionEventId so restoring the hospital restores exactly this set (research.md
// R-002, spec FR-009/FR-010). Every child row is gathered via a separate, top-level, correctly-
// filtered query (research.md R-010) -- not a nested include -- and the completed-Visit exception
// is enforced twice over: once by this query's own `status: { not: 'completed' }` filter, and again
// by the extension's own where-augmentation on the `updateMany` call itself (research.md R-004).
export async function deleteHospital(hospitalId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.findUnique({ where: { id } });
      if (!hospital) throw new NotFoundError();

      const deletionEventId = randomUUID();
      const deletedAt = new Date();

      const [coordinator, practitioners, equipments, trainings, visits] = await Promise.all([
        tx.user.findFirst({ where: { hospitalId: id } }),
        tx.practitioner.findMany({ where: { hospitalId: id }, select: { id: true, name: true } }),
        tx.equipment.findMany({ where: { hospitalId: id }, select: { id: true, name: true } }),
        tx.training.findMany({ where: { hospitalId: id }, select: { id: true, title: true } }),
        tx.visit.findMany({ where: { hospitalId: id, status: { not: 'completed' } }, select: { id: true, team: true } }),
      ]);

      await tx.hospital.update({ where: { id }, data: { deletedAt, deletionEventId } });
      await logAudit(tx, actor, 'Hospital', id, `حذف مستشفى: ${hospital.name}`);

      if (coordinator) {
        await tx.user.update({ where: { id: coordinator.id }, data: { deletedAt, deletionEventId } });
        await logAudit(tx, actor, 'User', coordinator.id, `حذف حساب منسق ضمن حذف مستشفى ${hospital.name}: ${coordinator.email}`);
      }
      if (practitioners.length > 0) {
        await tx.practitioner.updateMany({ where: { id: { in: practitioners.map((p) => p.id) } }, data: { deletedAt, deletionEventId } });
        for (const p of practitioners) await logAudit(tx, actor, 'Practitioner', p.id, `حذف ممارس ضمن حذف مستشفى ${hospital.name}: ${p.name}`);
      }
      if (equipments.length > 0) {
        await tx.equipment.updateMany({ where: { id: { in: equipments.map((e) => e.id) } }, data: { deletedAt, deletionEventId } });
        for (const e of equipments) await logAudit(tx, actor, 'Equipment', e.id, `حذف جهاز ضمن حذف مستشفى ${hospital.name}: ${e.name}`);
      }
      if (trainings.length > 0) {
        await tx.training.updateMany({ where: { id: { in: trainings.map((t) => t.id) } }, data: { deletedAt, deletionEventId } });
        for (const t of trainings) await logAudit(tx, actor, 'Training', t.id, `حذف تدريب ضمن حذف مستشفى ${hospital.name}: ${t.title}`);
      }
      if (visits.length > 0) {
        // The extension's own where-augmentation (research.md R-004) re-excludes any completed
        // visit from this updateMany independently of the `status: { not: 'completed' }` filter
        // already applied above -- belt-and-suspenders, same as every other write path to Visit.
        await tx.visit.updateMany({ where: { id: { in: visits.map((v) => v.id) } }, data: { deletedAt, deletionEventId } });
        for (const v of visits) await logAudit(tx, actor, 'Visit', v.id, `حذف زيارة ضمن حذف مستشفى ${hospital.name}`);
      }
    });

    return null;
  });
}

export async function restoreHospital(hospitalId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(hospitalId);

    await prisma.$transaction(async (tx) => {
      const hospital = await prismaUnfiltered.hospital.findUnique({ where: { id } });
      if (!hospital || hospital.deletedAt === null) throw new NotFoundError();
      const eventId = hospital.deletionEventId;

      await tx.hospital.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'Hospital', id, `استعادة مستشفى: ${hospital.name}`);

      if (!eventId) return; // nothing was cascaded with this particular deletion

      // Restore exactly the set that shares this hospital's own deletionEventId -- not every
      // deleted row scoped to the hospital, so a sibling deleted independently, before or after,
      // stays deleted (spec FR-010, User Story 4 Scenario 3).
      const [coordinator, practitioners, equipments, trainings, visits] = await Promise.all([
        prismaUnfiltered.user.findFirst({ where: { deletionEventId: eventId, role: 'hospital' } }),
        prismaUnfiltered.practitioner.findMany({ where: { deletionEventId: eventId } }),
        prismaUnfiltered.equipment.findMany({ where: { deletionEventId: eventId } }),
        prismaUnfiltered.training.findMany({ where: { deletionEventId: eventId } }),
        prismaUnfiltered.visit.findMany({ where: { deletionEventId: eventId } }),
      ]);

      if (coordinator) {
        await tx.user.update({ where: { id: coordinator.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'User', coordinator.id, `استعادة حساب منسق ضمن استعادة مستشفى ${hospital.name}: ${coordinator.email}`);
      }
      for (const p of practitioners) {
        await tx.practitioner.update({ where: { id: p.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Practitioner', p.id, `استعادة ممارس ضمن استعادة مستشفى ${hospital.name}: ${p.name}`);
      }
      for (const e of equipments) {
        await tx.equipment.update({ where: { id: e.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Equipment', e.id, `استعادة جهاز ضمن استعادة مستشفى ${hospital.name}: ${e.name}`);
      }
      for (const t of trainings) {
        await tx.training.update({ where: { id: t.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Training', t.id, `استعادة تدريب ضمن استعادة مستشفى ${hospital.name}: ${t.title}`);
      }
      for (const v of visits) {
        await tx.visit.update({ where: { id: v.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Visit', v.id, `استعادة زيارة ضمن استعادة مستشفى ${hospital.name}`);
      }
    });

    return null;
  });
}
