'use server';

import { prisma } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { formString, requiredText } from '@/server/validation';

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
