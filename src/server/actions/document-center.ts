'use server';

import { prisma, prismaUnfiltered } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { NotFoundError } from '@/server/errors';
import { formString, idSchema, requiredText } from '@/server/validation';

export async function createDocumentCenterFile(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const title = requiredText('عنوان الملف', 300).parse(formString(formData, 'title'));
    const file = readRequiredFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const fileId = await storeUpload(tx, file, { hospitalId: null, uploadedById: actor.id });
      const doc = await tx.documentCenterFile.create({ data: { title, fileId } });
      await logAudit(tx, actor, 'Document', doc.id, `إضافة ملف لمركز الوثائق العام: ${title}`);
      await notifyAllActiveUsers(
        tx,
        { type: 'new_document', message: `تمت إضافة مستند جديد لمركز الوثائق: "${title}"`, link: '/doc-center', entityId: doc.id },
        actor.id,
      );
    });

    return null;
  });
}

// Soft delete (005-soft-delete, US2). Central-only, matching createDocumentCenterFile.
export async function deleteDocumentCenterFile(docId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(docId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.documentCenterFile.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError();
      await tx.documentCenterFile.update({ where: { id }, data: { deletedAt: new Date() } });
      await logAudit(tx, actor, 'Document', id, `حذف ملف من مركز الوثائق العام: ${existing.title}`);
    });

    return null;
  });
}

export async function restoreDocumentCenterFile(docId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(docId);

    await prisma.$transaction(async (tx) => {
      const existing = await prismaUnfiltered.documentCenterFile.findUnique({ where: { id } });
      if (!existing || existing.deletedAt === null) throw new NotFoundError();
      await tx.documentCenterFile.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
      await logAudit(tx, actor, 'Document', id, `استعادة ملف في مركز الوثائق العام: ${existing.title}`);
    });

    return null;
  });
}
