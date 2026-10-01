'use server';

import { z } from 'zod';
import { prisma, prismaUnfiltered } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { NotFoundError } from '@/server/errors';
import { formString, idSchema, requiredText } from '@/server/validation';

export async function createPolicy(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const title = requiredText('عنوان الوثيقة', 300).parse(formString(formData, 'title'));
    const category = z
      .enum(['policy', 'procedure', 'form'], { error: 'تصنيف الوثيقة غير صالح.' })
      .parse(formString(formData, 'category'));
    const version = requiredText('رقم الإصدار', 20).catch('1.0').parse(formString(formData, 'version'));
    const file = readRequiredFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const fileId = await storeUpload(tx, file, { hospitalId: null, uploadedById: actor.id });
      const policy = await tx.policy.create({ data: { title, category, version, fileId } });
      await logAudit(tx, actor, 'Policy', policy.id, `رفع وثيقة في مكتبة السياسات: ${title}`);
      await notifyAllActiveUsers(
        tx,
        { type: 'new_document', message: `تم رفع وثيقة جديدة في مكتبة السياسات: "${title}"`, link: '/policies', entityId: policy.id },
        actor.id,
      );
    });

    return null;
  });
}

// Soft delete (005-soft-delete, US2). Central-only, matching createPolicy -- there is no edit
// permission to mirror here, so the gate is just requireActionCentral.
export async function deletePolicy(policyId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(policyId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.policy.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();
      await tx.policy.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'Policy', id, `حذف وثيقة من مكتبة السياسات: ${existing.title}`);
    });

    return null;
  });
}

export async function restorePolicy(policyId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(policyId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.policy.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.policy.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'Policy', id, `استعادة وثيقة في مكتبة السياسات: ${existing.title}`);
    });

    return null;
  });
}
