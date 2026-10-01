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

export async function createOrgDocument(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const title = requiredText('عنوان الوثيقة', 300).parse(formString(formData, 'title'));
    const type = z
      .enum(['org_structure', 'job_description'], { error: 'نوع الوثيقة غير صالح.' })
      .parse(formString(formData, 'type'));
    const file = readRequiredFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const fileId = await storeUpload(tx, file, { hospitalId: null, uploadedById: actor.id });
      const doc = await tx.orgDocument.create({ data: { title, type, fileId } });
      await logAudit(tx, actor, 'Document', doc.id, `رفع وثيقة تنظيمية: ${title}`);
      await notifyAllActiveUsers(
        tx,
        { type: 'new_document', message: `تم رفع وثيقة تنظيمية جديدة: "${title}"`, link: '/org-docs', entityId: doc.id },
        actor.id,
      );
    });

    return null;
  });
}

// Soft delete (005-soft-delete, US2). Central-only, matching createOrgDocument.
export async function deleteOrgDocument(docId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(docId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.orgDocument.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();
      await tx.orgDocument.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'Document', id, `حذف وثيقة تنظيمية: ${existing.title}`);
    });

    return null;
  });
}

export async function restoreOrgDocument(docId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(docId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.orgDocument.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.orgDocument.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'Document', id, `استعادة وثيقة تنظيمية: ${existing.title}`);
    });

    return null;
  });
}
