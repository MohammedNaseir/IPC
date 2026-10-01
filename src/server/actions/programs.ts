'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma, prismaUnfiltered, type ExtendedTransactionClient } from '@/server/db';
import { requireActionCentral } from '@/server/auth/session';
import { logAudit } from '@/server/audit';
import { notifyAllActiveUsers } from '@/server/notify';
import { readRequiredFile, storeUpload } from '@/server/files';
import { runAction } from '@/server/run-action';
import { NotFoundError } from '@/server/errors';
import { formString, idSchema, optionalText, requiredText } from '@/server/validation';

// A tree node id is either a Program (root) or a ProgramFolder.
async function resolveParent(tx: ExtendedTransactionClient, parentId: string) {
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

// Soft delete (005-soft-delete, US5). A folder's descendant tree is walked breadth-first through
// `parentFolderId` since folders only record their immediate parent, not a full ancestor chain --
// unlike ProgramFile, which carries its top-level `programId` directly regardless of depth, so a
// whole-Program delete can gather every folder/file in one query each instead of recursing.
async function collectFolderSubtreeIds(tx: ExtendedTransactionClient, rootFolderId: string): Promise<string[]> {
  const folderIds = [rootFolderId];
  let frontier = [rootFolderId];
  while (frontier.length > 0) {
    const children = await tx.programFolder.findMany({ where: { parentFolderId: { in: frontier } }, select: { id: true } });
    frontier = children.map((c) => c.id);
    folderIds.push(...frontier);
  }
  return folderIds;
}

export async function deleteProgramNode(nodeId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(nodeId);

    await prisma.$transaction(async (tx) => {
      const deletionEventId = randomUUID();
      const deletedAt = new Date();

      const program = await tx.program.findUnique({ where: { id } });
      if (program) {
        const [folders, files] = await Promise.all([
          tx.programFolder.findMany({ where: { programId: id }, select: { id: true, name: true } }),
          tx.programFile.findMany({ where: { programId: id }, select: { id: true, name: true } }),
        ]);
        await tx.program.update({ where: { id }, data: { deletedAt, deletionEventId } });
        await logAudit(tx, actor, 'Program', id, `حذف برنامج استراتيجي: ${program.name}`);
        if (folders.length > 0) {
          await tx.programFolder.updateMany({ where: { id: { in: folders.map((f) => f.id) } }, data: { deletedAt, deletionEventId } });
          for (const f of folders) await logAudit(tx, actor, 'ProgramFolder', f.id, `حذف مجلد ضمن حذف برنامج ${program.name}: ${f.name}`);
        }
        if (files.length > 0) {
          await tx.programFile.updateMany({ where: { id: { in: files.map((f) => f.id) } }, data: { deletedAt, deletionEventId } });
          for (const f of files) await logAudit(tx, actor, 'Document', f.id, `حذف ملف ضمن حذف برنامج ${program.name}: ${f.name}`);
        }
        return;
      }

      const folder = await tx.programFolder.findUnique({ where: { id } });
      if (folder) {
        const folderIds = await collectFolderSubtreeIds(tx, id);
        const [descendantFolders, files] = await Promise.all([
          tx.programFolder.findMany({ where: { id: { in: folderIds } }, select: { id: true, name: true } }),
          tx.programFile.findMany({ where: { folderId: { in: folderIds } }, select: { id: true, name: true } }),
        ]);

        await tx.programFolder.updateMany({ where: { id: { in: folderIds } }, data: { deletedAt, deletionEventId } });
        for (const f of descendantFolders) {
          const action = f.id === id ? `حذف مجلد: ${f.name}` : `حذف مجلد فرعي ضمن حذف مجلد ${folder.name}: ${f.name}`;
          await logAudit(tx, actor, 'ProgramFolder', f.id, action);
        }
        if (files.length > 0) {
          await tx.programFile.updateMany({ where: { id: { in: files.map((f) => f.id) } }, data: { deletedAt, deletionEventId } });
          for (const f of files) await logAudit(tx, actor, 'Document', f.id, `حذف ملف ضمن حذف مجلد ${folder.name}: ${f.name}`);
        }
        return;
      }

      const file = await tx.programFile.findUnique({ where: { id } });
      if (!file) throw new NotFoundError('العنصر المحدد غير موجود.');
      await tx.programFile.update({ where: { id }, data: { deletedAt, deletionEventId } });
      await logAudit(tx, actor, 'Document', id, `حذف ملف: ${file.name}`);
    });

    return null;
  });
}

export async function restoreProgramNode(nodeId: string) {
  return runAction(async () => {
    const actor = await requireActionCentral();
    const id = idSchema.parse(nodeId);

    await prisma.$transaction(async (tx) => {
      const program = await prismaUnfiltered.program.findUnique({ where: { id } });
      const folder = program ? null : await prismaUnfiltered.programFolder.findUnique({ where: { id } });
      const file = program || folder ? null : await prismaUnfiltered.programFile.findUnique({ where: { id } });
      const target = program ?? folder ?? file;
      if (!target || target.deletedAt === null) throw new NotFoundError();
      const eventId = target.deletionEventId;

      if (program) {
        await tx.program.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Program', id, `استعادة برنامج استراتيجي: ${program.name}`);
      } else if (folder) {
        await tx.programFolder.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'ProgramFolder', id, `استعادة مجلد: ${folder.name}`);
      } else if (file) {
        await tx.programFile.update({ where: { id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Document', id, `استعادة ملف: ${file.name}`);
      }

      if (!eventId) return; // a standalone delete with nothing else cascaded alongside it

      // Restore exactly the set sharing this node's own deletionEventId -- not every deleted row
      // under the same program/folder, so a sibling deleted independently (before or after) stays
      // deleted (same guarantee as the hospital cascade, spec FR-010 / User Story 4 Scenario 3).
      const [restoredFolders, restoredFiles] = await Promise.all([
        prismaUnfiltered.programFolder.findMany({ where: { deletionEventId: eventId } }),
        prismaUnfiltered.programFile.findMany({ where: { deletionEventId: eventId } }),
      ]);
      for (const f of restoredFolders) {
        if (f.id === id) continue;
        await tx.programFolder.update({ where: { id: f.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'ProgramFolder', f.id, `استعادة مجلد فرعي ضمن استعادة ${target.name}: ${f.name}`);
      }
      for (const f of restoredFiles) {
        if (f.id === id) continue;
        await tx.programFile.update({ where: { id: f.id }, data: { deletedAt: null, deletionEventId: null } });
        await logAudit(tx, actor, 'Document', f.id, `استعادة ملف ضمن استعادة ${target.name}: ${f.name}`);
      }
    });

    return null;
  });
}
