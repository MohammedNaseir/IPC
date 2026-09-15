'use server';

import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { formString, requiredText } from '@/server/validation';

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
