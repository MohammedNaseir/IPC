'use server';

import { z } from 'zod';
import { prisma } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { formString, requiredText } from '@/server/validation';

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
