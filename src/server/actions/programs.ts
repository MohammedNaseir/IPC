'use server';

import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { NotFoundError } from '@/server/errors';
import { formString, idSchema, optionalText, requiredText } from '@/server/validation';

// A tree node id is either a Program (root) or a ProgramFolder.
async function resolveParent(tx: Prisma.TransactionClient, parentId: string) {
  const program = await tx.program.findUnique({ where: { id: parentId }, select: { id: true, name: true } });
  if (program) return { programId: program.id, folderId: null, programName: program.name };
  const folder = await tx.programFolder.findUnique({
    where: { id: parentId },
    select: { id: true, programId: true, program: { select: { name: true } } },
  });
  if (folder) return { programId: folder.programId, folderId: folder.id, programName: folder.program.name };
  throw new NotFoundError('المجلد المحدد غير موجود.');
}

const nodeSchema = z.object({
  name: requiredText('اسم المجلد / البرنامج', 300),
  description: optionalText(2000),
  parentId: idSchema.nullable(),
});

export async function createProgramNode(input: z.input<typeof nodeSchema>) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const data = nodeSchema.parse(input);

    await prisma.$transaction(async (tx) => {
      if (data.parentId === null) {
        const program = await tx.program.create({ data: { name: data.name, description: data.description } });
        await logAudit(tx, actor, 'Program', program.id, `إنشاء برنامج استراتيجي: ${program.name}`);
        await notifyAllActiveUsers(
          tx,
          { type: 'new_document', message: `تمت إضافة برنامج جديد: "${program.name}"`, link: '/programs', entityId: program.id },
          actor.id,
        );
        return;
      }

      const parent = await resolveParent(tx, data.parentId);
      const folder = await tx.programFolder.create({
        data: {
          programId: parent.programId,
          parentFolderId: parent.folderId,
          name: data.name,
          description: data.description,
        },
      });
      await logAudit(tx, actor, 'Program', parent.programId, `إنشاء مجلد "${folder.name}" في برنامج ${parent.programName}`);
    });

    return null;
  });
}

export async function uploadProgramFile(formData: FormData) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const parentId = idSchema.parse(formString(formData, 'parentId'));
    const name = requiredText('عنوان الملف', 300).parse(formString(formData, 'title'));
    const file = readRequiredFile(formData, 'file');

    await prisma.$transaction(async (tx) => {
      const parent = await resolveParent(tx, parentId);
      const fileId = await storeUpload(tx, file, { hospitalId: null, uploadedById: actor.id });
      const programFile = await tx.programFile.create({
        data: { programId: parent.programId, folderId: parent.folderId, name, fileId },
      });
      await logAudit(tx, actor, 'Program', parent.programId, `رفع ملف "${name}" في برنامج ${parent.programName}`);
      await notifyAllActiveUsers(
        tx,
        {
          type: 'new_document',
          message: `تم رفع ملف جديد في برنامج ${parent.programName}: "${name}"`,
          link: '/programs',
          entityId: programFile.id,
        },
        actor.id,
      );
    });

    return null;
  });
}
